import { useEffect, useState } from "react";

// useCountdown.ts
export function useCountdown(
  targetDate: Date | string | number,
  onExpire?: () => void,
) {
  const [timeLeft, setTimeLeft] = useState({
    hours: "00",
    minutes: "00",
    seconds: "00",
    isExpired: false,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({
          hours: "00",
          minutes: "00",
          seconds: "00",
          isExpired: true,
        });
        if (onExpire) onExpire(); // 카운트다운 종료 시 부모에게 알림
        return;
      }

      const totalHours = Math.floor(difference / (1000 * 60 * 60));
      const m = Math.floor((difference / (1000 * 60)) % 60);
      const s = Math.floor((difference / 1000) % 60);

      setTimeLeft({
        hours: String(totalHours).padStart(2, "0"),
        minutes: String(m).padStart(2, "0"),
        seconds: String(s).padStart(2, "0"),
        isExpired: false,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  return timeLeft;
}
