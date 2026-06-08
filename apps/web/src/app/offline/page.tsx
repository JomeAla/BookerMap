'use client';
import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      window.location.href = '/dashboard';
    }
  }, [isOnline]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4">
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">BookerMap</span>
        </div>
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <WifiOff className="h-10 w-10 text-gray-400 dark:text-gray-500" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          You&apos;re offline
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Reconnect
        </button>
      </div>
    </div>
  );
}
