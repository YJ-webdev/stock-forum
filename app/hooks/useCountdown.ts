"use client";

import { useEffect, useRef, useState } from "react";

interface CountdownState {
  hours: string;
  minutes: string;
  seconds: string;
  isExpired: boolean;
}

const INITIAL_STATE: CountdownState = {
  hours: "00",
  minutes: "00",
  seconds: "00",
  isExpired: false,
};

export function useCountdown(
  targetDate: Date | string | number | null,
  onExpire?: () => void,
) {
  const [timeLeft, setTimeLeft] = useState<CountdownState>(INITIAL_STATE);

  const onExpireRef = useRef(onExpire);
  const expiredTargetRef = useRef<number | null>(null);

  const targetMs =
    targetDate === null
      ? null
      : targetDate instanceof Date
        ? targetDate.getTime()
        : new Date(targetDate).getTime();

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (targetMs === null || !Number.isFinite(targetMs)) {
      expiredTargetRef.current = null;
      setTimeLeft(INITIAL_STATE);
      return;
    }

    let timer: number | null = null;

    function updateCountdown() {
      const difference = targetMs! - Date.now();
      const isExpired = difference <= 0;
      const totalSeconds = Math.max(0, Math.floor(difference / 1000));

      const next: CountdownState = {
        hours: String(Math.floor(totalSeconds / 3600)).padStart(2, "0"),
        minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(
          2,
          "0",
        ),
        seconds: String(totalSeconds % 60).padStart(2, "0"),
        isExpired,
      };

      setTimeLeft((previous) =>
        previous.hours === next.hours &&
        previous.minutes === next.minutes &&
        previous.seconds === next.seconds &&
        previous.isExpired === next.isExpired
          ? previous
          : next,
      );

      if (isExpired) {
        if (expiredTargetRef.current !== targetMs) {
          expiredTargetRef.current = targetMs;
          onExpireRef.current?.();
        }
        return;
      }

      expiredTargetRef.current = null;
      timer = window.setTimeout(updateCountdown, 1000);
    }

    updateCountdown();

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [targetMs]);

  return timeLeft;
}
