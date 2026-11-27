import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type TournamentAdminResult =
  | { user: { email: string }; response: null }
  | { user: null; response: Response };

export async function requireTournamentUser(request: Request): Promise<TournamentAdminResult> {
  if (!supabaseAdmin) {
    return {
      user: null,
      response: Response.json({ error: 'Tournament server configuration is missing.' }, { status: 500 }),
    };
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return { user: null, response: Response.json({ error: 'Sign in to view tournament updates.' }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email) {
    return { user: null, response: Response.json({ error: 'Your session is invalid or has expired. Please sign in again.' }, { status: 401 }) };
  }

  return { user: { email: data.user.email.toLowerCase() }, response: null };
}

export async function requireTournamentAdmin(request: Request): Promise<TournamentAdminResult> {
  const authenticated = await requireTournamentUser(request);
  if (authenticated.response) return authenticated;

  const allowedEmails = (process.env.TOURNAMENT_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return {
      user: null,
      response: Response.json({ error: 'Tournament admin email allowlist is not configured.' }, { status: 500 }),
    };
  }
  const email = authenticated.user.email;
  if (!allowedEmails.includes(email)) {
    return { user: null, response: Response.json({ error: 'This account is not authorized to manage tournament updates.' }, { status: 403 }) };
  }

  return { user: { email }, response: null };
}
