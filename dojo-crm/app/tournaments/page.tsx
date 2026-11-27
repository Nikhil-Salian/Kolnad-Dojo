'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  MAX_TOURNAMENT_FILE_SIZE,
  TOURNAMENT_BUCKET,
  TOURNAMENT_FILE_TYPES,
  TournamentUpdate,
} from '@/lib/tournamentUpdates';

function formatEventDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : 'Something went wrong. Please try again.';
}

export default function TournamentsPage() {
  const [updates, setUpdates] = useState<TournamentUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  const orderedUpdates = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return [...updates].sort((a, b) => {
      const aDate = a.event_date ? new Date(`${a.event_date}T00:00:00`) : null;
      const bDate = b.event_date ? new Date(`${b.event_date}T00:00:00`) : null;
      const aUpcoming = !!aDate && aDate >= now;
      const bUpcoming = !!bDate && bDate >= now;
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      if (aDate && bDate) return aUpcoming ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
      if (aDate) return -1;
      if (bDate) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [updates]);

  const loadUpdates = useCallback(async (accessToken: string) => {
    setLoadingUpdates(true);
    setLoadError('');
    try {
      const response = await fetch('/api/tournaments', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json();
      setUpdates(body.updates || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load tournament updates.');
    } finally {
      setLoadingUpdates(false);
    }
  }, []);

  const checkAdmin = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch('/api/tournaments/upload', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        setIsAdmin(true);
        setErrorNotice('');
      } else {
        setIsAdmin(false);
        setErrorNotice('');
      }
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setSessionEmail(session?.user.email || '');
      if (session?.access_token) {
        await Promise.all([checkAdmin(session.access_token), loadUpdates(session.access_token)]);
      } else {
        setUpdates([]);
        setLoadingUpdates(false);
        setAuthChecked(true);
      }
    };
    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email || '');
      if (session?.access_token) {
        void checkAdmin(session.access_token);
        void loadUpdates(session.access_token);
      } else {
        setIsAdmin(false);
        setUpdates([]);
        setLoadingUpdates(false);
        setAuthChecked(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [checkAdmin, loadUpdates]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorNotice('');
    setNotice('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.session) {
      setErrorNotice(error?.message || 'Unable to sign in.');
      setBusy(false);
      return;
    }
    setSessionEmail(data.user.email || email);
    await checkAdmin(data.session.access_token);
    setPassword('');
    setBusy(false);
  }

  async function publishUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setBusy(true);
    setNotice('');
    setErrorNotice('');
    let uploadedPath: string | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session has expired. Please sign in again.');

      if (file) {
        const extension = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
        if (file.size > MAX_TOURNAMENT_FILE_SIZE || file.size === 0) {
          throw new Error('Choose a file smaller than 100 MB.');
        }
        if (!TOURNAMENT_FILE_TYPES[extension] || TOURNAMENT_FILE_TYPES[extension] !== file.type) {
          throw new Error('Choose an image, PDF, or video in a supported format.');
        }

        const prepareResponse = await fetch('/api/tournaments/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
        });
        if (!prepareResponse.ok) throw new Error(await responseError(prepareResponse));
        const { path, token } = await prepareResponse.json();
        const { error: uploadError } = await supabase.storage
          .from(TOURNAMENT_BUCKET)
          .uploadToSignedUrl(path, token, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);
        uploadedPath = path;
      }

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          details,
          event_date: eventDate || null,
          attachment_path: uploadedPath,
          attachment_name: file?.name || null,
          attachment_type: file?.type || null,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));

      setTitle('');
      setDetails('');
      setEventDate('');
      setFile(null);
      const input = document.getElementById('tournament-file') as HTMLInputElement | null;
      if (input) input.value = '';
      setNotice('Tournament update published.');
      await loadUpdates(session.access_token);
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Unable to publish this tournament update.';
      if (uploadedPath) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const cleanupResponse = await fetch('/api/tournaments/upload', {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ path: uploadedPath }),
            });
            if (!cleanupResponse.ok) {
              message += ` The uploaded file could not be cleaned up: ${await responseError(cleanupResponse)}`;
            }
          }
        } catch (cleanupError) {
          message += ` The uploaded file could not be cleaned up: ${
            cleanupError instanceof Error ? cleanupError.message : 'unknown error'
          }`;
        }
      }
      setErrorNotice(message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUpdate(update: TournamentUpdate) {
    if (!window.confirm(`Delete "${update.title}" and its attached file?`)) return;
    setBusy(true);
    setNotice('');
    setErrorNotice('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session has expired. Please sign in again.');
      const response = await fetch(`/api/tournaments/${encodeURIComponent(update.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error(await responseError(response));
      setNotice('Tournament update deleted.');
      await loadUpdates(session.access_token);
    } catch (error) {
      setErrorNotice(error instanceof Error ? error.message : 'Unable to delete this tournament update.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setErrorNotice(`Unable to sign out: ${error.message}`);
    else {
      setIsAdmin(false);
      setSessionEmail('');
      setUpdates([]);
      setNotice('');
      setErrorNotice('');
    }
  }

  function renderAttachment(update: TournamentUpdate) {
    if (!update.attachment_url || !update.attachment_type) return null;
    if (update.attachment_type.startsWith('image/')) {
      return (
        <a href={update.attachment_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-sm border border-hairline">
          <img src={update.attachment_url} alt={update.title} className="max-h-96 w-full object-contain bg-[#14110F]" />
        </a>
      );
    }
    if (update.attachment_type.startsWith('video/')) {
      return <video src={update.attachment_url} controls preload="metadata" className="w-full rounded-sm border border-hairline bg-[#14110F]" />;
    }
    return (
      <a
        href={update.attachment_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-sm border border-gold/40 px-4 py-3 text-sm font-bold text-gold hover:bg-surface2"
      >
        <span aria-hidden="true">▤</span>
        View PDF: {update.attachment_name || 'Tournament document'}
      </a>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-xs font-bold uppercase tracking-widest text-gold hover:text-paper">
            ← Dojo dashboard
          </Link>
          <h1 className="mt-3 font-display text-3xl font-bold text-paper sm:text-4xl">Tournament Updates</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Upcoming tournaments, event details, notices, and documents from Kolnad Dojo.
          </p>
        </div>
        {sessionEmail && authChecked && (
          <button type="button" onClick={() => void signOut()} className="rounded-sm border border-hairline px-4 py-2 text-xs font-bold uppercase tracking-wide text-paper hover:bg-surface2">
            Sign out {sessionEmail ? `(${sessionEmail})` : ''}
          </button>
        )}
      </header>

      {isAdmin && (
        <section className="card mb-8 rounded-sm p-5 sm:p-7">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gold">Staff tools</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-paper">Post a tournament update</h2>
          </div>
          <form onSubmit={publishUpdate} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold text-paper">
              Title
              <input
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-sm border border-hairline bg-[#14110F] px-3 py-2.5 text-paper"
                placeholder="e.g. Kolnad Open Karate Championship"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-paper">
              Details
              <textarea
                maxLength={2500}
                rows={4}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                className="rounded-sm border border-hairline bg-[#14110F] px-3 py-2.5 text-paper"
                placeholder="Share event information, registration details, or other important notes."
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid content-start gap-1.5 text-sm font-semibold text-paper">
                Tournament date
                <input
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="rounded-sm border border-hairline bg-[#14110F] px-3 py-2.5 text-paper"
                />
              </label>
              <label className="grid content-start gap-1.5 text-sm font-semibold text-paper">
                Image, PDF, or video (optional, max 100 MB)
                <input
                  id="tournament-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.pdf,.mp4,.webm,.mov"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="w-full rounded-sm border border-hairline bg-[#14110F] px-3 py-2 text-xs text-paper file:mr-3 file:rounded-sm file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-xs file:font-bold file:text-gold"
                />
              </label>
            </div>
            {notice && <p role="status" className="text-sm text-moss">{notice}</p>}
            {errorNotice && <p role="alert" className="text-sm text-[#F0A096]">{errorNotice}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-fit rounded-sm bg-seal px-5 py-3 text-xs font-bold uppercase tracking-widest text-paper transition-colors hover:bg-[#A32E23] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Please wait…' : 'Publish update'}
            </button>
          </form>
        </section>
      )}

      {!sessionEmail && authChecked && (
        <section className="card mb-8 rounded-sm p-5 sm:p-7">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gold">Members area</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-paper">Sign in to view tournament updates</h2>
            <p className="mt-2 text-sm text-muted">Use your dojo portal email and password to view notices and attachments.</p>
          </div>
          <form onSubmit={signIn} className="mt-4 grid max-w-lg gap-3">
            <label className="grid gap-1.5 text-sm font-semibold text-paper">
              Account email
              <input
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-sm border border-hairline bg-[#14110F] px-3 py-2.5 text-paper"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-paper">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-sm border border-hairline bg-[#14110F] px-3 py-2.5 text-paper"
              />
            </label>
            {errorNotice && <p role="alert" className="text-sm text-[#F0A096]">{errorNotice}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-fit rounded-sm border border-gold/50 px-5 py-3 text-xs font-bold uppercase tracking-widest text-paper hover:bg-surface2 disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
      )}

      {sessionEmail && (
      <>
      {loadError && <p role="alert" className="mb-5 rounded-sm border border-seal/50 bg-seal/10 p-4 text-sm text-[#F0A096]">{loadError}</p>}
      <section aria-labelledby="updates-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gold">Notices & events</p>
            <h2 id="updates-heading" className="mt-1 font-display text-2xl font-bold text-paper">Latest updates</h2>
          </div>
          {isAdmin && <span className="text-xs text-muted">Manage published notices below</span>}
        </div>
        {loadingUpdates ? (
          <p className="card rounded-sm p-6 text-sm text-muted">Loading tournament updates…</p>
        ) : orderedUpdates.length === 0 ? (
          <p className="card rounded-sm p-6 text-sm text-muted">No tournament updates have been posted yet.</p>
        ) : (
          <div className="grid gap-4">
            {orderedUpdates.map((update) => {
              const upcoming = update.event_date && new Date(`${update.event_date}T00:00:00`) >= new Date(new Date().toDateString());
              return (
                <article key={update.id} className="card rounded-sm p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {upcoming && <span className="rounded-sm bg-moss/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-moss">Upcoming</span>}
                        {update.event_date && <span className="text-xs font-bold uppercase tracking-wide text-gold">{formatEventDate(update.event_date)}</span>}
                      </div>
                      <h3 className="font-display text-xl font-bold text-paper">{update.title}</h3>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteUpdate(update)}
                        className="rounded-sm border border-seal/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#F0A096] hover:bg-seal/20 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {update.details && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-paper/80">{update.details}</p>}
                  {update.attachment_url && <div className="mt-4">{renderAttachment(update)}</div>}
                </article>
              );
            })}
          </div>
        )}
      </section>
      </>
      )}
    </main>
  );
}
