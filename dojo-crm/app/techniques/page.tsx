'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

const belts = [
  {
    name: 'White Belt',
    accent: 'from-[#EDE6D6] to-[#C9C0AC]',
    stance: 'Assume forward stance',
    techniques: [
      'Down Block, reverse punch',
      'Upper Block, reverse punch',
      'Inner forearm block, reverse punch',
      'Outer forearm block, reverse punch',
      'Down block, double punch',
      'Upper block, double punch',
      'Inner forearm block, double punch',
      'Outer forearm block, double punch',
    ],
  },
  {
    name: 'Yellow Belt',
    accent: 'from-[#E8C33B] to-[#B78D12]',
    stance: 'Assume forward stance',
    techniques: [
      'Down Block, same hand inner forearm block, punch',
      'Upper Block, same hand outer forearm block, punch',
      'Inner forearm block, Upper block, punch',
      'Outer forearm block, Down Block, punch',
      'Down Block, Back fist strike, punch',
      'Upper Block, Back fist strike, punch',
      'Inner forearm block, back fist strike, punch',
      'Outer forearm block, back fist strike, punch',
      'Front kick, leg forward, down block, reverse punch',
      'Side kick, leg forward, upper block, reverse punch',
    ],
  },
  {
    name: 'Orange Belt',
    accent: 'from-[#D9772E] to-[#A04B12]',
    stance: 'Assume back stance',
    techniques: [
      'Slide front leg to forward stance, down block, same hand inner forearm block, same hand back fist strike, move forward with knife hand block',
      'Slide front to forward stance, upper block, same hand outer forearm block, same hand back fist strike, move with knife hand block',
      'Slide front leg to forward stance, down block, same hand inner forearm block, reverse punch, front kick, keep the leg forward, knife hand block (K.H.B.)',
      'Slide front leg to forward stance, upper block, same hand outer forearm block, reverse punch, side kick, keep the leg forward, K.H.B.',
      'Slide the front leg to forward stance, down block, punch, slide the same leg to back stance, inner forearm block, move forward, horse stance, hammer fist strike',
      'Slide the front leg to forward stance, upper block, punch, slide the same leg to back stance, outer forearm block, move forward, horse stance, hammer fist strike',
      'Scissor move front kick, forward stance, down block, punch',
      'Scissor move side kick, forward stance, upper block, punch',
      'Scissor move turning kick, back stance inner forearm block, forward stance, punch',
      'Scissor move turning slap kick, back stance outer forearm block, forward stance, punch',
    ],
  },
  {
    name: 'Green Belt',
    accent: 'from-[#4C7A5E] to-[#2F4F3A]',
    stance: 'Assume back stance',
    techniques: [
      'Back leg sweep, leg forward to back stance, outer forearm block, forward stance, reverse punch',
      'Front leg scissor sweep, back stance outer forearm block, forward stance reverse punch',
      'Reverse sweep, back stance inner forearm block, forward stance reverse punch',
      'Circle sweep, back stance inner forearm block, forward stance reverse punch',
      'Back leg sweep, same leg side kick, back stance inner forearm block, forward stance reverse punch',
      'Front leg scissor sweep, turn, back kick, back stance inner forearm block, forward stance reverse punch',
      'Reverse sweep, back leg front kick, back stance inner forearm block, forward stance reverse punch',
      'Circle sweep, back leg turning kick, back stance inner forearm block, forward stance reverse punch',
      'Back leg sweep, same leg reverse sweep, back stance inner forearm block, forward stance reverse punch',
      'Front leg scissor sweep, turn, back leg circle sweep, back stance inner forearm block, forward stance reverse punch',
    ],
  },
  {
    name: 'Blue Belt',
    accent: 'from-[#33638C] to-[#1F445D]',
    stance: 'Assume forward stance',
    techniques: [
      'Inner crescent kick, same leg side kick, forward stance, down block, punch',
      'Inner crescent kick, same leg turning kick, forward stance, down block punch',
      'Inner crescent kick, turn, back leg front back kick, forward stance down block, punch',
      'Inner crescent kick, same leg hook kick, forward stance, down block, punch',
      'Outer crescent kick, same leg side kick, forward stance, down block, punch',
      'Outer crescent kick, same leg turning kick, forward stance, down block, punch',
      'Outer crescent kick, back leg side kick, forward stance, down block punch',
      'Outer crescent kick, back leg turning kick, forward stance, down block punch',
    ],
  },
  {
    name: 'Purple Belt',
    accent: 'from-[#6B4C8C] to-[#3D2A58]',
    stance: 'Assume forward stance',
    techniques: [
      'Move forward down block, reverse punch, inner forearm block, back leg front kick, leg back, down block',
      'Move forward, upper block, reverse punch, outer forearm block, back leg side kick, leg back, upper block',
      'Move forward inner forearm block, reverse punch, upper block, back leg turning kick, leg back, inner forearm block',
      'Move forward outer forearm block, reverse punch, down block, back leg front back kick, leg back, outer forearm block',
      'Move forward down block, same hand inner forearm block, same hand upper block, same hand back fist strike, reverse punch, back leg inner crescent kick, back leg front back kick, leg forward down block punch',
      'Move forward upper block, same hand outer forearm block, same hand down block, same hand back fist strike, reverse punch, inner crescent kick, back leg spinning kick, leg forward, down block punch',
    ],
  },
  {
    name: 'Brown Belt',
    accent: 'from-[#5C4330] to-[#34241A]',
    stance: 'Assume forward stance',
    techniques: [
      'Back leg (right) front kick, join the leg, turn around left leg back kick, same leg scissor jump kick, leg forward, down block reverse punch',
      'Back leg turning kick, join the leg, turn around, left leg side kick, same leg scissor jump kick, leg forward, down block reverse punch',
      'Back leg inner crescent kick, join the leg, turn around left leg back kick, keep the leg forward, right leg front kick, same leg scissor jumping kick, leg forward, down block, reverse punch',
      'Back leg inner crescent kick, join the leg, turn around left leg side kick, keep the leg forward, same leg scissor move side kick, same leg scissor jump kick, down block, punch',
      'Back leg turning slap kick, leg forward, same leg scissor move hook kick, leg forward, same leg scissor jump kick, down block, punch',
      'Back leg inner crescent kick, leg forward, same leg scissor move hook kick, leg forward, left front kick, same leg scissor jump kick, down block, punch',
    ],
  },
];

