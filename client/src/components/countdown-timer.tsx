import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface CountdownTimerProps {
  expiryDate: Date;
  isExpiringSoon: boolean;
  pawnId: string;
}

export default function CountdownTimer({ expiryDate, isExpiringSoon, pawnId }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    percentage: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, percentage: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = expiryDate.getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const totalDuration = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
        const elapsed = totalDuration - difference;
        const percentage = Math.min((elapsed / totalDuration) * 100, 100);

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds, percentage });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, percentage: 100 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiryDate]);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  const timeString = `${timeLeft.days} days ${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-muted-foreground">Time Remaining:</span>
        <span
          className={`text-sm font-medium countdown-timer ${
            isExpiringSoon ? "text-destructive pulse-animation" : ""
          }`}
          data-testid={`countdown-${pawnId}`}
        >
          {timeString}
        </span>
      </div>
      <Progress
        value={timeLeft.percentage}
        className="w-full h-2"
        data-testid={`progress-${pawnId}`}
      />
    </div>
  );
}
