import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireTournamentAdmin, requireTournamentUser } from '@/lib/tournamentAdmin';
import { TOURNAMENT_BUCKET, TOURNAMENT_FILE_TYPES } from '@/lib/tournamentUpdates';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const authenticated = await requireTournamentUser(request);
  if (authenticated.response) return authenticated.response;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Tournament updates are not configured on the server.' }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('tournament_updates')
    .select('id,title,details,event_date,attachment_path,attachment_url,attachment_name,attachment_type,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Unable to load tournament updates:', error.message);
    return NextResponse.json({ error: 'Unable to load tournament updates.' }, { status: 500 });
  }

  const updates = [];
  for (const update of data || []) {
    if (!update.attachment_path) {
      updates.push(update);
      continue;
    }
    const { data: signedFile, error: signedUrlError } = await supabaseAdmin.storage
      .from(TOURNAMENT_BUCKET)
      .createSignedUrl(update.attachment_path, 60 * 60);
    if (signedUrlError) {
      console.error('Unable to create tournament attachment link:', signedUrlError.message);
      return NextResponse.json({ error: 'Unable to load tournament attachments.' }, { status: 500 });
    }
    updates.push({ ...update, attachment_url: signedFile.signedUrl });
  }
  return NextResponse.json({ updates });
}

export async function POST(request: Request) {
  const admin = await requireTournamentAdmin(request);
  if (admin.response) return admin.response;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Tournament admin server configuration is missing.' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The tournament details are invalid.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const details = typeof body.details === 'string' ? body.details.trim() : '';
  const eventDate = typeof body.event_date === 'string' ? body.event_date : null;
  const attachmentPath = typeof body.attachment_path === 'string' ? body.attachment_path : null;
  const attachmentName = typeof body.attachment_name === 'string' ? body.attachment_name.trim() : null;
  const attachmentType = typeof body.attachment_type === 'string' ? body.attachment_type : null;

  if (!title || title.length > 120 || details.length > 2500) {
    return NextResponse.json({ error: 'Add a title (up to 120 characters) and keep details under 2,500 characters.' }, { status: 400 });
  }
  if (eventDate) {
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? new Date(`${eventDate}T00:00:00Z`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== eventDate) {
      return NextResponse.json({ error: 'Enter a valid tournament date.' }, { status: 400 });
    }
  }
  if (attachmentPath !== null) {
    const fileExtension = attachmentName ? `.${attachmentName.split('.').pop()?.toLowerCase()}` : '';
    const expectedType = TOURNAMENT_FILE_TYPES[fileExtension];
    if (
      !attachmentPath.startsWith('uploads/') ||
      !/^[\w.-]+$/.test(attachmentPath.slice('uploads/'.length)) ||
      !attachmentName ||
      attachmentName.length > 255 ||
      !attachmentType ||
      expectedType !== attachmentType
    ) {
      return NextResponse.json({ error: 'The uploaded file details are invalid.' }, { status: 400 });
    }
  } else if (attachmentName || attachmentType) {
    return NextResponse.json({ error: 'The uploaded file details are incomplete.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('tournament_updates')
    .insert({
      title,
      details,
      event_date: eventDate || null,
      attachment_path: attachmentPath,
      attachment_url: null,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
    })
    .select('id,title,details,event_date,attachment_path,attachment_url,attachment_name,attachment_type,created_at')
    .single();

  if (error) {
    console.error('Unable to publish tournament update:', error.message);
    return NextResponse.json({ error: 'Unable to publish this tournament update.' }, { status: 500 });
  }

  return NextResponse.json({ update: data }, { status: 201 });
}
