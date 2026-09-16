import { useEffect, useState } from "react";

export function useCountdown(
  targetDate: Date | string | number | null,
  onExpire?: () => void,
) {
  const [timeLeft, setTimeLeft] = useState({
    hours: "00",
    minutes: "00",
    seconds: "00",
    isExpired: false,
  });

  useEffect(() => {
    if (targetDate === null) {
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({
          hours: "00",
          minutes: "00",
          seconds: "00",
          isExpired: true,
        });

        onExpire?.();

        return;
      }

      const totalHours = Math.floor(difference / (1000 * 60 * 60));

      const minutes = Math.floor((difference / (1000 * 60)) % 60);

      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({
        hours: String(totalHours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
        isExpired: false,
      });
    };

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [targetDate, onExpire]);

  return timeLeft;
}
