import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

const IDLE_MS    = 9 * 60 * 1000; // 9 min idle  → show warning
const WARNING_MS = 60;             // 60 s countdown before logout

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown',
  'scroll', 'touchstart', 'click',
] as const;

export function useIdleTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState(WARNING_MS);

  const idleTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningShown = useRef(false);

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const startCountdown = useCallback(() => {
    setCountdown(WARNING_MS);
    clearCountdown();
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          router.post('/logout');
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (warningShown.current) return; // ignore activity while warning is visible

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      warningShown.current = true;
      setShowWarning(true);
      startCountdown();
    }, IDLE_MS);
  }, [startCountdown]);

  // "Stay Logged In" — dismiss warning and restart idle tracking
  const keepAlive = useCallback(() => {
    warningShown.current = false;
    setShowWarning(false);
    clearCountdown();
    setCountdown(WARNING_MS);
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    resetIdleTimer();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      clearCountdown();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetIdleTimer));
    };
  }, [resetIdleTimer]);

  return { showWarning, countdown, keepAlive };
}
