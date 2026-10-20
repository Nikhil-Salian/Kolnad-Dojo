import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabaseClient';
import { firstOfMonth, monthLabel, Fee, Student, monthsFromJoinDateThrough } from '@/lib/types';
import { isWhatsAppConfigured, sendWhatsAppFeeReminder } from '@/lib/whatsapp';

export async function GET(request: Request) {
  return handleReminders(request, 'cron');
}

export async function POST(request: Request) {
  return handleReminders(request, 'manual');
}

async function handleReminders(request: Request, mode: 'cron' | 'manual') {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!expectedSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }
  if (bearerToken !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized reminder request.' }, { status: 401 });
  }

  const today = new Date();
  if (mode === 'cron' && today.getUTCDate() !== 1) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'Scheduled WhatsApp reminders only run on the first day of the month.',
      date: today.toISOString().slice(0, 10),
    });
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      {
        error: 'WhatsApp is not configured. Set the required WHATSAPP_* environment variables.',
      },
      { status: 503 }
    );
  }

  const db = supabaseAdmin || supabase;
  const currentMonth = firstOfMonth();

  const { data: students, error: studentError } = await db
    .from('students')
    .select('*')
    .eq('active', true)
    .order('full_name');

  if (studentError || !students) {
    return NextResponse.json(
      { error: studentError?.message || 'Failed to fetch students.' },
      { status: 500 }
    );
  }

  const { data: fees, error: feeError } = await db
    .from('fees')
    .select('*')
    .lte('month_year', currentMonth);

  if (feeError) {
    return NextResponse.json({ error: feeError.message }, { status: 500 });
  }

  const feeMap = new Map<string, Fee>();
  (fees || []).forEach((fee: Fee) => feeMap.set(`${fee.student_id}:${fee.month_year}`, fee));

  const results: Array<{
    studentId: string;
    name: string;
    status: 'sent' | 'skipped_no_phone' | 'no_pending_fees' | 'failed';
    pendingMonths?: string[];
    amount?: number;
    error?: string;
  }> = [];
  let sentCount = 0;
  let skippedNoPhoneCount = 0;
  let noPendingFeesCount = 0;
  let failedCount = 0;

  for (const student of students as Student[]) {
    const pendingFees = monthsFromJoinDateThrough(student.join_date, currentMonth)
      .flatMap((month) => {
        const fee = feeMap.get(`${student.id}:${month}`);
        if (fee?.paid) return [];
        return [{
          month,
          amount: fee?.amount ?? student.monthly_fee ?? 0,
        }];
      });

    if (pendingFees.length === 0) {
      noPendingFeesCount++;
      results.push({ studentId: student.id, name: student.full_name, status: 'no_pending_fees' });
      continue;
    }

    if (!student.phone?.trim()) {
      skippedNoPhoneCount++;
      results.push({ studentId: student.id, name: student.full_name, status: 'skipped_no_phone' });
      continue;
    }

    try {
      await sendWhatsAppFeeReminder({
        phone: student.phone,
        studentName: student.full_name,
        pendingMonths: pendingFees.map(({ month }) => monthLabel(month)),
        amount: pendingFees.reduce((total, fee) => total + fee.amount, 0),
      });
      sentCount++;
      results.push({
        studentId: student.id,
        name: student.full_name,
        status: 'sent',
        pendingMonths: pendingFees.map(({ month }) => monthLabel(month)),
        amount: pendingFees.reduce((total, fee) => total + fee.amount, 0),
      });
    } catch (error: unknown) {
      failedCount++;
      results.push({
        studentId: student.id,
        name: student.full_name,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    currentMonth,
    summary: {
      totalActive: students.length,
      noPendingFeesCount,
      unpaidCount: students.length - noPendingFeesCount,
      sentCount,
      skippedNoPhoneCount,
      failedCount,
    },
    results,
  });
}
