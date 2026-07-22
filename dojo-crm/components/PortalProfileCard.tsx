'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Student } from '@/lib/types';

export default function PortalProfileCard({
  student,
  onUpdated,
}: {
  student: Student | null;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: student?.phone || '',
    guardian_name: student?.guardian_name || '',
    date_of_birth: student?.date_of_birth || '',
  });

  async function saveProfile() {
    if (!student) return;
    setSaving(true);
    const { error } = await supabase
      .from('students')
      .update({
        phone: form.phone.trim() || null,
        guardian_name: form.guardian_name.trim() || null,
        date_of_birth: form.date_of_birth || null,
      })
      .eq('id', student.id);

    if (!error) {
      onUpdated();
      setEditing(false);
    }
    setSaving(false);
  }

  return (
    <div className="card rounded-sm p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold text-paper">Profile</p>
          <p className="text-sm text-muted">Update your personal details here.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({
              phone: student?.phone || '',
              guardian_name: student?.guardian_name || '',
              date_of_birth: student?.date_of_birth || '',
            });
            setEditing((value) => !value);
          }}
          className="rounded-sm border border-hairline px-3 py-2 text-xs font-bold uppercase tracking-wide text-paper"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-paper">
            <span className="mb-2 block">Phone number</span>
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-sm border border-hairline bg-surface2 px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </label>
          <label className="block text-sm text-paper">
            <span className="mb-2 block">Guardian name</span>
            <input
              value={form.guardian_name}
              onChange={(event) => setForm((current) => ({ ...current, guardian_name: event.target.value }))}
              className="w-full rounded-sm border border-hairline bg-surface2 px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </label>
          <label className="block text-sm text-paper">
            <span className="mb-2 block">Date of birth</span>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(event) => setForm((current) => ({ ...current, date_of_birth: event.target.value }))}
              className="w-full rounded-sm border border-hairline bg-surface2 px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </label>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="rounded-sm bg-seal px-4 py-2 text-sm font-bold uppercase tracking-wide text-paper"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm text-paper">
          <div className="rounded-sm border border-hairline p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted">Phone</p>
            <p className="mt-1">{student?.phone || 'Not provided'}</p>
          </div>
          <div className="rounded-sm border border-hairline p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted">Guardian</p>
            <p className="mt-1">{student?.guardian_name || 'Not provided'}</p>
          </div>
          <div className="rounded-sm border border-hairline p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted">Date of birth</p>
            <p className="mt-1">{student?.date_of_birth || 'Not provided'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
