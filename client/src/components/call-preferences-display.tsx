import { callPreferencesSchema } from "@shared/schema";
import { z } from "zod";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CallPreferences = z.infer<typeof callPreferencesSchema>;
type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type CallPreferencesDisplayProps = {
  preferences: CallPreferences | undefined;
  className?: string;
};

const dayLabels: Record<Day, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export function CallPreferencesDisplay({ preferences, className }: CallPreferencesDisplayProps) {
  if (!preferences || 
      (!preferences.weekdays?.length && !preferences.weekends?.length && !preferences.notAvailable?.length)) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        No preferred call times specified
      </div>
    );
  }

  const formatTime = (time24: string): string => {
    try {
      const [hour, minute] = time24.split(':').map(Number);
      if (isNaN(hour) || isNaN(minute)) return time24;
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      
      return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      return time24;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-2">
        {/* Weekday availability */}
        {preferences.weekdays && preferences.weekdays.length > 0 && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Weekday Availability</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {preferences.weekdays.map((slot, index) => (
                  <Badge key={index} variant="secondary">
                    {formatTime(slot.start)} - {formatTime(slot.end)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Weekend availability */}
        {preferences.weekends && preferences.weekends.length > 0 && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Weekend Availability</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {preferences.weekends.map((slot, index) => (
                  <Badge key={index} variant="secondary">
                    {formatTime(slot.start)} - {formatTime(slot.end)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Unavailable days */}
        {preferences.notAvailable && preferences.notAvailable.length > 0 && (
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Unavailable Days</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <TooltipProvider>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                    const isUnavailable = preferences.notAvailable?.includes(day as Day);
                    return (
                      <Tooltip key={day}>
                        <TooltipTrigger asChild>
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs 
                            ${isUnavailable 
                              ? 'bg-red-100 text-red-800 border border-red-200' 
                              : 'bg-green-100 text-green-800 border border-green-200'}`}
                          >
                            {dayLabels[day as Day]}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{isUnavailable ? 'Not Available' : 'Available'}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}