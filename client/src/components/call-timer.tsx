import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

type CallTimerProps = {
  callDay: number;
  isActive: boolean;
  onTimeEnd: () => void;
};

export default function CallTimer({ callDay, isActive, onTimeEnd }: CallTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // Calculate total time based on call day (in seconds)
  const getTotalTime = () => {
    switch (callDay) {
      case 1: return 300; // 5 minutes
      case 2: return 600; // 10 minutes
      case 3: return 1200; // 20 minutes
      default: return 1800; // 30 minutes
    }
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Initialize timer on component mount or when call day changes
  useEffect(() => {
    setTimeRemaining(getTotalTime());
  }, [callDay]);
  
  // Countdown timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // Time's up!
            if (interval) clearInterval(interval);
            onTimeEnd();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (timeRemaining <= 0 && interval) {
      clearInterval(interval);
      onTimeEnd();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, onTimeEnd]);
  
  // Calculate progress percentage
  const progress = (timeRemaining / getTotalTime()) * 100;
  
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="text-2xl font-heading font-bold mb-2 text-center">
        {formatTime(timeRemaining)}
      </div>
      <div className="text-sm text-center mb-2">
        Day {callDay}: {callDay === 1 ? '5 minute' : callDay === 2 ? '10 minute' : callDay === 3 ? '20 minute' : '30 minute'} limit
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}