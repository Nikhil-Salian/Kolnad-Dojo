'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Student, Fee, lastNMonths, monthLabel } from '@/lib/types';
import BeltTag from './BeltTag';

export default function FeesSection() {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const months = useMemo(() => lastNMonths(6), []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: st }, { data: fe }] = await Promise.all([
      supabase.from('students').select('*').eq('active', true).order('full_name'),
      supabase.from('fees').select('*').gte('month_year', months[0]),
    ]);
    setStudents(st || []);
    setFees(fe || []);
    setLoading(false);
  }, [months]);

  useEffect(() => {
    load();
  }, [load]);

  function feeFor(studentId: string, month: string) {
    return fees.find((f) => f.student_id === studentId && f.month_year === month);
  }

  async function toggle(student: Student, month: string) {
    const existing = feeFor(student.id, month);
    const nextPaid = !(existing?.paid);
    const { data, error } = await supabase
      .from('fees')
      .upsert(
        {
          student_id: student.id,
          month_year: month,
          paid: nextPaid,
          paid_date: nextPaid ? new Date().toISOString().slice(0, 10) : null,
          amount: student.monthly_fee,
        },
        { onConflict: 'student_id,month_year' }
      )
      .select()
      .single();
    if (!error && data) {
      setFees((prev) => {
        const others = prev.filter((f) => !(f.student_id === student.id && f.month_year === month));
        return [...others, data as Fee];
      });
    }
  }

  const currentMonth = months[months.length - 1];
  const unpaidThisMonth = students.filter((s) => !feeFor(s.id, currentMonth)?.paid);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-paper font-bold">Fee Ledger</h2>
          <p className="text-muted text-sm mt-1">Tap a month to mark it paid. Last 6 months shown.</p>
        </div>
        <div className="card rounded-sm px-4 py-2.5 text-sm">
          <span className="text-muted">Outstanding this month: </span>
          <span className="text-seal font-bold">{unpaidThisMonth.length}</span>
          <span className="text-muted"> / {students.length}</span>
        </div>
      </div>

      <div className="rope-divider" />

      {loading ? (
        <p className="text-muted text-sm">Loading ledger…</p>
      ) : students.length === 0 ? (
        <div className="card rounded-sm p-10 text-center">
          <p className="font-display text-lg text-paper">No students yet</p>
          <p className="text-muted text-sm mt-1">Enrol students from the Attendance tab first.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="sm:hidden grid gap-3">
            {students.map((s) => (
              <div key={s.id} className="card rounded-sm p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/student/${s.id}`} className="font-body font-bold text-paper hover:text-gold transition-colors block truncate">
                      {s.full_name}
                    </Link>
                    <div className="mt-2"><BeltTag belt={s.belt_rank} small /></div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">
                    {months.filter((m) => feeFor(s.id, m)?.paid).length}/{months.length} paid
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-6 gap-2">
                  {months.map((m) => {
                    const f = feeFor(s.id, m);
                    return (
                      <button
                        key={m}
                        onClick={() => toggle(s, m)}
                        className={`w-full aspect-square rounded-sm border text-xs font-bold transition-all ${
                          f?.paid
                            ? 'bg-moss border-moss text-paper'
                            : 'bg-surface2 border-hairline text-muted hover:text-paper'
                        }`}
                        aria-label={`${monthLabel(m)} ${f?.paid ? 'paid' : 'unpaid'}`}
                      >
                        {f?.paid ? '✓' : '–'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block card rounded-sm overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left font-body text-[11px] uppercase tracking-widest text-muted px-4 py-3 sticky left-0 bg-surface">
                    Student
                  </th>
                  {months.map((m) => (
                    <th key={m} className="text-center font-body text-[11px] uppercase tracking-widest text-muted px-3 py-3 whitespace-nowrap">
                      {monthLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-hairline/60 last:border-0 hover:bg-surface2/50">
                    <td className="px-4 py-3 sticky left-0 bg-surface">
                      <Link href={`/student/${s.id}`} className="font-body font-bold text-paper hover:text-gold transition-colors">
                        {s.full_name}
                      </Link>
                      <div className="mt-1"><BeltTag belt={s.belt_rank} small /></div>
                    </td>
                    {months.map((m) => {
                      const f = feeFor(s.id, m);
                      return (
                        <td key={m} className="text-center px-3 py-3">
                          <button
                            onClick={() => toggle(s, m)}
                            className={`w-9 h-9 rounded-sm border transition-all inline-flex items-center justify-center font-bold ${
                              f?.paid
                                ? 'bg-moss border-moss text-paper'
                                : 'bg-surface2 border-hairline text-transparent hover:text-hairline'
                            }`}
                            aria-label={f?.paid ? 'Paid' : 'Unpaid'}
                          >
                            ✓
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
