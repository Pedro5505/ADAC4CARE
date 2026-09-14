'use client';
import { useEffect, useState } from 'react';

export function PwaStatus() {
  const [offline, setOffline] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(registration => {
          if (registration.waiting) setStatus('An app update is ready. Finish your work, then close all app windows and reopen.');
        })
        .catch(() => setStatus('Offline support is unavailable. You can continue using the online app.'));
    }
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  if (!offline && !status) return null;
  return <aside role="status" className="course-pwa-status">{offline ? 'Offline: patient data may be stale. Saves are not queued. Reconnect and confirm each change.' : status}</aside>;
}
