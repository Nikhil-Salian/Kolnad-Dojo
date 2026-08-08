'use client';
import { useEffect, useMemo, useState } from 'react';
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
import { Attendance, Fee, Student, lastNMonths, monthLabel } from '@/lib/types';
import PortalProfileCard from '@/components/PortalProfileCard';

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

export default function PortalPage() {
  const [mode, setMode] = useState<'loading' | 'login' | 'dashboard'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [matchedStudents, setMatchedStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [allDojoAttendance, setAllDojoAttendance] = useState<Array<{ class_date: string; student_id: string; present: boolean }>>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const months = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    const keysSet = new Set<string>();

    for (let m = 0; m <= currentMonthIndex; m++) {
      const monthStr = String(m + 1).padStart(2, '0');
      keysSet.add(`${currentYear}-${monthStr}-01`);
    }

    allDojoAttendance.forEach((entry) => {
      if (entry.class_date) keysSet.add(`${entry.class_date.slice(0, 7)}-01`);
    });
    attendance.forEach((entry) => {
      if (entry.class_date) keysSet.add(`${entry.class_date.slice(0, 7)}-01`);
    });

    return Array.from(keysSet).sort();
  }, [allDojoAttendance, attendance]);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(months.length - 1);

  async function loadPortalData(userEmail: string, targetStudentId?: string) {
    setLoading(true);
    setNotice(null);

    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .order('full_name');

    if (studentsError) {
      setNotice('Unable to load your student record right now. Please try again shortly.');
      setLoading(false);
      return;
    }

    const matches = (studentsData || []).filter((item: Student) => {
      const storedEmail = (item.email || '').toLowerCase();
      return storedEmail === userEmail.toLowerCase();
    });

    if (matches.length === 0) {
      setStudent(null);
      setMatchedStudents([]);
      setAttendance([]);
      setAllDojoAttendance([]);
      setFees([]);
      setMode('login');
      setNotice(
        'Portal access is not enabled for this email yet. Once the student email list is added, your account will be linked automatically.'
      );
      setLoading(false);
      return;
    }

    setMatchedStudents(matches);

    const activeStudentId = targetStudentId || selectedStudentId || (matches.length === 1 ? matches[0].id : '');
    const activeStudent = matches.find(s => s.id === activeStudentId);

    if (!activeStudent) {
      setStudent(null);
      setAttendance([]);
      setAllDojoAttendance([]);
      setFees([]);
      setMode('dashboard');
      setLoading(false);
      return;
    }

    if (activeStudentId !== selectedStudentId) {
      setSelectedStudentId(activeStudentId);
    }

    const [attendanceResponse, allDojoAttendanceResponse, feesResponse] = await Promise.all([
      supabase.from('attendance').select('*').eq('student_id', activeStudent.id).order('class_date'),
      supabase.from('attendance').select('class_date, student_id, present').order('class_date'),
      supabase.from('fees').select('*').eq('student_id', activeStudent.id).order('month_year'),
    ]);

    setStudent(activeStudent);
    setAttendance(attendanceResponse.data || []);
    setAllDojoAttendance(allDojoAttendanceResponse.data || []);
    setFees(feesResponse.data || []);
    setMode('dashboard');
    setLoading(false);
  }

  function selectProfile(studentId: string) {
    setSelectedStudentId(studentId);
    const userEmail = email || student?.email || matchedStudents[0]?.email || '';
    if (userEmail) {
      void loadPortalData(userEmail, studentId);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;

      if (session?.user?.email) {
        await loadPortalData(session.user.email, selectedStudentId);
      } else {
        setMode('login');
        setLoading(false);
      }
    }

    void initialize();

    const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        void loadPortalData(session.user.email, selectedStudentId);
      } else {
        setStudent(null);
        setAttendance([]);
        setAllDojoAttendance([]);
        setFees([]);
        setMode('login');
        setLoading(false);
      }
    });

    return () => {
      active = false;
      authData.subscription.unsubscribe();
    };
  }, [refreshKey, selectedStudentId]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setNotice('Unable to sign in. Please use the student email and password assigned by the dojo.');
      setLoading(false);
      return;
    }

    if (data.user?.email) {
      await loadPortalData(data.user.email);
    } else {
      setMode('login');
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setStudent(null);
    setAttendance([]);
    setAllDojoAttendance([]);
    setFees([]);
    setMode('login');
    setNotice(null);
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

  // Overall Fee Status across all months up to and including current month
  const age = getAge(student?.date_of_birth || null);
  const monthlyFeeAmount = student?.monthly_fee || 1000;
  const unpaidMonthsList = months.filter((mKey) => {
    if (mKey > currentMonthKey) return false;
    const feeRecord = fees.find((f) => f.month_year === mKey);
    return !feeRecord?.paid;
  });
  const overallPendingAmount = unpaidMonthsList.length * monthlyFeeAmount;
  const unpaidMonthLabels = unpaidMonthsList.map((mKey) => monthLabel(mKey).split(' ')[0]);

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

  const currentFee = fees.find((entry) => entry.month_year === currentMonthKey);
  const outstandingMonths = months.filter((month) => !fees.find((entry) => entry.month_year === month)?.paid);
  const refreshPortalData = () => setRefreshKey((value) => value + 1);
  const monthsPaid = fees.filter((entry) => entry.paid).length;
  if (!mounted) {
    return (
      <main className="min-h-screen bg-texture px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-center text-paper">
        <div className="card rounded-sm p-8 text-center text-muted font-body">Loading portal…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-texture px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted">Kolnad Dojo</p>
            <h1 className="font-display text-2xl font-bold text-paper">Student portal</h1>
          </div>
          <div className="flex items-center gap-3">
            {mode === 'dashboard' && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-sm border border-hairline px-3 py-2 text-sm text-paper transition-colors hover:bg-surface2"
              >
                Log out
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div className="rounded-sm border border-hairline bg-surface2/70 p-3 text-sm text-paper">
            {notice}
          </div>
        )}

        {mode === 'login' ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="card rounded-sm p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Portal access</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-paper">Your personal dojo dashboard</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Students can view their attendance history, monitor fee payments, and stay aware of due reminders from one place.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-paper">
                <li>• Track your own class attendance</li>
                <li>• See fee payment progress by month</li>
                <li>• View reminder status before payment is late</li>
              </ul>
            </div>

            <div className="card rounded-sm p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold text-paper">Sign in</h3>
              <p className="mt-2 text-sm text-muted">
                Use the email and password provided for your portal account.
              </p>
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <label className="block text-sm text-paper">
                  <span className="mb-2 block">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-sm border border-hairline bg-surface2 px-3 py-2 text-sm outline-none focus:border-gold"
                    placeholder="student@example.com"
                    required
                  />
                </label>
                <label className="block text-sm text-paper">
                  <span className="mb-2 block">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-sm border border-hairline bg-surface2 px-3 py-2 text-sm outline-none focus:border-gold"
                    placeholder="Enter your password"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-sm bg-seal px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-paper transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Signing in…' : 'Enter portal'}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            {matchedStudents.length > 1 && (
              <div className="card rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gold/30">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-body text-gold font-bold">Viewing Profile:</span>
                  <select
                    value={student?.id || ''}
                    onChange={(e) => selectProfile(e.target.value)}
                    className="bg-surface2 border border-hairline rounded-sm px-3 py-1.5 text-paper outline-none focus:border-gold animate-rise"
                  >
                    <option value="" disabled>-- Select a student profile --</option>
                    {matchedStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.belt_rank})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[11px] uppercase tracking-widest text-muted">Multiple students share this email</span>
              </div>
            )}

            {!student && matchedStudents.length > 1 ? (
              <div className="card rounded-sm p-8 text-center max-w-md mx-auto my-8 animate-rise">
                <h3 className="font-display text-xl font-bold text-paper">Select Profile</h3>
                <p className="mt-2 text-sm text-muted">This email is registered for multiple students. Please select whose records you want to view:</p>
                <div className="mt-6 grid gap-2.5">
                  {matchedStudents.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectProfile(s.id)}
                      className="w-full text-left rounded-sm border border-hairline p-4 font-body text-paper hover:bg-[#26201A] hover:border-gold transition-colors flex items-center justify-between shadow-[0_0_0_1px_rgba(212,168,67,0.04)]"
                    >
                      <span className="font-bold">{s.full_name}</span>
                      <span className="text-xs uppercase tracking-wide text-muted">{s.belt_rank}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="card rounded-sm p-6 sm:p-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Welcome back</p>
                      <h2 className="mt-2 font-display text-3xl font-bold text-paper">{student?.full_name}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                        {student?.guardian_name ? `Guardian: ${student.guardian_name}` : 'Keep your fee record current and stay on top of class attendance.'}
                        {age !== null ? ` • Age ${age}` : ''}
                      </p>
                    </div>
                    <div className="rounded-sm border border-hairline px-4 py-3 text-sm text-paper">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-muted">Belt</p>
                      <p className="mt-1 font-semibold">{student?.belt_rank || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {/* Current Month Attendance Rate */}
                  <div className="card rounded-sm p-5">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted">{monthLabel(currentMonthKey)} Attendance Rate</p>
                    <p className="mt-3 font-display text-4xl font-bold text-paper">{julyAttendanceRate}%</p>
                    <p className="mt-1 text-sm text-muted">
                      {attendedJulyClasses} of {totalJulyClasses} classes attended in {monthLabel(currentMonthKey)}
                    </p>
                  </div>

                  {/* Overall Pending Fee Status */}
                  <div className="card rounded-sm p-5">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Overall Fee Status</p>
                    <p className={`mt-3 font-display text-2xl font-bold ${overallPendingAmount === 0 ? 'text-moss' : 'text-seal'}`}>
                      {overallPendingAmount === 0 ? 'Paid' : `₹${overallPendingAmount.toLocaleString('en-IN')} Due`}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {overallPendingAmount === 0
                        ? `₹0 remaining up to ${monthLabel(currentMonthKey)}`
                        : `${unpaidMonthsList.length} month${unpaidMonthsList.length > 1 ? 's' : ''} pending (${unpaidMonthLabels.join(', ')})`}
                    </p>
                  </div>

                  {/* Reminder Status */}
                  <div className="card rounded-sm p-5">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Reminder status</p>
                    <p className={`mt-3 font-display text-2xl font-bold ${unpaidMonthsList.length ? 'text-seal' : 'text-moss'}`}>
                      {unpaidMonthsList.length ? 'Action Needed' : 'On track'}
                    </p>
                    <p className="mt-1 text-sm text-muted">{monthsPaid} paid months recorded</p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="card rounded-sm p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-bold text-paper">Attendance overview</p>
                        <p className="text-sm text-muted">Monthly class participation chart (Click bar to select month)</p>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 240 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={chartData}
                          barCategoryGap={18}
                          onClick={(e: any) => {
                            if (e && e.activeTooltipIndex !== undefined) {
                              setSelectedMonthIndex(e.activeTooltipIndex);
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#3A322A" vertical={false} />
                          <XAxis dataKey="month" stroke="#948B7E" fontSize={11} tickLine={false} axisLine={{ stroke: '#3A322A' }} interval={0} />
                          <YAxis stroke="#948B7E" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="attended" radius={[2, 2, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`${entry.month}-${index}`}
                                fill={index === selectedMonthIndex ? '#D4A843' : entry.attended > 0 ? '#4C7A5E' : '#3A322A'}
                                stroke={index === selectedMonthIndex ? '#EDE6D6' : 'none'}
                                strokeWidth={index === selectedMonthIndex ? 1.5 : 0}
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

                  <div className="space-y-4">
                    <div className="card rounded-sm p-5 sm:p-6">
                      <p className="font-display text-lg font-bold text-paper">Reminder note</p>
                      <p className="mt-3 text-sm leading-7 text-muted">
                        {overallPendingAmount === 0
                          ? 'Your fees are completely up to date. You are all set for now.'
                          : `You have pending fees of ₹${overallPendingAmount.toLocaleString('en-IN')}${unpaidMonthLabels.length ? ` for ${unpaidMonthLabels.join(', ')}` : ''}. Paying early helps keep your record up to date.`}
                      </p>
                    </div>
                    <PortalProfileCard student={student} onUpdated={refreshPortalData} />
                  </div>
                </div>

                <div className="card rounded-sm p-5 sm:p-6">
                  <p className="font-display text-lg font-bold text-paper">Fee history</p>
                  <div className="mt-4 grid gap-2">
                    {months.map((month) => {
                      const fee = fees.find((entry) => entry.month_year === month);
                      return (
                        <div key={month} className="flex items-center justify-between border-b border-hairline/70 py-2.5 last:border-0">
                          <span className="text-sm text-paper">{monthLabel(month)}</span>
                          <span
                            className={`rounded-sm px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                              fee?.paid ? 'bg-moss/20 text-moss' : 'bg-seal/20 text-seal'
                            }`}
                          >
                            {fee?.paid ? `Paid ${fee.paid_date ? new Date(fee.paid_date).toLocaleDateString('en-IN') : ''}` : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
