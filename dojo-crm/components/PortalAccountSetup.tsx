'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Student } from '@/lib/types';

export default function PortalAccountSetup({ student }: { student: Student }) {
  const [email, setEmail] = useState(student.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch('/api/portal/create-account', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        studentId: student.id,
      }),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error || 'Unable to create portal account.');
      return;
    }

    setMessage(result.created ? 'Portal account created successfully.' : 'Portal account already exists.');
    setPassword('');
    await supabase.from('students').update({ email }).eq('id', student.id);
  }

  return (
    <div className="card rounded-sm p-5 sm:p-6">
      <p className="font-display text-lg font-bold text-paper">Portal account</p>
      <p className="mt-2 text-sm text-muted">Create or refresh a student portal login for this student.</p>
      <form onSubmit={createAccount} className="mt-4 space-y-3">
        <label className="block text-sm text-paper">
          <span className="mb-2 block">Student email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-sm border border-hairline bg-surface2 px-3 py-2 text-sm outline-none focus:border-gold"
            required
          />
        </label>
        <label className="block text-sm text-paper">
          <span className="mb-2 block">Temporary password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-sm border border-hairline bg-surface2 px-3 py-2 text-sm outline-none focus:border-gold"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-sm bg-seal px-4 py-2 text-sm font-bold uppercase tracking-wide text-paper"
        >
          {loading ? 'Creating…' : 'Create portal login'}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-paper">{message}</p>}
    </div>
  );
}
