import { useEffect, useRef, useState } from "react";

function remainingMilliseconds(expiresAt: string): number {
  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) ? Math.max(0, expiresAtMs - Date.now()) : 0;
}

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minuteSecond = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${minuteSecond} remaining` : `${minuteSecond} remaining`;
}

interface HoldCountdownProps {
  expiresAt: string;
  onElapsed?: () => void;
}

export function HoldCountdown({ expiresAt, onElapsed }: HoldCountdownProps) {
  const [remaining, setRemaining] = useState(() => remainingMilliseconds(expiresAt));
  const notifiedElapsed = useRef(false);

  useEffect(() => {
    notifiedElapsed.current = false;
    const update = () => setRemaining(remainingMilliseconds(expiresAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (remaining === 0 && !notifiedElapsed.current) {
      notifiedElapsed.current = true;
      onElapsed?.();
    }
  }, [onElapsed, remaining]);

  return <time aria-live="polite" dateTime={expiresAt} className="font-semibold text-slate-900">{remaining === 0 ? "Time elapsed" : formatRemaining(remaining)}</time>;
}
