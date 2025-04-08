import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { calculateCallDuration, formatCallDuration } from "@/lib/utils";

type CallTimerProps = {
  callDay: number;
  isActive: boolean;
  onTimeEnd: () => void;
};

export default function CallTimer({ callDay, isActive, onTimeEnd }: CallTimerProps) {
  const totalDuration = calculateCallDuration(callDay);
  const [timeRemaining, setTimeRemaining] = useState(totalDuration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Progress as percentage
  const progress = ((totalDuration - timeRemaining) / totalDuration) * 100;

  useEffect(() => {
    // Reset timer when callDay changes
    setTimeRemaining(totalDuration);
  }, [callDay, totalDuration]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            onTimeEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, onTimeEnd]);

  return (
    <div className="w-full">
      <div className="text-center mb-2">
        <div className="font-heading font-bold text-5xl">
          {formatCallDuration(timeRemaining)}
        </div>
        <p className="text-white/80 text-lg mt-1">minutes remaining</p>
      </div>
      
      <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-white h-full transition-all duration-1000 ease-linear" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-2 text-sm text-white/70">
        <span>0:00</span>
        <span>{formatCallDuration(totalDuration)}</span>
      </div>
    </div>
  );
}
