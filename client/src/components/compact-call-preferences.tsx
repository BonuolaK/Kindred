import { callPreferencesSchema } from "@shared/schema";
import { z } from "zod";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type CallPreferences = z.infer<typeof callPreferencesSchema>;
type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type CompactCallPreferencesProps = {
  preferences: CallPreferences | undefined;
  className?: string;
};

const dayLabels: Record<Day, string> = {
  monday: 'M',
  tuesday: 'T',
  wednesday: 'W',
  thursday: 'T',
  friday: 'F',
  saturday: 'S',
  sunday: 'S',
};

// Function to check if current time falls within any of the user's available slots
function isAvailableNow(preferences: CallPreferences): { available: boolean; soon: boolean } {
  if (!preferences) return { available: false, soon: false };
  
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  // Map JavaScript day (0-6) to our day names
  const dayMap: Record<number, Day> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };
  
  const todayName = dayMap[day];
  
  // Check if today is marked as unavailable
  if (preferences.notAvailable?.includes(todayName)) {
    return { available: false, soon: false };
  }
  
  // Determine if it's a weekday or weekend
  const isWeekend = day === 0 || day === 6;
  const slots = isWeekend ? preferences.weekends : preferences.weekdays;
  
  // Check if current time falls within any slot
  const available = slots?.some(slot => {
    return currentTime >= slot.start && currentTime <= slot.end;
  }) || false;
  
  // Check if there's a slot coming up in the next hour
  const soonTime = new Date(now.getTime() + 60 * 60 * 1000);
  const soonHour = soonTime.getHours();
  const soonMinute = soonTime.getMinutes();
  const oneHourLater = `${soonHour.toString().padStart(2, '0')}:${soonMinute.toString().padStart(2, '0')}`;
  
  const soon = slots?.some(slot => {
    return currentTime < slot.start && oneHourLater >= slot.start;
  }) || false;
  
  return { available, soon };
}

function formatTimeRange(preferences: CallPreferences): string {
  if (!preferences) return "No preferred times";
  
  const formatTimeSimple = (time24: string): string => {
    try {
      const [hour] = time24.split(':').map(Number);
      if (isNaN(hour)) return time24;
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      
      return `${hour12}${period}`;
    } catch (e) {
      return time24;
    }
  };
  
  // Combine and sort all time slots by start time
  const allSlots = [
    ...(preferences.weekdays?.map(slot => ({ ...slot, type: 'Weekdays' })) || []),
    ...(preferences.weekends?.map(slot => ({ ...slot, type: 'Weekends' })) || [])
  ].sort((a, b) => a.start.localeCompare(b.start));
  
  if (allSlots.length === 0) return "Flexible";
  
  // Take the earliest and latest slots to create a range
  const earliest = allSlots[0];
  const latest = allSlots[allSlots.length - 1];
  
  return `${earliest.type} ${formatTimeSimple(earliest.start)}-${formatTimeSimple(latest.end)}`;
}

export function CompactCallPreferences({ preferences, className }: CompactCallPreferencesProps) {
  if (!preferences || 
      (!preferences.weekdays?.length && !preferences.weekends?.length && !preferences.notAvailable?.length)) {
    return (
      <div className={cn("text-xs text-muted-foreground flex items-center gap-1", className)}>
        <Clock className="h-3 w-3" />
        <span>Flexible availability</span>
      </div>
    );
  }

  const { available, soon } = isAvailableNow(preferences);
  const timeRange = formatTimeRange(preferences);
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "h-2.5 w-2.5 rounded-full",
        available ? "bg-green-500" : soon ? "bg-amber-500" : "bg-gray-300"
      )} />
      <span className="text-xs font-medium">
        {available ? "Available now" : soon ? "Available soon" : timeRange}
      </span>
    </div>
  );
}