'use client';

import { useEffect, useCallback, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
const PUSH_SUB_KEY = 'push-subscribed';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function setupPushNotifications(registration: ServiceWorkerRegistration) {
  if (!('PushManager' in window)) return;

  const stored = localStorage.getItem(PUSH_SUB_KEY);
  if (stored === 'granted') return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  try {
    const vapidRes = await fetch(`${API_BASE}/notifications/push/vapid-key`);
    const { publicKey } = await vapidRes.json();
    if (!publicKey) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });

    const token = localStorage.getItem('token');
    if (!token) return;

    await fetch(`${API_BASE}/notifications/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscription.toJSON()),
    });

    localStorage.setItem(PUSH_SUB_KEY, 'granted');
  } catch (err) {
    console.error('Push subscription failed:', err);
  }
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [swState, setSwState] = useState<'idle' | 'installing' | 'installed' | 'updating' | 'updated'>('idle');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (reg.installing) {
            setSwState('installing');
          } else if (reg.active) {
            setSwState('installed');
          }

          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            setSwState('updating');

            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  setSwState('updated');
                  window.dispatchEvent(new CustomEvent('sw-update'));
                } else {
                  setSwState('installed');
                }
              }
            });
          });

          if (reg.active) {
            setupPushNotifications(reg);
          } else {
            reg.addEventListener('activate', () => {
              setupPushNotifications(reg);
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed === 'true') return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  const handleUpdate = () => {
    window.location.reload();
  };

  return (
    <>
      {children}

      {showInstall && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 sm:bottom-4 sm:left-auto sm:right-4 sm:w-80">
          <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={handleDismiss}
              className="absolute right-2 top-2 rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Install BookerMap</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Install this app on your device for a better experience.
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Install
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {swState === 'updated' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 sm:bottom-4 sm:left-auto sm:right-4 sm:w-80">
          <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                <Download className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Update available</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  A new version is ready. Refresh to update.
                </p>
                <button
                  onClick={handleUpdate}
                  className="mt-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ServiceWorkerRegistryScript />
    </>
  );
}

function ServiceWorkerRegistryScript() {
  return null;
}
