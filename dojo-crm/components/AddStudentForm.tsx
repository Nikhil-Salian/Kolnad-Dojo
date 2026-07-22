'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BELTS } from '@/lib/types';

export default function AddStudentForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [belt, setBelt] = useState<string>('White Belt');
  const [phone, setPhone] = useState('');
  const [guardian, setGuardian] = useState('');
  const [dob, setDob] = useState('');
  const [fee, setFee] = useState('1000');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter a name to enrol this student.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('students').insert({
      full_name: name.trim(),
      belt_rank: belt,
      phone: phone.trim() || null,
      guardian_name: guardian.trim() || null,
      date_of_birth: dob || null,
      monthly_fee: Number(fee) || 1000,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setName('');
    setPhone('');
    setGuardian('');
    setDob('');
    setFee('1000');
    setBelt('White Belt');
    setOpen(false);
    onAdded();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 rounded-sm bg-seal px-4 py-2.5 font-body font-bold text-sm text-paper tracking-wide transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <span className="text-lg leading-none">+</span> Enrol Student
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="card animate-rise rounded-sm p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="sm:col-span-2 lg:col-span-2">
        <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Aarav Shetty"
          className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper placeholder:text-muted/60 focus:border-gold outline-none"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Belt rank</label>
        <select
          value={belt}
          onChange={(e) => setBelt(e.target.value)}
          className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper outline-none focus:border-gold"
        >
          {BELTS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Guardian name</label>
        <input
          value={guardian}
          onChange={(e) => setGuardian(e.target.value)}
          placeholder="Optional"
          className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper placeholder:text-muted/60 focus:border-gold outline-none"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Optional"
          className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper placeholder:text-muted/60 focus:border-gold outline-none"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Date of birth</label>
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted mb-1.5">Monthly fee (₹)</label>
        <input
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          inputMode="numeric"
          className="w-full bg-surface2 border border-hairline rounded-sm px-3 py-2 text-paper focus:border-gold outline-none"
        />
      </div>
      <div className="flex items-end gap-2 lg:col-span-1 sm:col-span-2">
        <button
          disabled={saving}
          className="rounded-sm bg-seal px-4 py-2.5 font-body font-bold text-sm text-paper disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save student'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-sm border border-hairline px-4 py-2.5 font-body text-sm text-muted hover:text-paper"
        >
          Cancel
        </button>
      </div>
      {error && <p className="sm:col-span-2 lg:col-span-4 text-seal text-sm">{error}</p>}
    </form>
  );
}
