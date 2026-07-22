'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
        {data.attendedDates && data.attendedDates.length > 0 ? (
          <div className="mt-2 border-t border-hairline/50 pt-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Class Dates Attended:</p>
            <p className="text-moss font-mono text-[11px] leading-relaxed">
              {data.attendedDates.join(', ')}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-muted italic">No classes attended this month</p>
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

  const months = useMemo(() => lastNMonths(6), []);

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

  const currentMonthKey = months[months.length - 1];

  let activeMonthKey = currentMonthKey;
  let activeDojoClassDates = Array.from(
    new Set(
      allDojoAttendance
        .filter((entry) => entry.class_date.slice(0, 7) === currentMonthKey.slice(0, 7))
        .map((entry) => entry.class_date)
    )
  );

  if (activeDojoClassDates.length === 0) {
    for (let i = months.length - 1; i >= 0; i--) {
      const mDates = Array.from(
        new Set(
          allDojoAttendance
            .filter((entry) => entry.class_date.slice(0, 7) === months[i].slice(0, 7))
            .map((entry) => entry.class_date)
        )
      );
      if (mDates.length > 0) {
        activeMonthKey = months[i];
        activeDojoClassDates = mDates;
        break;
      }
    }
  }

  const studentAttendedInActiveMonth = activeDojoClassDates.filter((date) =>
    attendance.some((entry) => entry.class_date === date && entry.present)
  );

  const totalClassesInActiveMonth = activeDojoClassDates.length || attendance.filter(a => a.class_date.slice(0, 7) === activeMonthKey.slice(0, 7)).length;
  const attendedClassesInActiveMonth = studentAttendedInActiveMonth.length;
  const attendanceRate = totalClassesInActiveMonth
    ? Math.round((attendedClassesInActiveMonth / totalClassesInActiveMonth) * 100)
    : 0;

  const chartData = months.map((monthKey) => {
    const dojoDatesInMonth = Array.from(
      new Set(
        allDojoAttendance
          .filter((entry) => entry.class_date.slice(0, 7) === monthKey.slice(0, 7))
          .map((entry) => entry.class_date)
      )
    ).sort();

    const studentInMonth = attendance.filter((entry) => entry.class_date.slice(0, 7) === monthKey.slice(0, 7));

    const totalMonthClasses = dojoDatesInMonth.length || studentInMonth.length;

    const checkDates = dojoDatesInMonth.length > 0 ? dojoDatesInMonth : studentInMonth.map((s) => s.class_date);
    const attendedDates = checkDates.filter((date) =>
      attendance.some((entry) => entry.class_date === date && entry.present)
    );

    const attendedDateLabels = attendedDates.map((d) => {
      const dt = new Date(`${d}T00:00:00`);
      return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short' }).format(dt);
    });

    return {
      month: monthLabel(monthKey).split(' ')[0],
      fullMonth: monthLabel(monthKey),
      attended: attendedDates.length,
      total: totalMonthClasses,
      attendedDates: attendedDateLabels,
      hasClasses: totalMonthClasses > 0,
    };
  });

  const currentFee = fees.find((entry) => entry.month_year === currentMonthKey);
  const outstandingMonths = months.filter((month) => !fees.find((entry) => entry.month_year === month)?.paid);
  const refreshPortalData = () => setRefreshKey((value) => value + 1);
  const monthsPaid = fees.filter((entry) => entry.paid).length;
  const age = getAge(student?.date_of_birth ?? null);

  return (
    <main className="min-h-screen bg-texture px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted">Kolnad Dojo</p>
            <h1 className="font-display text-2xl font-bold text-paper">Student portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted transition-colors hover:text-paper">
              Back to register
            </Link>
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
                  <div className="card rounded-sm p-5">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Attendance rate</p>
                    <p className="mt-3 font-display text-4xl font-bold text-paper">{attendanceRate}%</p>
                    <p className="mt-1 text-sm text-muted">
                      {attendedClassesInActiveMonth} of {totalClassesInActiveMonth} classes attended in {monthLabel(activeMonthKey)}
                    </p>
                  </div>
                  <div className="card rounded-sm p-5">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Fee status</p>
                    <p className={`mt-3 font-display text-2xl font-bold ${currentFee?.paid ? 'text-moss' : 'text-seal'}`}>
                      {currentFee?.paid ? 'Paid' : 'Due'}
                    </p>
                    <p className="mt-1 text-sm text-muted">₹{student?.monthly_fee || 0} / month</p>
                  </div>
                  <div className="card rounded-sm p-5">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Reminder status</p>
                    <p className={`mt-3 font-display text-2xl font-bold ${outstandingMonths.length ? 'text-seal' : 'text-moss'}`}>
                      {outstandingMonths.length ? 'Needed' : 'On track'}
                    </p>
                    <p className="mt-1 text-sm text-muted">{monthsPaid} paid months recorded</p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="card rounded-sm p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-bold text-paper">Attendance overview</p>
                        <p className="text-sm text-muted">Your recent class participation & dates attended</p>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 240 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} barCategoryGap={18}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#3A322A" vertical={false} />
                          <XAxis dataKey="month" stroke="#948B7E" fontSize={12} tickLine={false} axisLine={{ stroke: '#3A322A' }} />
                          <YAxis stroke="#948B7E" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="attended" radius={[2, 2, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`${entry.month}-${index}`} fill={entry.attended > 0 ? '#4C7A5E' : '#3A322A'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-6 border-t border-hairline/60 pt-4">
                      <p className="text-xs uppercase tracking-widest text-muted font-bold mb-3">Class Dates Attended by Month</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {chartData.filter((d) => d.hasClasses).map((d) => (
                          <div key={d.fullMonth} className="rounded-sm border border-hairline/60 bg-surface2/40 p-3">
                            <div className="flex items-center justify-between text-xs font-bold text-paper">
                              <span>{d.fullMonth}</span>
                              <span className="text-gold">{d.attended} / {d.total} classes ({d.total ? Math.round((d.attended / d.total) * 100) : 0}%)</span>
                            </div>
                            {d.attendedDates.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {d.attendedDates.map((dateLabel) => (
                                  <span key={dateLabel} className="rounded-sm bg-moss/20 border border-moss/40 px-2 py-0.5 text-[11px] text-moss font-mono">
                                    ✓ {dateLabel}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-1 text-[11px] text-muted italic">No classes attended</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="card rounded-sm p-5 sm:p-6">
                      <p className="font-display text-lg font-bold text-paper">Reminder note</p>
                      <p className="mt-3 text-sm leading-7 text-muted">
                        {currentFee?.paid ? 'Your current month is already paid. You are all set for now.' : 'Your current month fee is still pending. Paying early helps keep your record up to date.'}
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

