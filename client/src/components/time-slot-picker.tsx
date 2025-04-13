import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { timeSlotSchema } from "@shared/schema";
import { z } from "zod";

type TimeSlot = z.infer<typeof timeSlotSchema>;

type TimeSlotPickerProps = {
  value: TimeSlot[];
  onChange: (value: TimeSlot[]) => void;
  dayType: "weekdays" | "weekends";
};

export function TimeSlotPicker({ value = [], onChange, dayType }: TimeSlotPickerProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const addTimeSlot = () => {
    if (!startTime || !endTime) {
      setError("Please provide both start and end time");
      return;
    }

    // Convert to 24-hour format for validation and storage
    // Re-validate time format
    try {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      if (
        isNaN(startHour) || isNaN(startMinute) || 
        isNaN(endHour) || isNaN(endMinute) ||
        startHour < 0 || startHour > 23 ||
        endHour < 0 || endHour > 23 ||
        startMinute < 0 || startMinute > 59 ||
        endMinute < 0 || endMinute > 59
      ) {
        setError("Invalid time format");
        return;
      }

      // Check if end time is after start time
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      if (endMinutes <= startMinutes) {
        setError("End time must be after start time");
        return;
      }
      
      // Add the new time slot
      const newSlot: TimeSlot = {
        start: startTime,
        end: endTime
      };
      
      // Check for overlap with existing slots
      const hasOverlap = value.some(slot => {
        const existingStart = slot.start.split(':').map(Number);
        const existingEnd = slot.end.split(':').map(Number);
        const existingStartMinutes = existingStart[0] * 60 + existingStart[1];
        const existingEndMinutes = existingEnd[0] * 60 + existingEnd[1];
        
        // Check for overlap
        return (
          (startMinutes >= existingStartMinutes && startMinutes < existingEndMinutes) ||
          (endMinutes > existingStartMinutes && endMinutes <= existingEndMinutes) ||
          (startMinutes <= existingStartMinutes && endMinutes >= existingEndMinutes)
        );
      });
      
      if (hasOverlap) {
        setError("This time slot overlaps with an existing slot");
        return;
      }
      
      onChange([...value, newSlot]);
      setStartTime("");
      setEndTime("");
      setError(null);
    } catch (e) {
      setError("Invalid time format");
    }
  };

  const removeTimeSlot = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">
          {dayType === "weekdays" ? "Weekday" : "Weekend"} Availability
        </h3>
        
        <div className="flex flex-col space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`${dayType}-start-time`}>Start Time</Label>
              <Input
                id={`${dayType}-start-time`}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`${dayType}-end-time`}>End Time</Label>
              <Input
                id={`${dayType}-end-time`}
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <Button 
              type="button" 
              size="sm" 
              variant="outline" 
              className="flex items-center" 
              onClick={addTimeSlot}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Time Slot
            </Button>
            {error && <p className="text-sm text-destructive ml-3">{error}</p>}
          </div>
        </div>
      </div>
      
      {value.length > 0 && (
        <div className="space-y-2">
          <Label>Available Time Slots</Label>
          <div className="flex flex-wrap gap-2">
            {value.map((slot, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1 h-7">
                {formatTime(slot.start)} - {formatTime(slot.end)}
                <button 
                  type="button" 
                  onClick={() => removeTimeSlot(index)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}