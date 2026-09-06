import { useCallback, useEffect, useRef, useState } from 'react';

const SESSION_DURATION_MS = 30 * 60 * 1000;   // 30 minutes
const WARNING_BEFORE_MS   =  2 * 60 * 1000;   // warn at 28 min (2 min left)
const SESSION_START_KEY   = 'dealflow.sessionStart';

export function useSessionTimer(
  authenticated: boolean,
  onLogout: () => void,
) {
  const [msLeft, setMsLeft] = useState<number>(SESSION_DURATION_MS);
  const [showWarning, setShowWarning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Record session start time on login
  useEffect(() => {
    if (!authenticated) {
      // Clear on logout
      sessionStorage.removeItem(SESSION_START_KEY);
      setShowWarning(false);
      setMsLeft(SESSION_DURATION_MS);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Restore or create session start
    const stored = sessionStorage.getItem(SESSION_START_KEY);
    if (!stored) {
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
    }

    intervalRef.current = setInterval(() => {
      const start = Number(sessionStorage.getItem(SESSION_START_KEY) ?? Date.now());
      const elapsed = Date.now() - start;
      const remaining = SESSION_DURATION_MS - elapsed;

      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        sessionStorage.removeItem(SESSION_START_KEY);
        onLogout();
        return;
      }

      setMsLeft(remaining);
      setShowWarning(remaining <= WARNING_BEFORE_MS);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authenticated, onLogout]);

  const extendSession = useCallback(() => {
    sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
    setMsLeft(SESSION_DURATION_MS);
    setShowWarning(false);
  }, []);

  // Format mm:ss
  const minutes = Math.floor(msLeft / 60000);
  const seconds = Math.floor((msLeft % 60000) / 1000);
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { msLeft, showWarning, formatted, extendSession };
}
