export type TournamentUpdate = {
  id: string;
  title: string;
  details: string;
  event_date: string | null;
  attachment_path: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
};

export const TOURNAMENT_BUCKET = 'tournament-updates';
export const MAX_TOURNAMENT_FILE_SIZE = 100 * 1024 * 1024;

export const TOURNAMENT_FILE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};
