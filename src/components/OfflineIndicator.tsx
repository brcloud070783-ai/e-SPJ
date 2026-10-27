import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-24 sm:bottom-28 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg max-w-[calc(100vw-2rem)]"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Mode Luring — Perubahan disimpan lokal &amp; siap disinkronkan saat daring.</span>
    </div>
  );
};
