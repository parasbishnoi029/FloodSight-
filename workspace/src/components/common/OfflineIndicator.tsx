import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { OfflineCacheService } from '../../services/offlineCacheService';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncedCount, setSyncedCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const count = OfflineCacheService.syncPendingSos();
      if (count > 0) {
        setSyncedCount(count);
        setTimeout(() => setSyncedCount(0), 4000);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && syncedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[rgba(16,25,37,0.95)] backdrop-blur-md border border-[rgba(148,170,195,0.3)] px-3.5 py-2 text-xs text-white shadow-2xl">
      {!isOnline ? (
        <>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Offline Edge Mesh Active — Using cached Sentinel-1/2 rasters & queuing local SOS.</span>
        </>
      ) : (
        <>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>Connection Restored — {syncedCount} offline SOS report(s) successfully synced.</span>
        </>
      )}
    </div>
  );
};