export default function TechniquesPage() {
  const [selectedBelt, setSelectedBelt] = useState(belts[0].name);

  const activeBelt = useMemo(() => belts.find((belt) => belt.name === selectedBelt) ?? belts[0], [selectedBelt]);

  return (
    <main className="min-h-screen bg-texture px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-hairline bg-[#1E1A16]/80 p-5 shadow-[0_0_0_1px_rgba(212,168,67,0.08)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted">Kolnad Dojo</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-paper">Techniques Library</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              Explore techniques by belt level, styled as a visual learning gallery for students.
            </p>
          </div>
          <Link href="/" className="rounded-sm border border-hairline px-3 py-2 text-sm text-paper transition-colors hover:bg-surface2">
            Back to home
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="card rounded-sm p-6 sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Choose your belt</p>
            <div className="mt-3">
              <span className="strong-label">Belt selection</span>
            </div>
            <div className="mt-5 grid gap-3">
              {belts.map((belt) => (
                <button
                  key={belt.name}
                  type="button"
                  onClick={() => setSelectedBelt(belt.name)}
                  className={`rounded-sm border px-4 py-3 text-left transition-all ${
                    selectedBelt === belt.name
                      ? 'border-gold bg-[#2A231D] text-paper'
                      : 'border-hairline text-muted hover:border-gold hover:text-paper'
                  }`}
                >
                  <div className={`mb-2 h-1.5 rounded-full bg-gradient-to-r ${belt.accent}`} />
                  <div className="font-semibold">{belt.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{belt.techniques.length} techniques</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden rounded-sm">
            <div className={`bg-gradient-to-br ${activeBelt.accent} p-6 sm:p-8`}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#14110F]">Selected belt</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-[#14110F]">{activeBelt.name}</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#14110F]/80">{activeBelt.stance}</p>
            </div>
            <div className="p-6 sm:p-8">
              <div className="rounded-sm border border-dashed border-hairline p-6 sm:p-8">
                <p className="font-display text-xl font-bold text-paper">Technique list</p>
                <div className="mt-4 rounded-sm border border-gold/30 bg-[#2A231D]/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Belt focus</p>
                  <p className="mt-2 text-sm leading-7 text-paper">
                    <span className="font-semibold">{activeBelt.name}</span> — {activeBelt.stance}
                  </p>
                </div>
                <div className="mt-6 rounded-sm border border-hairline bg-[#14110F]/40 p-4 sm:p-5">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Technique list</p>
                  <ol className="mt-4 space-y-3">
                    {activeBelt.techniques.map((technique, index) => (
                      <li key={`${activeBelt.name}-${index}`} className="rounded-sm border border-hairline bg-surface2/80 p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-[#14110F]">
                            {index + 1}
                          </span>
                          <span className="font-semibold leading-7 text-paper">{technique}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
