'use client';
import Link from 'next/link';
import { useState } from 'react';
import Logo from '@/components/Logo';
import AttendanceSection from '@/components/AttendanceSection';
import FeesSection from '@/components/FeesSection';

export default function Home() {
  const [tab, setTab] = useState<'attendance' | 'fees'>('attendance');
  const [menuOpen, setMenuOpen] = useState(false);
  const [resourceMenuOpen, setResourceMenuOpen] = useState(false);

  function setTabAndClose(value: 'attendance' | 'fees') {
    setTab(value);
    setMenuOpen(false);
  }

  return (
    <main className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 py-8 sm:py-10 lg:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
        <Logo />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
