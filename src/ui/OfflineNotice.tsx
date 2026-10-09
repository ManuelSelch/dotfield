import { useEffect, useState } from 'react';

const NOTICE_DURATION_MS = 3000;

export function OfflineNotice() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [visible, setVisible] = useState(() => !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setVisible(false);
    };
    const handleOffline = () => {
      setOnline(false);
      setVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (online || !visible) return;

    const timeoutId = window.setTimeout(() => setVisible(false), NOTICE_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [online, visible]);

  if (online || !visible) return null;

  return (
    <div className="offline-notice" role="status">
      Offline mode · Your game is saved on this phone
    </div>
  );
}
