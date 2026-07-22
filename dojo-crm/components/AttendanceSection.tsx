'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Student, BELTS } from '@/lib/types';
import BeltTag from './BeltTag';
import AddStudentForm from './AddStudentForm';
import PortalAccountSetup from './PortalAccountSetup';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function AttendanceSection() {
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [view, setView] = useState<'roster' | 'overview'>('roster');
  const [monthlyOverview, setMonthlyOverview] = useState<
    Array<{
      key: string;
      label: string;
      dates: string[];
      rows: Array<{
        studentId: string;
        studentName: string;
        statusByDate: Record<string, boolean>;
        presentCount: number;
      }>;
    }>
  >([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    full_name: '',
    belt_rank: 'White Belt',
    phone: '',
    guardian_name: '',
    date_of_birth: '',
    monthly_fee: '1000',
  });

  const loadStudents = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('active', true);

    const sorted = (data || []).sort((a, b) => {
      const idxA = BELTS.indexOf(a.belt_rank as any);
      const idxB = BELTS.indexOf(b.belt_rank as any);
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      return a.full_name.localeCompare(b.full_name);
    });
    setStudents(sorted);
  }, []);

  const loadAttendance = useCallback(async (d: string) => {
    setLoading(true);
    const { data } = await supabase.from('attendance').select('*').eq('class_date', d);
    const m: Record<string, boolean> = {};
    (data || []).forEach((r) => (m[r.student_id] = r.present));
    setMarks(m);
    setLoading(false);
  }, []);

  const loadOverview = useCallback(async (activeStudents: Student[] = students) => {
    setOverviewLoading(true);
    const { data } = await supabase.from('attendance').select('student_id,class_date,present').order('class_date');

    const records = (data || []) as Array<{
      student_id: string;
      class_date: string;
      present: boolean;
    }>;

    const monthMap = new Map<
      string,
      {
        key: string;
        label: string;
        dates: string[];
        rows: Array<{
          studentId: string;
          studentName: string;
          statusByDate: Record<string, boolean>;
          presentCount: number;
        }>;
      }
    >();

    records.forEach((row) => {
      const monthKey = row.class_date.slice(0, 7);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          key: monthKey,
          label: new Date(`${row.class_date}T00:00:00`).toLocaleString('en', {
            month: 'long',
            year: 'numeric',
          }),
          dates: [],
          rows: [],
        });
      }

      const month = monthMap.get(monthKey)!;
      if (!month.dates.includes(row.class_date)) {
        month.dates.push(row.class_date);
      }
    });

    monthMap.forEach((month) => {
      month.dates.sort();
      month.rows = activeStudents.map((student) => {
        const row: {
          studentId: string;
          studentName: string;
          statusByDate: Record<string, boolean>;
          presentCount: number;
        } = {
          studentId: student.id,
          studentName: student.full_name,
          statusByDate: {},
          presentCount: 0,
        };
        return row;
      });
    });

    records.forEach((row) => {
      const month = monthMap.get(row.class_date.slice(0, 7));
      if (!month) return;
      const studentRow = month.rows.find((item) => item.studentId === row.student_id) as
        | {
          studentId: string;
          studentName: string;
          statusByDate: Record<string, boolean>;
          presentCount: number;
        }
        | undefined;
      if (studentRow) {
        studentRow.statusByDate[row.class_date] = row.present;
        if (row.present) {
          studentRow.presentCount += 1;
        }
      }
    });

    const sortedMonths = Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
    setMonthlyOverview(sortedMonths);
    setOverviewLoading(false);
  }, [students]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadAttendance(date);
  }, [date, loadAttendance]);

  useEffect(() => {
    loadOverview(students);
  }, [students, loadOverview]);

  async function toggle(studentId: string) {
    const next = !marks[studentId];
    setMarks((m) => ({ ...m, [studentId]: next }));
    setSaved(null);
    const { error } = await supabase
      .from('attendance')
      .upsert(
        { student_id: studentId, class_date: date, present: next },
        { onConflict: 'student_id,class_date' }
      );
    if (!error) {
      setSaved(studentId);
      await loadOverview(students);
      setTimeout(() => setSaved((s) => (s === studentId ? null : s)), 900);
    }
  }

  async function markAll(present: boolean) {
    const rows = students.map((s) => ({ student_id: s.id, class_date: date, present }));
    await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,class_date' });
    const m: Record<string, boolean> = {};
    students.forEach((s) => (m[s.id] = present));
    setMarks(m);
    await loadOverview(students);
  }

  function startEdit(student: Student) {
    setEditingStudentId(student.id);
    setEditDraft({
      full_name: student.full_name,
      belt_rank: student.belt_rank,

      phone: student.phone || '',
      guardian_name: student.guardian_name || '',
      date_of_birth: student.date_of_birth || '',
      monthly_fee: String(student.monthly_fee ?? 1000),
    });
  }

  function cancelEdit() {
    setEditingStudentId(null);
    setEditDraft({
      full_name: '',
      belt_rank: 'White Belt',
      phone: '',
      guardian_name: '',
      date_of_birth: '',
      monthly_fee: '1000',
    });
  }

  async function saveEdit(studentId: string) {
    const nextFee = Number(editDraft.monthly_fee) || 1000;
    const payload = {
      full_name: editDraft.full_name.trim(),
      belt_rank: editDraft.belt_rank,
      phone: editDraft.phone.trim() || null,
      guardian_name: editDraft.guardian_name.trim() || null,
      date_of_birth: editDraft.date_of_birth || null,
      monthly_fee: nextFee,
    };

    const { error } = await supabase.from('students').update(payload).eq('id', studentId);
    if (!error) {
      setStudents((current) =>
        current.map((student) =>
          student.id === studentId
            ? {
              ...student,
              ...payload,
              monthly_fee: nextFee,
            }
            : student
        )
      );
      setEditingStudentId(null);
      setEditDraft({
        full_name: '',
        belt_rank: 'White Belt',
        phone: '',
        guardian_name: '',
        date_of_birth: '',
        monthly_fee: '1000',
      });
    }
  }

  const presentCount = students.filter((s) => marks[s.id]).length;
  const totalClassDates = monthlyOverview.reduce((sum, month) => sum + month.dates.length, 0);
  const latestMonth = monthlyOverview[0];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-paper font-bold">OSS</h2>
          <p className="text-muted text-sm mt-1">Mark who bowed onto the mat today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-sm border border-hairline overflow-hidden">
            <button
              type="button"
              onClick={() => setView('roster')}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${view === 'roster' ? 'bg-seal text-paper' : 'text-muted hover:text-paper'
                }`}
            >
              Todays Attendance
            </button>
            <button
              type="button"
              onClick={() => setView('overview')}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors border-l border-hairline ${view === 'overview' ? 'bg-seal text-paper' : 'text-muted hover:text-paper'
                }`}
            >
              Records
            </button>
          </div>
          <AddStudentForm onAdded={loadStudents} />
        </div>
      </div>

      {view === 'overview' ? (
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="card rounded-sm p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted">Classes recorded</p>
              <p className="font-display text-2xl font-bold text-paper mt-2">{totalClassDates}</p>
            </div>
            <div className="card rounded-sm p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted">Students enrolled</p>
              <p className="font-display text-2xl font-bold text-paper mt-2">{students.length}</p>
            </div>
            <div className="card rounded-sm p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted">Latest month</p>
              <p className="font-display text-lg font-bold text-paper mt-2">
                {latestMonth?.label || 'No data'}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="card rounded-sm p-4 sm:p-5">
              <p className="font-display text-lg font-bold text-paper">Portal account setup</p>
              <p className="mt-2 text-sm text-muted">Create a login for any student once their email is available.</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {students.slice(0, 2).map((student) => (
                  <PortalAccountSetup key={student.id} student={student} />
                ))}
              </div>
            </div>
            {overviewLoading ? (
              <p className="text-muted text-sm">Loading overview…</p>
            ) : monthlyOverview.length === 0 ? (
              <p className="text-muted text-sm">No attendance dates recorded yet.</p>
            ) : (
              monthlyOverview.map((month) => (
                <div key={month.key} className="card rounded-sm p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-xl text-paper font-bold">{month.label}</h3>
                      <p className="text-muted text-sm mt-1">Students marked present or absent for each class date.</p>
                    </div>
                    <span className="text-[11px] uppercase tracking-widest text-muted">{month.dates.length} dates</span>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline text-left text-muted uppercase tracking-widest">
                          <th className="py-2 pr-4 min-w-[180px]">Student</th>
                          {month.dates.map((date) => (
                            <th key={date} className="py-2 pr-3 whitespace-nowrap">
                              {formatDateLabel(date)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {month.rows.map((row) => (
                          <tr key={row.studentId} className="border-b border-hairline/60">
                            <td className="py-3 pr-4 font-body font-bold text-paper">
                              <div>{row.studentName}</div>
                              <div className="text-[11px] uppercase tracking-widest text-muted mt-1">
                                {row.presentCount}/{month.dates.length} present
                              </div>
                            </td>
                            {month.dates.map((date) => {
                              const present = row.statusByDate[date];
                              return (
                                <td key={`${row.studentId}-${date}`} className="py-3 pr-3">
                                  <span
                                    className={`inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${present ? 'bg-moss/20 text-moss' : 'bg-seal/20 text-seal'
                                      }`}
                                  >
                                    {present ? 'P' : 'A'}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="card rounded-sm p-4 sm:p-5 grid gap-4 sm:grid-cols-[minmax(220px,1fr)_auto] items-end">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Class date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper outline-none focus:border-gold w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
              <button
                onClick={() => markAll(true)}
                className="rounded-sm border border-moss text-moss px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-moss hover:text-paper transition-colors"
              >
                Mark all present
              </button>
              <button
                onClick={() => markAll(false)}
                className="rounded-sm border border-hairline text-muted px-3 py-2 text-xs font-bold uppercase tracking-wide hover:text-paper transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="font-body text-sm text-gold">
              {presentCount} / {students.length} present
            </div>
          </div>

          <div className="rope-divider" />

          {loading ? (
            <p className="text-muted text-sm">Loading today's attendance…</p>
          ) : students.length === 0 ? (
            <div className="card rounded-sm p-10 text-center">
              <p className="font-display text-lg text-paper">No students enrolled yet</p>
              <p className="text-muted text-sm mt-1">Enrol your first student to start taking attendance.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {students.map((s, i) => {
                const present = !!marks[s.id];
                return (
                  <div
                    key={s.id}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className="animate-rise card rounded-sm p-4 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-gold/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 min-w-0 w-full">
                      <div
                        className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center font-display font-bold text-sm"
                        style={{ background: '#26201A', color: '#D4A843', border: '1px solid #3A322A' }}
                      >
                        {s.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/student/${s.id}`}
                          className="font-body font-bold text-paper hover:text-gold transition-colors truncate block"
                        >
                          {s.full_name}
                        </Link>
                        <div className="mt-1"><BeltTag belt={s.belt_rank} small /></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => (editingStudentId === s.id ? cancelEdit() : startEdit(s))}
                        className="rounded-sm border border-hairline px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted hover:text-paper"
                      >
                        {editingStudentId === s.id ? 'Cancel' : 'Edit'}
                      </button>
                      <button
                        onClick={() => toggle(s.id)}
                        className={`w-full sm:w-auto rounded-sm px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all ${present
                            ? 'bg-moss text-paper'
                            : 'bg-surface2 text-muted border border-hairline hover:text-paper'
                          }`}
                      >
                        {saved === s.id ? '✓ Saved' : present ? '✓ Present' : 'Absent'}
                      </button>
                    </div>
                    {editingStudentId === s.id && (
                      <div className="w-full mt-3 border-t border-hairline/70 pt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Full name</label>
                          <input
                            value={editDraft.full_name}
                            onChange={(e) => setEditDraft((current) => ({ ...current, full_name: e.target.value }))}
                            className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper outline-none focus:border-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Belt rank</label>
                          <select
                            value={editDraft.belt_rank}
                            onChange={(e) => setEditDraft((current) => ({ ...current, belt_rank: e.target.value }))}
                            className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper outline-none focus:border-gold"
                          >
                            {['White Belt', 'Yellow Belt', 'Orange Belt', 'Green Belt', 'Blue Belt', 'Purple Belt', 'Brown Belt', 'Black Belt'].map((belt) => (
                              <option key={belt} value={belt}>{belt}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Guardian name</label>
                          <input
                            value={editDraft.guardian_name}
                            onChange={(e) => setEditDraft((current) => ({ ...current, guardian_name: e.target.value }))}
                            className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper outline-none focus:border-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Phone</label>
                          <input
                            value={editDraft.phone}
                            onChange={(e) => setEditDraft((current) => ({ ...current, phone: e.target.value }))}
                            className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper outline-none focus:border-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Date of birth</label>
                          <input
                            type="date"
                            value={editDraft.date_of_birth}
                            onChange={(e) => setEditDraft((current) => ({ ...current, date_of_birth: e.target.value }))}
                            className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper outline-none focus:border-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Monthly fee (₹)</label>
                          <input
                            value={editDraft.monthly_fee}
                            onChange={(e) => setEditDraft((current) => ({ ...current, monthly_fee: e.target.value }))}
                            inputMode="numeric"
                            className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper outline-none focus:border-gold"
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => saveEdit(s.id)}
                            className="rounded-sm bg-seal px-4 py-2.5 font-body font-bold text-sm text-paper"
                          >
                            Save changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
