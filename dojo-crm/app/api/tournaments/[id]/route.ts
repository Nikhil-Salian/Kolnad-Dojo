import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireTournamentAdmin } from '@/lib/tournamentAdmin';
import { TOURNAMENT_BUCKET } from '@/lib/tournamentUpdates';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireTournamentAdmin(request);
  if (admin.response) return admin.response;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Tournament admin server configuration is missing.' }, { status: 500 });
  }

  const { data: update, error: findError } = await supabaseAdmin
    .from('tournament_updates')
    .select('id,attachment_path')
    .eq('id', params.id)
    .maybeSingle();

  if (findError) {
    console.error('Unable to find tournament update:', findError.message);
    return NextResponse.json({ error: 'Unable to find this tournament update.' }, { status: 500 });
  }
  if (!update) {
    return NextResponse.json({ error: 'Tournament update not found.' }, { status: 404 });
  }

  const { error: deleteError } = await supabaseAdmin
    .from('tournament_updates')
    .delete()
    .eq('id', params.id);

  if (deleteError) {
    console.error('Unable to delete tournament update:', deleteError.message);
    return NextResponse.json({ error: 'Unable to delete this tournament update.' }, { status: 500 });
  }

  if (update.attachment_path) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(TOURNAMENT_BUCKET)
      .remove([update.attachment_path]);
    if (storageError) {
      console.error('Unable to remove tournament attachment:', storageError.message);
      return NextResponse.json({ error: 'The update was removed, but its file could not be deleted.' }, { status: 500 });
    }
  }

  return NextResponse.json({ deleted: true });
}
