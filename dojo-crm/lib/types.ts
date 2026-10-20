export type Student = {
  id: string;
  full_name: string;
  belt_rank: string;
  phone: string | null;
  guardian_name: string | null;
  date_of_birth: string | null;
  email?: string | null;
  portal_enabled?: boolean | null;
  portal_last_reminder_sent_at?: string | null;
  join_date: string;
  monthly_fee: number;
  active: boolean;
  created_at: string;
};

export type Attendance = {
  id: string;
  student_id: string;
  class_date: string;
  present: boolean;
};

export type Fee = {
  id: string;
  student_id: string;
  month_year: string;
  paid: boolean;
  paid_date: string | null;
  amount: number | null;
};

export const BELTS = [
  'White Belt',
  'Yellow Belt',
  'Orange Belt',
  'Green Belt',
  'Blue Belt',
  'Purple Belt',
  'Brown Belt',
  'Black Belt',
] as const;

export const BELT_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'White Belt': { bg: '#EDE6D6', text: '#14110F', ring: '#C9C0AC' },
  'Yellow Belt': { bg: '#E8C33B', text: '#14110F', ring: '#E8C33B' },
  'Orange Belt': { bg: '#D9772E', text: '#14110F', ring: '#D9772E' },
  'Green Belt': { bg: '#4C7A5E', text: '#EDE6D6', ring: '#4C7A5E' },
  'Blue Belt': { bg: '#33638C', text: '#EDE6D6', ring: '#33638C' },
  'Purple Belt': { bg: '#6B4C8C', text: '#EDE6D6', ring: '#6B4C8C' },
  'Brown Belt': { bg: '#5C4330', text: '#EDE6D6', ring: '#5C4330' },
  'Black Belt': { bg: '#0B0A09', text: '#D4A843', ring: '#D4A843' },
};

export function monthLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function firstOfMonth(offsetMonths = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  // Use local date parts to avoid UTC conversion shifting the date (e.g. IST +5:30 → July 1 local = June 30 UTC)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function studentHasFeeMonth(student: Pick<Student, 'join_date'>, month: string) {
  return !student.join_date || month >= `${student.join_date.slice(0, 7)}-01`;
}

export function lastNMonths(n: number) {
  const arr: string[] = [];
  for (let i = n - 1; i >= 0; i--) arr.push(firstOfMonth(-i));
  return arr;
}
