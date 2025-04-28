import { useCallSignaling } from "@/hooks/use-call-signaling";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, PhoneOff, X } from "lucide-react";
import { useEffect, useState } from "react";

export function CallDialog() {
  const {
    callStatus,
    currentCall,
    acceptCall,
    rejectCall,
    endCall
  } = useCallSignaling();

  // Only show the dialog when there's an active call
  const showDialog = callStatus !== 'idle' && currentCall !== null;

  // State for call timer
  const [callTimer, setCallTimer] = useState(0);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

  // Start timer when call becomes active
  useEffect(() => {
    if (callStatus === 'active') {
      // Clear any existing timer
      if (timerId) clearInterval(timerId);
      
      // Start a new timer
      const id = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
      setTimerId(id);
    } else {
      // Clear timer when call is not active
      if (timerId) {
        clearInterval(timerId);
        setTimerId(null);
      }
      
      // Reset timer when call ends
      if (callStatus === 'idle') {
        setCallTimer(0);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [callStatus, timerId]);

  // Format call timer to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle different call statuses for UI rendering
  const renderCallContent = () => {
    if (!currentCall) return null;

    const { otherUserName, avatar } = currentCall;
    const userInitials = getInitials(otherUserName);

    switch (callStatus) {
      case 'ringing':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Incoming Call</DialogTitle>
              <DialogDescription className="text-center">
                {otherUserName} is calling you
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center my-6">
              <Avatar className="h-24 w-24 mb-4">
                {avatar ? (
                  <img src={avatar} alt={otherUserName} />
                ) : (
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="text-lg font-semibold">{otherUserName}</p>
              <p className="animate-pulse text-sm mt-2">Calling...</p>
            </div>
            
            <DialogFooter className="flex justify-center gap-4 sm:gap-0">
              <Button 
                variant="destructive" 
                className="rounded-full h-14 w-14 p-0"
                onClick={rejectCall}
              >
                <X className="h-6 w-6" />
              </Button>
              <Button 
                variant="default" 
                className="rounded-full h-14 w-14 p-0 bg-green-600 hover:bg-green-700"
                onClick={acceptCall}
              >
                <Phone className="h-6 w-6" />
              </Button>
            </DialogFooter>
          </>
        );
        
      case 'calling':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Calling</DialogTitle>
              <DialogDescription className="text-center">
                Waiting for {otherUserName} to answer...
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center my-6">
              <Avatar className="h-24 w-24 mb-4">
                {avatar ? (
                  <img src={avatar} alt={otherUserName} />
                ) : (
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="text-lg font-semibold">{otherUserName}</p>
              <p className="animate-pulse text-sm mt-2">Ringing...</p>
            </div>
            
            <DialogFooter className="flex justify-center">
              <Button 
                variant="destructive" 
                className="rounded-full h-14 w-14 p-0"
                onClick={endCall}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </DialogFooter>
          </>
        );

      case 'connecting':
      case 'active':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                {callStatus === 'connecting' ? 'Connecting...' : 'Call in Progress'}
              </DialogTitle>
              {callStatus === 'active' && (
                <DialogDescription className="text-center">
                  Call time: {formatTime(callTimer)}
                </DialogDescription>
              )}
            </DialogHeader>
            
            <div className="flex flex-col items-center my-6">
              <Avatar className="h-24 w-24 mb-4">
                {avatar ? (
                  <img src={avatar} alt={otherUserName} />
                ) : (
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="text-lg font-semibold">{otherUserName}</p>
              {callStatus === 'connecting' && (
                <p className="animate-pulse text-sm mt-2">Establishing connection...</p>
              )}
            </div>
            
            <DialogFooter className="flex justify-center">
              <Button 
                variant="destructive" 
                className="rounded-full h-14 w-14 p-0"
                onClick={endCall}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </DialogFooter>
          </>
        );

      case 'ended':
      case 'rejected':
      case 'missed':
        const statusText = callStatus === 'ended' 
          ? 'Call Ended' 
          : callStatus === 'rejected' 
            ? 'Call Rejected' 
            : 'Call Missed';
        
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">{statusText}</DialogTitle>
              <DialogDescription className="text-center">
                {callStatus === 'ended' && currentCall.duration && 
                  `Call duration: ${formatTime(Math.floor(currentCall.duration))}`}
                {callStatus === 'rejected' && 
                  `${otherUserName} rejected the call`}
                {callStatus === 'missed' && 
                  `${otherUserName} didn't answer`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center my-6">
              <Avatar className="h-24 w-24 mb-4">
                {avatar ? (
                  <img src={avatar} alt={otherUserName} />
                ) : (
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="text-lg font-semibold">{otherUserName}</p>
            </div>
          </>
        );

      case 'error':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-red-500">Call Error</DialogTitle>
              <DialogDescription className="text-center">
                {currentCall.errorMessage || 'An error occurred during the call'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center my-6">
              <Avatar className="h-24 w-24 mb-4">
                {avatar ? (
                  <img src={avatar} alt={otherUserName} />
                ) : (
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="text-lg font-semibold">{otherUserName}</p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={() => { /* Prevent manual closure */ }}>
      <DialogContent className="sm:max-w-md">
        {renderCallContent()}
      </DialogContent>
    </Dialog>
  );
}