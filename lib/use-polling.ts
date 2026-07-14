"use client";

import { useEffect, useRef } from "react";

export const STATUS_POLL_MS = 60_000;

export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const tick = () => {
      void callbackRef.current();
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
}
