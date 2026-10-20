'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Student, Fee, lastNMonths, monthLabel, studentHasFeeMonth } from '@/lib/types';
import BeltTag from './BeltTag';

export default function FeesSection() {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const months = useMemo(() => lastNMonths(6), []);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppSecret, setWhatsAppSecret] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppResult, setWhatsAppResult] = useState<{
    ok?: boolean;
    error?: string;
    summary?: { sentCount: number; skippedNoPhoneCount: number; failedCount: number; paidCount: number };
    results?: Array<{ name: string; status: string; error?: string }>;
  } | null>(null);
  const [reminderResult, setReminderResult] = useState<{
    ok?: boolean;
    error?: string;
    summary?: {
      totalActive: number;
      paidCount: number;
      unpaidCount: number;
      sentCount: number;
      skippedNoEmailCount: number;
      failedCount: number;
    };
    results?: Array<{ name: string; email: string | null; status: string; error?: string }>;
  } | null>(null);

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
    const nextPaid = !existing?.paid;
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
  const unpaidThisMonth = students.filter(
    (s) => studentHasFeeMonth(s, currentMonth) && !feeFor(s.id, currentMonth)?.paid
  );

  async function handleSendReminders() {
    setSendingReminders(true);
    setReminderResult(null);
    try {
      const res = await fetch('/api/send-fee-reminders?force=true', {
        method: 'POST',
      });
      const data = await res.json();
      setReminderResult(data);
    } catch (err: unknown) {
      setReminderResult({
        error: err instanceof Error ? err.message : 'Failed to send reminders',
      });
    } finally {
      setSendingReminders(false);
    }
  }

  async function handleSendWhatsAppReminders() {
    setSendingWhatsApp(true);
    setWhatsAppResult(null);
    try {
      const res = await fetch('/api/send-whatsapp-fee-reminders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsAppSecret}`,
        },
      });
      const data = await res.json();
      setWhatsAppResult(data);
    } catch (err: unknown) {
      setWhatsAppResult({
        error: err instanceof Error ? err.message : 'Failed to send WhatsApp reminders',
      });
    } finally {
      setSendingWhatsApp(false);
    }
  }

  function closeWhatsAppModal() {
    setShowWhatsAppModal(false);
    setWhatsAppSecret('');
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-paper font-bold">Fee Ledger</h2>
          <p className="text-muted text-sm mt-1">Tap a month to mark it paid. Last 6 months shown.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setReminderResult(null);
              setShowReminderModal(true);
            }}
            className="btn btn-secondary text-xs sm:text-sm py-2 px-3 flex items-center gap-2"
          >
            ✉️ Send Gmail Reminders
          </button>
          <button
            onClick={() => {
              setWhatsAppResult(null);
              setWhatsAppSecret('');
              setShowWhatsAppModal(true);
            }}
            className="btn btn-secondary text-xs sm:text-sm py-2 px-3 flex items-center gap-2"
          >
            💬 Send WhatsApp Reminders
          </button>
          <div className="card rounded-sm px-4 py-2.5 text-sm">
            <span className="text-muted">Outstanding this month: </span>
            <span className="text-seal font-bold">{unpaidThisMonth.length}</span>
            <span className="text-muted"> / {students.length}</span>
          </div>
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
          {/* Mobile Card Roster View */}
          <div className="sm:hidden grid gap-3">
            {students.map((s) => {
              const studentMonths = months.filter((month) => studentHasFeeMonth(s, month));
              return (
              <div key={s.id} className="card rounded-sm p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/student/${s.id}`} className="font-body font-bold text-paper hover:text-gold transition-colors block truncate">
                      {s.full_name}
                    </Link>
                    <div className="mt-2"><BeltTag belt={s.belt_rank} small /></div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">
                    {studentMonths.filter((month) => feeFor(s.id, month)?.paid).length}/{studentMonths.length} paid
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-6 gap-2">
                  {months.map((m) => {
                    const f = feeFor(s.id, m);
                    const enrolled = studentHasFeeMonth(s, m);
                    return (
                      <button
                        key={m}
                        onClick={() => enrolled && toggle(s, m)}
                        disabled={!enrolled}
                        className={`w-full aspect-square rounded-sm border text-xs font-bold transition-all ${
                          !enrolled
                            ? 'border-transparent bg-transparent text-transparent cursor-default'
                            : f?.paid
                              ? 'bg-moss border-moss text-paper'
                              : 'bg-surface2 border-hairline text-muted hover:text-paper'
                        }`}
                        aria-label={enrolled ? `${monthLabel(m)} ${f?.paid ? 'paid' : 'unpaid'}` : `${monthLabel(m)} before enrollment`}
                      >
                        {f?.paid ? '✓' : '–'}
                      </button>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
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
                          {studentHasFeeMonth(s, m) ? <button
                            onClick={() => toggle(s, m)}
                            className={`w-9 h-9 rounded-sm border transition-all inline-flex items-center justify-center font-bold ${
                              f?.paid
                                ? 'bg-moss border-moss text-paper'
                                : 'bg-surface2 border-hairline text-transparent hover:text-hairline'
                            }`}
                            aria-label={f?.paid ? 'Paid' : 'Unpaid'}
                          >
                            ✓
                          </button> : <span className="text-muted/30">—</span>}
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

      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="card rounded-sm w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeWhatsAppModal}
              className="absolute top-4 right-4 text-muted hover:text-paper text-lg font-bold"
              aria-label="Close WhatsApp reminder dialog"
            >
              ✕
            </button>
            <h3 className="font-display text-xl font-bold text-paper">💬 WhatsApp Fee Reminders</h3>
            <p className="text-muted text-sm mt-1">
              Send the pending fee reminder for <strong className="text-gold">{monthLabel(currentMonth)}</strong> to unpaid students with a phone number.
            </p>
            <div className="mt-4 p-3 bg-surface2/60 border border-hairline rounded-sm text-xs text-muted leading-relaxed">
              Automatic reminders are scheduled for the 1st of each month. Manual sending requires the configured CRON_SECRET. Phone numbers must include their country code, and the Meta WhatsApp template must be approved.
            </div>
            <label className="block mt-4 text-[11px] uppercase tracking-widest text-muted mb-1.5">
              Manual sending key
              <input
                type="password"
                autoComplete="off"
                value={whatsAppSecret}
                onChange={(event) => setWhatsAppSecret(event.target.value)}
                placeholder="Enter CRON_SECRET"
                className="mt-1.5 w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper placeholder:text-muted/60 focus:border-gold outline-none normal-case tracking-normal"
              />
            </label>
            <p className="mt-3 text-xs text-muted">
              Unpaid students: {unpaidThisMonth.length}; with phone: {unpaidThisMonth.filter((s) => s.phone?.trim()).length}
            </p>
            {whatsAppResult && (
              <div className={`mt-4 p-3 rounded-sm text-xs border ${whatsAppResult.error ? 'bg-[#2C1517] border-seal' : 'bg-[#14251B] border-moss'}`}>
                {whatsAppResult.error ? (
                  <p className="text-seal font-bold">Error: {whatsAppResult.error}</p>
                ) : (
                  <>
                    <p className="text-moss font-bold">
                      Processed — sent: {whatsAppResult.summary?.sentCount || 0}, missing phone: {whatsAppResult.summary?.skippedNoPhoneCount || 0}, failed: {whatsAppResult.summary?.failedCount || 0}, paid: {whatsAppResult.summary?.paidCount || 0}
                    </p>
                    {whatsAppResult.results?.map((result, index) => (
                      <p key={`${result.name}-${index}`} className="mt-1 text-muted">
                        {result.name}: {result.status}{result.error ? ` — ${result.error}` : ''}
                      </p>
                    ))}
                  </>
                )}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeWhatsAppModal}
                className="btn text-xs py-2 px-4 border border-hairline text-muted hover:text-paper"
              >
                Close
              </button>
              <button
                onClick={handleSendWhatsAppReminders}
                disabled={sendingWhatsApp || !whatsAppSecret.trim() || unpaidThisMonth.length === 0}
                className="btn btn-primary text-xs py-2 px-4 disabled:opacity-50"
              >
                {sendingWhatsApp ? 'Sending…' : 'Send WhatsApp Reminders'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Fee Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="card rounded-sm w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowReminderModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-paper text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="font-display text-xl font-bold text-paper flex items-center gap-2">
              <span>✉️</span> Gmail Fee Reminders
            </h3>
            <p className="text-muted text-sm mt-1">
              Send fee pending notice for <strong className="text-gold">{monthLabel(currentMonth)}</strong>.
            </p>

            <div className="mt-4 p-3 bg-surface2/60 border border-hairline rounded-sm text-xs text-muted leading-relaxed">
              💡 <strong>Automated Schedule:</strong> Emails are sent automatically on the <strong>last day of every month</strong> via your Gmail SMTP settings (`GMAIL_USER`). You can also click below to dispatch reminders manually right now.
            </div>

            <div className="mt-5">
              <h4 className="font-body text-xs uppercase tracking-widest text-muted mb-2 font-bold">
                Unpaid Active Students ({unpaidThisMonth.length})
              </h4>

              {unpaidThisMonth.length === 0 ? (
                <p className="text-moss text-sm font-semibold p-4 text-center bg-moss/10 rounded-sm">
                  🎉 All active students have paid their fees for {monthLabel(currentMonth)}!
                </p>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                  {unpaidThisMonth.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2.5 bg-surface2 rounded-sm text-sm">
                      <div>
                        <span className="font-bold text-paper">{s.full_name}</span>
                        <div className="text-xs text-muted">{s.email ? s.email : '⚠️ No email linked'}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${s.email ? 'bg-moss/20 text-moss' : 'bg-seal/20 text-seal'}`}>
                        {s.email ? 'Ready' : 'Missing Email'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {reminderResult && (
              <div className="mt-4 p-3 rounded-sm text-xs border" style={{
                backgroundColor: reminderResult.error ? '#2C1517' : '#14251B',
                borderColor: reminderResult.error ? '#8B261D' : '#4C7A5E',
              }}>
                {reminderResult.error ? (
                  <p className="text-seal font-bold">⚠️ Error: {reminderResult.error}</p>
                ) : (
                  <div>
                    <p className="text-moss font-bold mb-1">
                      ✅ Reminders Processed! (Sent: {reminderResult.summary?.sentCount || 0}, Skipped without Email: {reminderResult.summary?.skippedNoEmailCount || 0}, Failed: {reminderResult.summary?.failedCount || 0})
                    </p>
                    {reminderResult.results && reminderResult.results.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto text-[11px] text-muted">
                        {reminderResult.results.map((r, i) => (
                          <div key={i} className="flex justify-between border-b border-white/5 py-0.5">
                            <span>{r.name}</span>
                            <span className={r.status === 'sent' ? 'text-moss font-bold' : r.status === 'failed' ? 'text-seal' : 'text-muted'}>
                              {r.status === 'sent' ? 'Sent ✉️' : r.status === 'already_paid' ? 'Paid ✓' : r.status === 'skipped_no_email' ? 'No Email' : `Failed (${r.error})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowReminderModal(false)}
                className="btn text-xs py-2 px-4 border border-hairline text-muted hover:text-paper"
              >
                Close
              </button>
              {unpaidThisMonth.length > 0 && (
                <button
                  onClick={handleSendReminders}
                  disabled={sendingReminders}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2"
                >
                  {sendingReminders ? 'Sending Emails...' : ' Send Reminders Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
