'use client';
import { useEffect } from 'react';
import InstallPrompt from './InstallPrompt';
import { registerServiceWorker } from '@/lib/pwa';

export default function PwaInit() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <InstallPrompt />;
}
