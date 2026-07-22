'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { Student, Attendance, Fee, BELTS, lastNMonths, monthLabel } from '@/lib/types';
import BeltTag from '@/components/BeltTag';

export default function StudentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBelt, setSavingBelt] = useState(false);

  const months = lastNMonths(6);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: a }, { data: f }] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('attendance').select('*').eq('student_id', id).order('class_date'),
      supabase.from('fees').select('*').eq('student_id', id).order('month_year'),
    ]);
    setStudent(s || null);
    setAttendance(a || []);
    setFees(f || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateBelt(belt: string) {
    setSavingBelt(true);
    await supabase.from('students').update({ belt_rank: belt }).eq('id', id);
    setStudent((s) => (s ? { ...s, belt_rank: belt } : s));
    setSavingBelt(false);
  }

  if (loading) {
    return <main className="max-w-4xl mx-auto px-6 py-16 text-muted">Loading student record…</main>;
  }
  if (!student) {
    return <main className="max-w-4xl mx-auto px-6 py-16 text-muted">Student not found.</main>;
  }

  const totalClasses = attendance.length;
  const present = attendance.filter((a) => a.present).length;
  const rate = totalClasses ? Math.round((present / totalClasses) * 100) : 0;

  const chartData = months.map((m) => {
    const inMonth = attendance.filter((a) => a.class_date.slice(0, 7) === m.slice(0, 7));
    const p = inMonth.filter((a) => a.present).length;
    return { month: monthLabel(m).split(' ')[0], attended: p, total: inMonth.length };
  });

  const currentMonth = months[months.length - 1];
  const currentFee = fees.find((f) => f.month_year === currentMonth);
  const feeDue = !currentFee?.paid;
  const unpaidMonths = months.filter((m) => {
    const f = fees.find((x) => x.month_year === m);
    return !f?.paid;
  });

  function getAge(dob: string | null) {
    if (!dob) return null;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const hasHadBirthday =
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    if (hasHadBirthday) age -= 1;
    return age;
  }

  const age = getAge(student.date_of_birth);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <button
        onClick={() => router.push('/')}
        className="text-muted hover:text-gold text-sm font-body mb-8 inline-flex items-center gap-1.5"
      >
        ← Back to register
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start mb-10">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-display font-bold text-2xl shrink-0"
            style={{ background: '#26201A', color: '#D4A843', border: '1px solid #3A322A' }}
          >
            {student.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-paper leading-tight">{student.full_name}</h1>
            <p className="text-muted text-sm mt-1 leading-relaxed">
              Enrolled {new Date(student.join_date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              {student.guardian_name ? ` · Guardian: ${student.guardian_name}` : ''}
              {age !== null ? ` · Age: ${age}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3">
          <BeltTag belt={student.belt_rank} />
          <select
            disabled={savingBelt}
            value={student.belt_rank}
            onChange={(e) => updateBelt(e.target.value)}
            className="bg-surface2 border border-hairline rounded-sm px-3 py-2 text-sm text-paper outline-none focus:border-gold w-full sm:w-auto"
          >
            {BELTS.map((b) => (
              <option key={b} value={b}>Promote to {b}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="card rounded-sm p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted mb-2">Attendance rate</p>
          <p className="font-display text-4xl font-bold text-paper">{rate}<span className="text-lg text-muted">%</span></p>
          <p className="text-xs text-muted mt-1">{present} of {totalClasses} classes</p>
        </div>
        <div className="card rounded-sm p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted mb-2">This month's fee</p>
          <p className={`font-display text-2xl font-bold ${feeDue ? 'text-seal' : 'text-moss'}`}>
            {feeDue ? 'Unpaid' : 'Paid'}
          </p>
          <p className="text-xs text-muted mt-1">₹{student.monthly_fee} / month</p>
        </div>
        <div className="card rounded-sm p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted mb-2">Outstanding months</p>
          <p className={`font-display text-4xl font-bold ${unpaidMonths.length ? 'text-seal' : 'text-moss'}`}>
            {unpaidMonths.length}
          </p>
          <p className="text-xs text-muted mt-1">of last {months.length} months</p>
        </div>
      </div>

      <div className="card rounded-sm p-5 sm:p-6 mb-10">
        <p className="font-display text-lg text-paper font-bold mb-1">Attendance, last 6 months</p>
        <p className="text-muted text-xs mb-4">Classes attended per month</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} barCategoryGap={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A322A" vertical={false} />
              <XAxis dataKey="month" stroke="#948B7E" fontSize={12} tickLine={false} axisLine={{ stroke: '#3A322A' }} />
              <YAxis stroke="#948B7E" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#26201A', border: '1px solid #3A322A', borderRadius: 2, color: '#EDE6D6' }}
                labelStyle={{ color: '#D4A843' }}
              />
              <Bar dataKey="attended" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.attended > 0 ? '#4C7A5E' : '#3A322A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card rounded-sm p-5 sm:p-6">
        <p className="font-display text-lg text-paper font-bold mb-4">Fee history</p>
        <div className="grid gap-2">
          {months.map((m) => {
            const f = fees.find((x) => x.month_year === m);
            return (
              <div key={m} className="flex items-center justify-between border-b border-hairline/60 last:border-0 py-2.5">
                <span className="font-body text-sm text-paper">{monthLabel(m)}</span>
                <span
                  className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm ${
                    f?.paid ? 'bg-moss/20 text-moss' : 'bg-seal/20 text-seal'
                  }`}
                >
                  {f?.paid ? `Paid ${f.paid_date ? new Date(f.paid_date).toLocaleDateString('en-IN') : ''}` : 'Unpaid'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
