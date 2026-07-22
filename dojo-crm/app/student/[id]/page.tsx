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
  const [allDojoAttendance, setAllDojoAttendance] = useState<Array<{ class_date: string; student_id: string; present: boolean }>>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBelt, setSavingBelt] = useState(false);

  const months = lastNMonths(12);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(months.length - 1);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: a }, { data: allA }, { data: f }] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('attendance').select('*').eq('student_id', id).order('class_date'),
      supabase.from('attendance').select('class_date, student_id, present').order('class_date'),
      supabase.from('fees').select('*').eq('student_id', id).order('month_year'),
    ]);
    setStudent(s || null);
    setAttendance(a || []);
    setAllDojoAttendance(allA || []);
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

  // --- Current Month (actual current date) Calculations ---
  // Always compute the actual current month dynamically from today's date
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const julyDojoDates = Array.from(
    new Set(
      allDojoAttendance
        .filter((entry) => entry.class_date.slice(0, 7) === currentMonthKey.slice(0, 7))
        .map((entry) => entry.class_date)
    )
  ).sort();

  const julyAttendedDates = julyDojoDates.filter((date) =>
    attendance.some((entry) => entry.class_date === date && entry.present)
  );

  const totalJulyClasses = julyDojoDates.length || attendance.filter((a) => a.class_date.slice(0, 7) === currentMonthKey.slice(0, 7)).length;
  const attendedJulyClasses = julyAttendedDates.length;
  const julyAttendanceRate = totalJulyClasses
    ? Math.round((attendedJulyClasses / totalJulyClasses) * 100)
    : 0;

  // Fee Status for Current Month (July 2026)
  const monthlyFeeAmount = student.monthly_fee || 1000;
  const julyFee = fees.find((entry) => entry.month_year === currentMonthKey);
  const julyFeePaid = !!julyFee?.paid;
  const julyFeeRemaining = julyFeePaid ? 0 : monthlyFeeAmount;

  // --- Selected Month Breakdown with Month Navigation (< >) ---
  const selectedMonthKey = months[selectedMonthIndex] || currentMonthKey;

  const selectedDojoClassDates = Array.from(
    new Set(
      allDojoAttendance
        .filter((entry) => entry.class_date.slice(0, 7) === selectedMonthKey.slice(0, 7))
        .map((entry) => entry.class_date)
    )
  ).sort();

  const studentInSelectedMonth = attendance.filter(
    (entry) => entry.class_date.slice(0, 7) === selectedMonthKey.slice(0, 7)
  );

  const allClassDatesInSelectedMonth = Array.from(
    new Set([...selectedDojoClassDates, ...studentInSelectedMonth.map((s) => s.class_date)])
  ).sort();

  const selectedMonthDateDetails = allClassDatesInSelectedMonth.map((dateStr) => {
    const studentEntry = attendance.find((a) => a.class_date === dateStr);
    const isPresent = !!studentEntry?.present;

    const dt = new Date(`${dateStr}T00:00:00`);
    const dateFormatted = new Intl.DateTimeFormat('en', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(dt);

    return {
      dateStr,
      dateFormatted,
      isPresent,
    };
  });

  const selectedAttendedCount = selectedMonthDateDetails.filter((d) => d.isPresent).length;
  const selectedTotalClasses = selectedMonthDateDetails.length;
  const selectedRate = selectedTotalClasses ? Math.round((selectedAttendedCount / selectedTotalClasses) * 100) : 0;

  const handlePrevMonth = () => setSelectedMonthIndex((prev) => Math.max(0, prev - 1));
  const handleNextMonth = () => setSelectedMonthIndex((prev) => Math.min(months.length - 1, prev + 1));

  // --- Recharts Data ---
  const chartData = months.map((monthKey) => {
    const dojoDatesInMonth = Array.from(
      new Set(
        allDojoAttendance
          .filter((entry) => entry.class_date.slice(0, 7) === monthKey.slice(0, 7))
          .map((entry) => entry.class_date)
      )
    ).sort();

    const studentInMonth = attendance.filter((entry) => entry.class_date.slice(0, 7) === monthKey.slice(0, 7));

    const checkDates = dojoDatesInMonth.length > 0 ? dojoDatesInMonth : studentInMonth.map((s) => s.class_date);
    const totalMonthClasses = checkDates.length;

    const attendedDates = checkDates.filter((date) =>
      attendance.some((entry) => entry.class_date === date && entry.present)
    );

    const absentDates = checkDates.filter((date) =>
      !attendance.some((entry) => entry.class_date === date && entry.present)
    );

    const attendedDateLabels = attendedDates.map((d) => {
      const dt = new Date(`${d}T00:00:00`);
      return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short' }).format(dt);
    });

    const absentDateLabels = absentDates.map((d) => {
      const dt = new Date(`${d}T00:00:00`);
      return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short' }).format(dt);
    });

    return {
      month: monthLabel(monthKey).split(' ')[0],
      fullMonth: monthLabel(monthKey),
      attended: attendedDates.length,
      total: totalMonthClasses,
      attendedDates: attendedDateLabels,
      absentDates: absentDateLabels,
      hasClasses: totalMonthClasses > 0,
    };
  });

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-sm border border-hairline bg-surface2 p-3 text-xs text-paper shadow-lg max-w-xs">
          <p className="font-bold text-gold">{data.fullMonth}</p>
          <p className="mt-1 font-semibold">
            Attended: {data.attended} of {data.total} classes {data.total ? `(${Math.round((data.attended / data.total) * 100)}%)` : ''}
          </p>
          {data.attendedDates && data.attendedDates.length > 0 && (
            <div className="mt-2 border-t border-hairline/50 pt-1.5">
              <p className="text-[10px] uppercase tracking-wider text-moss mb-1">✓ Present Dates:</p>
              <p className="text-moss font-mono text-[11px] leading-relaxed">
                {data.attendedDates.join(', ')}
              </p>
            </div>
          )}
          {data.absentDates && data.absentDates.length > 0 && (
            <div className="mt-1.5 border-t border-hairline/50 pt-1.5">
              <p className="text-[10px] uppercase tracking-wider text-seal mb-1">✗ Absent Dates:</p>
              <p className="text-seal font-mono text-[11px] leading-relaxed">
                {data.absentDates.join(', ')}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

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
        {/* July Attendance Rate */}
        <div className="card rounded-sm p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted mb-2">July Attendance Rate</p>
          <p className="font-display text-4xl font-bold text-paper">{julyAttendanceRate}<span className="text-lg text-muted">%</span></p>
          <p className="text-xs text-muted mt-1">{attendedJulyClasses} of {totalJulyClasses} classes in {monthLabel(currentMonthKey)}</p>
        </div>

        {/* July Fee Remaining */}
        <div className="card rounded-sm p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted mb-2">July Fee Status</p>
          <p className={`font-display text-2xl font-bold ${julyFeePaid ? 'text-moss' : 'text-seal'}`}>
            {julyFeePaid ? 'Paid' : `₹${julyFeeRemaining.toLocaleString('en-IN')} Due`}
          </p>
          <p className="text-xs text-muted mt-1">
            {julyFeePaid
              ? `₹0 remaining for ${monthLabel(currentMonthKey)}`
              : `₹${julyFeeRemaining.toLocaleString('en-IN')} pending for ${monthLabel(currentMonthKey)}`}
          </p>
        </div>

        {/* Outstanding Months */}
        <div className="card rounded-sm p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted mb-2">Outstanding months</p>
          <p className={`font-display text-4xl font-bold ${unpaidMonths.length ? 'text-seal' : 'text-moss'}`}>
            {unpaidMonths.length}
          </p>
          <p className="text-xs text-muted mt-1">of last {months.length} months</p>
        </div>
      </div>

      <div className="card rounded-sm p-5 sm:p-6 mb-10">
        <p className="font-display text-lg text-paper font-bold mb-1">Attendance overview</p>
        <p className="text-muted text-xs mb-4">Classes attended per month (Click bar to select month)</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              barCategoryGap={20}
              onClick={(e: any) => {
                if (e && e.activeTooltipIndex !== undefined) {
                  setSelectedMonthIndex(e.activeTooltipIndex);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#3A322A" vertical={false} />
              <XAxis dataKey="month" stroke="#948B7E" fontSize={12} tickLine={false} axisLine={{ stroke: '#3A322A' }} />
              <YAxis stroke="#948B7E" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="attended" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={i === selectedMonthIndex ? '#D4A843' : entry.attended > 0 ? '#4C7A5E' : '#3A322A'}
                    stroke={i === selectedMonthIndex ? '#EDE6D6' : 'none'}
                    strokeWidth={i === selectedMonthIndex ? 1.5 : 0}
                    className="cursor-pointer transition-colors hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* --- Month Breakdown with Left/Right (< >) Month Navigation --- */}
        <div className="mt-6 border-t border-hairline/60 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted font-bold">Month Breakdown</p>
              <h4 className="font-display text-xl font-bold text-paper mt-0.5 flex items-center gap-2">
                <span>{monthLabel(selectedMonthKey)}</span>
                <span className="text-xs font-normal text-gold bg-gold/10 px-2.5 py-1 rounded-sm border border-gold/30">
                  {selectedAttendedCount} / {selectedTotalClasses} classes ({selectedRate}%)
                </span>
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={selectedMonthIndex === 0}
                className="rounded-sm border border-hairline bg-surface2 px-3 py-1.5 text-xs font-bold text-paper hover:bg-[#322A23] hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-xs text-muted font-mono px-1">
                {selectedMonthIndex + 1} / {months.length}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={selectedMonthIndex === months.length - 1}
                className="rounded-sm border border-hairline bg-surface2 px-3 py-1.5 text-xs font-bold text-paper hover:bg-[#322A23] hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>

          {selectedMonthDateDetails.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {selectedMonthDateDetails.map((item) => (
                <div
                  key={item.dateStr}
                  className={`rounded-sm border p-3 flex items-center justify-between transition-colors ${
                    item.isPresent
                      ? 'border-moss/40 bg-moss/10'
                      : 'border-seal/40 bg-seal/10'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-paper">{item.dateFormatted}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted mt-0.5">
                      Class Date
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-sm text-xs font-bold uppercase tracking-wide ${
                      item.isPresent
                        ? 'bg-moss text-paper'
                        : 'bg-seal/30 text-seal border border-seal/40'
                    }`}
                  >
                    {item.isPresent ? '✓ Present' : '✗ Absent'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-sm border border-hairline/60 bg-surface2/30 p-6 text-center">
              <p className="text-sm text-muted">No dojo class dates recorded for {monthLabel(selectedMonthKey)}.</p>
            </div>
          )}
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
