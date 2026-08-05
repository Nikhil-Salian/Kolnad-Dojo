import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabaseClient';
import { firstOfMonth, monthLabel, Student, Fee } from '@/lib/types';
import { isGmailConfigured, sendFeeReminderEmail } from '@/lib/email';

// Helper to check if today is the last day of the current month
function isLastDayOfMonth(date = new Date()): boolean {
  const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return tomorrow.getDate() === 1;
}

export async function GET(request: Request) {
  return handleReminders(request, 'cron');
}

export async function POST(request: Request) {
  return handleReminders(request, 'manual');
}

async function handleReminders(request: Request, mode: 'cron' | 'manual') {
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === 'true';
  const dryRun = url.searchParams.get('dryRun') === 'true';
  const cronSecretParam = url.searchParams.get('secret');

  // Verify CRON_SECRET if set in environment
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (bearerToken !== expectedSecret && cronSecretParam !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
    }
  }

  const today = new Date();
  const lastDay = isLastDayOfMonth(today);

  // If invoked as scheduled cron without force=true and not last day of month, skip execution
  if (mode === 'cron' && !lastDay && !force) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'Today is not the last day of the month.',
      isLastDayOfMonth: false,
      date: today.toISOString().slice(0, 10),
    });
  }

  if (!isGmailConfigured()) {
    return NextResponse.json(
      {
        error: 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in your environment variables.',
        isGmailConfigured: false,
      },
      { status: 400 }
    );
  }

  // Use supabaseAdmin if available, else fall back to public supabase client
  const db = supabaseAdmin || supabase;

  const currentMonth = firstOfMonth(0);
  const label = monthLabel(currentMonth);

  // 1. Fetch active students
  const { data: students, error: studentError } = await db
    .from('students')
    .select('*')
    .eq('active', true)
    .order('full_name');

  if (studentError || !students) {
    return NextResponse.json({ error: studentError?.message || 'Failed to fetch students' }, { status: 500 });
  }

  // 2. Fetch fees for current month
  const { data: fees, error: feeError } = await db
    .from('fees')
    .select('*')
    .eq('month_year', currentMonth);

  if (feeError) {
    return NextResponse.json({ error: feeError.message }, { status: 500 });
  }

  const feeMap = new Map<string, Fee>();
  (fees || []).forEach((f: Fee) => feeMap.set(f.student_id, f));

  const results: Array<{
    studentId: string;
    name: string;
    email: string | null;
    status: 'sent' | 'skipped_no_email' | 'failed' | 'already_paid' | 'dry_run';
    error?: string;
  }> = [];

  let sentCount = 0;
  let skippedNoEmailCount = 0;
  let failedCount = 0;
  let paidCount = 0;

  for (const student of students as Student[]) {
    const feeRecord = feeMap.get(student.id);
    const isPaid = feeRecord?.paid === true;

    if (isPaid) {
      paidCount++;
      results.push({
        studentId: student.id,
        name: student.full_name,
        email: student.email || null,
        status: 'already_paid',
      });
      continue;
    }

    const email = student.email?.trim().toLowerCase();
    if (!email) {
      skippedNoEmailCount++;
      results.push({
        studentId: student.id,
        name: student.full_name,
        email: null,
        status: 'skipped_no_email',
      });
      continue;
    }

    if (dryRun) {
      results.push({
        studentId: student.id,
        name: student.full_name,
        email,
        status: 'dry_run',
      });
      continue;
    }

    try {
      await sendFeeReminderEmail({
        toEmail: email,
        studentName: student.full_name,
        monthName: label,
        amount: student.monthly_fee || 0,
      });
      sentCount++;
      results.push({
        studentId: student.id,
        name: student.full_name,
        email,
        status: 'sent',
      });
    } catch (err: unknown) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      results.push({
        studentId: student.id,
        name: student.full_name,
        email,
        status: 'failed',
        error: errorMessage,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    currentMonth,
    monthLabel: label,
    isLastDayOfMonth: lastDay,
    summary: {
      totalActive: students.length,
      paidCount,
      unpaidCount: students.length - paidCount,
      sentCount,
      skippedNoEmailCount,
      failedCount,
    },
    results,
  });
}
