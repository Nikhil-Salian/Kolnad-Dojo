'use client';
import { BELT_COLORS } from '@/lib/types';

export default function BeltTag({ belt, small }: { belt: string; small?: boolean }) {
  const c = BELT_COLORS[belt] || BELT_COLORS['White Belt'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-body font-bold uppercase tracking-wide ${
        small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      }`}
      style={{ background: c.bg, color: c.text, boxShadow: `0 0 0 1px ${c.ring}` }}
    >
      {belt}
    </span>
  );
}
