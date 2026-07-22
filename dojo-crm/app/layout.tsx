import type { Metadata } from 'next';
import { Shippori_Mincho, Zen_Kaku_Gothic_New } from 'next/font/google';
import './globals.css';
import PwaInit from '@/components/PwaInit';
import Link from 'next/link';

const mincho = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-mincho',
  display: 'swap',
});

const kaku = Zen_Kaku_Gothic_New({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-kaku',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'INSTITUTE OF KARATE AND ALLIED ARTS — Kolnad Dojo',
  description: 'Attendance & fee register for Kolnad Dojo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mincho.variable} ${kaku.variable}`}>
      <body className="bg-texture min-h-screen bg-grain">
        {children}
        <PwaInit />
      </body>
    </html>
  );
}
