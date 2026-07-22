'use client';
import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  if (!visible || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 z-50 rounded-sm border border-hairline bg-surface p-4 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-paper">Install Kolnad Dojo</p>
          <p className="text-xs text-muted mt-1">Add this site to your home screen for fast access.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              setVisible(false);
              await deferredPrompt.prompt();
              setDeferredPrompt(null);
            }}
            className="rounded-sm bg-seal px-4 py-2 text-sm font-bold text-paper"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-sm border border-hairline px-4 py-2 text-sm text-muted"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
}
