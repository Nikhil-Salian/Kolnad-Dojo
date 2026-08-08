'use client';
import Link from 'next/link';

function assetPath(fileName: string) {
  return `/pdf%20and%20images/${encodeURIComponent(fileName)}`;
}

export default function KataKumitePage() {
  const pdfFiles = [
    'WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf',
    'WKF 2026 Kumite Competition Rules MASTER COPY_V11.pdf',
  ];
  return (
    <main className="min-h-screen bg-texture px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-sm border border-hairline bg-[#1E1A16]/80 p-6 shadow-[0_0_0_1px_rgba(212,168,67,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.35em] text-muted">Kolnad Dojo</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-paper">Kata & Kumite Rules</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            This section is ready for your PDF guide and rulebook content. It will open as a dedicated page for students.
          </p>
        </header>

        <section className="card rounded-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-bold text-paper">PDF resource</p>
              <p className="mt-2 text-sm text-muted">Upload your kata and kumite PDF here for students to access.</p>
            </div>
            <Link href="/portal" className="rounded-sm border border-hairline px-3 py-2 text-sm text-paper transition-colors hover:bg-surface2">
              Back to portal
            </Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {pdfFiles.map((fileName) => (
              <div key={fileName} className="rounded-sm border border-hairline bg-surface2/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">{fileName}</p>
                <div className="mt-3 overflow-hidden rounded-sm border border-hairline">
                  <iframe src={assetPath(fileName)} title={fileName} className="h-[360px] w-full bg-paper" />
                </div>
                <a
                  href={assetPath(fileName)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-sm border border-hairline px-3 py-2 text-sm text-paper transition-colors hover:bg-surface2"
                >
                  Open PDF
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
