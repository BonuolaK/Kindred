import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Phone } from "lucide-react";
import { useCallSignaling } from "@/hooks/use-call-signaling";
import { useEffect, useState } from "react";

interface CallButtonProps {
  matchId: number;
  otherUserId: number;
  otherUserName: string;
  callDay: number;
  avatar?: string;
  isOnline?: boolean;
  arePhotosRevealed?: boolean;
  className?: string;
}

export function CallButton({
  matchId,
  otherUserId,
  otherUserName,
  callDay,
  avatar,
  isOnline = false,
  arePhotosRevealed = false,
  className = ""
}: CallButtonProps) {
  const { callStatus, initiateCall } = useCallSignaling();
  const [isCallButtonDisabled, setIsCallButtonDisabled] = useState(false);
  
  // Use effect to update button state when call status changes
  useEffect(() => {
    setIsCallButtonDisabled(callStatus !== 'idle' || !isOnline);
  }, [callStatus, isOnline]);
  
  // Handle call initiation
  const handleCall = () => {
    if (isCallButtonDisabled) return;
    
    initiateCall({
      matchId,
      receiverId: otherUserId,
      otherUserId,
      otherUserName,
      callDay,
      avatar,
      arePhotosRevealed
    });
  };
  
  // Determine button color based on status
  const buttonColor = isOnline 
    ? "bg-green-600 hover:bg-green-700 text-white" 
    : "bg-gray-300 text-gray-500 cursor-not-allowed";
  
  // Tooltip message based on status
  const tooltipMessage = !isOnline 
    ? "User is currently offline" 
    : callStatus !== 'idle'
      ? "Already in a call"
      : "Start audio call";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            className={`rounded-full ${buttonColor} ${className}`}
            onClick={handleCall}
            disabled={isCallButtonDisabled}
          >
            <Phone className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}