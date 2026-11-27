import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireTournamentAdmin } from '@/lib/tournamentAdmin';
import { MAX_TOURNAMENT_FILE_SIZE, TOURNAMENT_BUCKET, TOURNAMENT_FILE_TYPES } from '@/lib/tournamentUpdates';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const admin = await requireTournamentAdmin(request);
  if (admin.response) return admin.response;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Tournament admin server configuration is missing.' }, { status: 500 });
  }

  let body: { name?: unknown; type?: unknown; size?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The file details are invalid.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const type = typeof body.type === 'string' ? body.type : '';
  const size = typeof body.size === 'number' ? body.size : 0;
  const extension = name.includes('.') ? `.${name.split('.').pop()?.toLowerCase()}` : '';

  if (!name || name.length > 255 || !extension || TOURNAMENT_FILE_TYPES[extension] !== type) {
    return NextResponse.json({ error: 'Choose an image, PDF, or video in a supported format.' }, { status: 400 });
  }
  if (size <= 0 || size > MAX_TOURNAMENT_FILE_SIZE) {
    return NextResponse.json({ error: 'Files must be smaller than 100 MB.' }, { status: 400 });
  }

  const path = `uploads/${crypto.randomUUID()}${extension}`;
  const { data, error } = await supabaseAdmin.storage.from(TOURNAMENT_BUCKET).createSignedUploadUrl(path);
  if (error) {
    console.error('Unable to prepare tournament file upload:', error.message);
    return NextResponse.json({ error: 'Unable to prepare the file upload.' }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}

export async function GET(request: Request) {
  const admin = await requireTournamentAdmin(request);
  if (admin.response) return admin.response;
  return NextResponse.json({ authorized: true });
}

export async function DELETE(request: Request) {
  const admin = await requireTournamentAdmin(request);
  if (admin.response) return admin.response;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Tournament admin server configuration is missing.' }, { status: 500 });
  }

  let body: { path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The file details are invalid.' }, { status: 400 });
  }

  const path = typeof body.path === 'string' ? body.path : '';
  if (!/^uploads\/[\w.-]+$/.test(path)) {
    return NextResponse.json({ error: 'The uploaded file path is invalid.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.storage.from(TOURNAMENT_BUCKET).remove([path]);
  if (error) {
    console.error('Unable to clean up tournament file:', error.message);
    return NextResponse.json({ error: 'Unable to clean up the uploaded file.' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
