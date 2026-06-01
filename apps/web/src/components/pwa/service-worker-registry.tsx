'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegistry() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  window.dispatchEvent(new CustomEvent('sw-update'));
                }
              });
            }
          });
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
