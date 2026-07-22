import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Portal admin setup is not configured.' }, { status: 500 });
  }

  const body = await request.json();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '').trim();
  const studentId = String(body?.studentId || '').trim();

  if (!email || !password || !studentId) {
    return NextResponse.json({ error: 'Email, password, and studentId are required.' }, { status: 400 });
  }

  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const userExists = existingUsers.users.some((user) => user.email?.toLowerCase() === email);
  if (userExists) {
    return NextResponse.json({ ok: true, created: false, message: 'Account already exists.' });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { student_id: studentId },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from('students').update({ email }).eq('id', studentId);

  return NextResponse.json({ ok: true, created: true, userId: data.user?.id });
}
