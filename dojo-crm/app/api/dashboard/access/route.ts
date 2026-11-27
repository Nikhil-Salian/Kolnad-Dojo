import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: 'Sign in to enter the dojo dashboard.' }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return NextResponse.json({ error: 'Your session is invalid or has expired. Please sign in again.' }, { status: 401 });
  }

  const allowedEmails = (process.env.DOJO_ADMIN_EMAILS || process.env.TOURNAMENT_ADMIN_EMAILS || '')
    .split(',')
    .map((allowedEmail) => allowedEmail.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return NextResponse.json({ error: 'Dashboard staff access is not configured on the server.' }, { status: 500 });
  }
  if (!allowedEmails.includes(data.user.email.toLowerCase())) {
    return NextResponse.json({ error: 'This account is not authorized to enter the dojo dashboard.' }, { status: 403 });
  }

  return NextResponse.json({ authorized: true });
}
