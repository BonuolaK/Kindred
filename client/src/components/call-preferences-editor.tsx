import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeSlotPicker } from "./time-slot-picker";
import { DayAvailabilitySelect } from "./day-availability-select";
import { callPreferencesSchema } from "@shared/schema";
import { z } from "zod";
import { cn } from "@/lib/utils";

type CallPreferences = z.infer<typeof callPreferencesSchema>;

type CallPreferencesEditorProps = {
  value: CallPreferences | undefined;
  onChange: (value: CallPreferences) => void;
  className?: string;
};

export function CallPreferencesEditor({ value = {}, onChange, className }: CallPreferencesEditorProps) {
  // Initialize with the provided value or empty arrays
  const [preferences, setPreferences] = useState<CallPreferences>({
    weekdays: value.weekdays || [],
    weekends: value.weekends || [],
    notAvailable: value.notAvailable || [],
  });

  const updatePreferences = (partialUpdate: Partial<CallPreferences>) => {
    const updatedPreferences = {
      ...preferences,
      ...partialUpdate,
    };
    setPreferences(updatedPreferences);
    onChange(updatedPreferences);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Preferred Call Times</CardTitle>
        <CardDescription>
          Set your preferred times for audio calls. This helps other users schedule calls with you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <TimeSlotPicker
          dayType="weekdays"
          value={preferences.weekdays || []}
          onChange={(weekdays) => updatePreferences({ weekdays })}
        />
        
        <TimeSlotPicker
          dayType="weekends" 
          value={preferences.weekends || []}
          onChange={(weekends) => updatePreferences({ weekends })}
        />
        
        <DayAvailabilitySelect
          value={preferences.notAvailable || []}
          onChange={(notAvailable) => updatePreferences({ notAvailable })}
        />
      </CardContent>
    </Card>
  );
}