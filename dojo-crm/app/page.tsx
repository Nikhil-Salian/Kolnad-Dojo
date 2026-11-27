'use client';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import AttendanceSection from '@/components/AttendanceSection';
import FeesSection from '@/components/FeesSection';
import { supabase } from '@/lib/supabaseClient';

type DashboardAccess = 'checking' | 'login' | 'authorized' | 'denied';

export default function Home() {
  const [access, setAccess] = useState<DashboardAccess>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [tab, setTab] = useState<'attendance' | 'fees'>('attendance');
  const [menuOpen, setMenuOpen] = useState(false);
  const [resourceMenuOpen, setResourceMenuOpen] = useState(false);

  const checkDashboardAccess = useCallback(async (token: string) => {
    setAccess('checking');
    setAuthError('');
    try {
      const response = await fetch('/api/dashboard/access', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setAuthError(body?.error || 'This account cannot access the dojo dashboard.');
        setAccess('denied');
        return;
      }
      setAccess('authorized');
    } catch {
      setAuthError('Unable to verify dashboard access. Check your connection and try again.');
      setAccess('denied');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (session?.access_token) {
        setEmail(session.user.email || '');
        await checkDashboardAccess(session.access_token);
      } else {
        setAccess('login');
      }
    };
    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setEmail(session.user.email || '');
        void checkDashboardAccess(session.access_token);
      } else {
        setEmail('');
        setAccess('login');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [checkDashboardAccess]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.session) {
      setAuthError(error?.message || 'Unable to sign in.');
      setAuthBusy(false);
      return;
    }
    setEmail(data.user.email || email);
    await checkDashboardAccess(data.session.access_token);
    setPassword('');
    setAuthBusy(false);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(`Unable to sign out: ${error.message}`);
      return;
    }
    setAccess('login');
    setEmail('');
    setPassword('');
    setAuthError('');
  }

  function setTabAndClose(value: 'attendance' | 'fees') {
    setTab(value);
    setMenuOpen(false);
  }

  if (access !== 'authorized') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="card w-full max-w-md rounded-sm p-6 sm:p-8">
          <div className="mb-7 flex justify-center">
            <Logo />
          </div>
          {access === 'checking' ? (
            <p role="status" className="text-center text-sm text-muted">Checking dashboard access…</p>
          ) : (
            <>
              <p className="text-center text-[11px] font-bold uppercase tracking-widest text-gold">Staff access</p>
              <h1 className="mt-2 text-center font-display text-2xl font-bold text-paper">Dojo Dashboard</h1>
              <p className="mt-2 text-center text-sm text-muted">Sign in with an authorized staff account to continue.</p>
              <form onSubmit={signIn} className="mt-6 grid gap-4">
                <label className="grid gap-1.5 text-sm font-semibold text-paper">
                  Email
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
                {authError && <p role="alert" className="text-sm text-[#F0A096]">{authError}</p>}
                <button
                  type="submit"
                  disabled={authBusy}
                  className="mt-1 w-full rounded-sm bg-seal px-5 py-3 text-xs font-bold uppercase tracking-widest text-paper transition-colors hover:bg-[#A32E23] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authBusy ? 'Signing in…' : 'Sign in'}
                </button>
                {access === 'denied' && email && (
                  <button type="button" onClick={() => void signOut()} className="text-xs text-muted underline">
                    Sign out of {email}
                  </button>
                )}
              </form>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 py-8 sm:py-10 lg:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
        <Logo />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-sm border border-hairline px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-paper hover:bg-surface2"
          >
            Sign out
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setResourceMenuOpen((value) => !value)}
                className="inline-flex items-center rounded-sm border border-gold/40 bg-[#26201A] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-paper shadow-[0_0_0_1px_rgba(212,168,67,0.12)] transition-colors hover:bg-[#2A231D]"
              >
                ☰ Menu
              </button>
              {resourceMenuOpen && (
                <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-sm border border-hairline bg-[#1E1A16] p-2 shadow-xl">
                  <Link
                    href="/techniques"
                    onClick={() => setResourceMenuOpen(false)}
                    className="block rounded-sm px-3 py-2 text-sm text-paper transition-colors hover:bg-surface2"
                  >
                    Techniques
                  </Link>
                  <Link
                    href="/kata-kumite"
                    onClick={() => setResourceMenuOpen(false)}
                    className="mt-1 block rounded-sm px-3 py-2 text-sm text-paper transition-colors hover:bg-surface2"
                  >
                    Kata & Kumite Rules
                  </Link>
                  <Link
                    href="/tournaments"
                    onClick={() => setResourceMenuOpen(false)}
                    className="mt-1 block rounded-sm px-3 py-2 text-sm text-paper transition-colors hover:bg-surface2"
                  >
                    Tournament Updates
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/portal"
              className="rounded-sm border border-gold/40 bg-[#26201A] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-paper shadow-[0_0_0_1px_rgba(212,168,67,0.12)] transition-colors hover:bg-[#2A231D]"
            >
              Portal
            </Link>
          </div>

          <nav className="hidden sm:flex rounded-sm border border-hairline overflow-hidden">
            <button
              onClick={() => setTab('attendance')}
              className={`px-5 py-2.5 font-body text-sm font-bold uppercase tracking-wide transition-colors ${
                tab === 'attendance' ? 'bg-seal text-paper' : 'text-muted hover:text-paper'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setTab('fees')}
              className={`px-5 py-2.5 font-body text-sm font-bold uppercase tracking-wide transition-colors border-l border-hairline ${
                tab === 'fees' ? 'bg-seal text-paper' : 'text-muted hover:text-paper'
              }`}
            >
              Fees
            </button>
          </nav>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label="Toggle section menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="sm:hidden inline-flex h-11 w-11 flex-col justify-center rounded-sm border border-hairline p-2 text-paper"
          >
            <span className="block h-0.5 w-5 rounded-full bg-paper" />
            <span className="block h-0.5 w-5 rounded-full bg-paper mt-1" />
            <span className="block h-0.5 w-5 rounded-full bg-paper mt-1" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="sm:hidden card rounded-sm border border-hairline p-3 mb-8">
          <div className="flex flex-col gap-2">
            <Link
              href="/techniques"
              className="rounded-sm border border-hairline px-4 py-3 text-sm font-bold uppercase tracking-wide text-paper transition-colors hover:bg-surface2"
            >
              Techniques
            </Link>
            <Link
              href="/kata-kumite"
              className="rounded-sm border border-hairline px-4 py-3 text-sm font-bold uppercase tracking-wide text-paper transition-colors hover:bg-surface2"
            >
              Kata & Kumite Rules
            </Link>
            <Link
              href="/tournaments"
              className="rounded-sm border border-hairline px-4 py-3 text-sm font-bold uppercase tracking-wide text-paper transition-colors hover:bg-surface2"
            >
              Tournament Updates
            </Link>
            <Link
              href="/portal"
              className="rounded-sm border border-hairline px-4 py-3 text-sm font-bold uppercase tracking-wide text-paper transition-colors hover:bg-surface2"
            >
              Portal
            </Link>
          </div>
          <button
            onClick={() => setTabAndClose('attendance')}
            className={`w-full text-left px-4 py-3 font-body text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === 'attendance' ? 'bg-seal text-paper' : 'text-paper/80 hover:text-paper'
            }`}
          >
            Attendance
          </button>
          <button
            onClick={() => setTabAndClose('fees')}
            className={`w-full text-left px-4 py-3 font-body text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === 'fees' ? 'bg-seal text-paper' : 'text-paper/80 hover:text-paper'
            }`}
          >
            Fees
          </button>
        </div>
      )}

      {tab === 'attendance' ? <AttendanceSection /> : <FeesSection />}

      <footer className="mt-10 sm:mt-14 pt-6 border-t border-hairline flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-muted uppercase tracking-widest">
        <span>Kolnad Dojo Register</span>
        <span>osu.</span>
      </footer>
    </main>
  );
}
