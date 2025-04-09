import { useState, useEffect } from "react";
import { Match, User } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import UserAvatar from "./user-avatar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type SimpleCallInterfaceProps = {
  match: Match & { otherUser?: Partial<User> };
  userId: number;
  onCallEnded?: () => void;
};

export default function SimpleCallInterface({ match, userId, onCallEnded }: SimpleCallInterfaceProps) {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get the other user ID
  const otherUserId = match.userId1 === userId ? match.userId2 : match.userId1;
  
  // Calculate call day
  const callDay = match.callCount + 1;
  
  // Calculate time limit based on call day
  const getTimeLimit = () => {
    switch (callDay) {
      case 1: return 5 * 60; // 5 minutes
      case 2: return 10 * 60; // 10 minutes
      default: return 20 * 60; // 20 minutes
    }
  };
  
  const timeLimit = getTimeLimit();
  
  // Handle starting the call
  const handleStartCall = async () => {
    try {
      setCallState('calling');
      
      // Create a call log in the database
      const response = await apiRequest("POST", `/api/matches/${match.id}/calls`);
      const callData = await response.json();
      
      console.log("Call created:", callData);
      
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/matches', match.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      
      // Simulate a connection - in a real app we'd connect to the other user
      setTimeout(() => {
        setCallState('connected');
        toast({
          title: "Call Connected",
          description: "You are now connected with " + match.otherUser?.username
        });
      }, 2000);
      
    } catch (error) {
      console.error("Failed to start call:", error);
      toast({
        title: "Call Failed",
        description: "Could not establish the call. Please try again.",
        variant: "destructive"
      });
      setCallState('idle');
    }
  };
  
  // Handle ending the call
  const handleEndCall = async () => {
    try {
      // Record call ended in database
      await apiRequest("PUT", `/api/calls/${match.id}/end`, {
        duration: elapsedTime
      });
      
      // Update UI
      setCallState('ended');
      
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/matches', match.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      
      toast({
        title: "Call Ended",
        description: "Your call has ended."
      });
      
      // Notify parent component
      if (onCallEnded) {
        onCallEnded();
      }
    } catch (error) {
      console.error("Failed to end call:", error);
      toast({
        title: "Error",
        description: "Failed to end call properly.",
        variant: "destructive"
      });
    }
  };
  
  // Update elapsed time
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (callState === 'connected') {
      intervalId = window.setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          // Auto-end call when time limit is reached
          if (newTime >= timeLimit) {
            handleEndCall();
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [callState, timeLimit]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardContent className="p-6 space-y-4">
        <div className="text-center mb-4">
          <div className="mx-auto relative w-24 h-24 mb-4">
            <UserAvatar 
              user={match.otherUser} 
              size="xl" 
              showBadge={callState === 'connected'}
              showPhoto={match.arePhotosRevealed === true}
            />
            
            {callState === 'calling' && (
              <div className="absolute -top-2 -right-2 animate-ping">
                <span className="flex h-4 w-4 rounded-full bg-primary opacity-75"></span>
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-bold">
            {match.otherUser?.username || 'Your Match'}
          </h2>
          
          {callState === 'idle' && (
            <p className="text-muted-foreground mt-2">
              Press Call to connect with your match
            </p>
          )}
          
          {callState === 'calling' && (
            <div className="flex items-center justify-center mt-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Connecting...</span>
            </div>
          )}
          
          {callState === 'connected' && (
            <div className="space-y-2 mt-4">
              <div className="text-2xl font-bold">
                {formatTime(elapsedTime)} / {formatTime(timeLimit)}
              </div>
              <div className="flex h-2 bg-gray-200 rounded overflow-hidden">
                <div 
                  className="bg-primary"
                  style={{ width: `${(elapsedTime / timeLimit) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Call {callDay}: {callDay === 1 ? '5 minutes' : callDay === 2 ? '10 minutes' : '20 minutes'} limit
              </p>
            </div>
          )}
          
          {callState === 'ended' && (
            <p className="text-muted-foreground mt-2">
              Call has ended. Duration: {formatTime(elapsedTime)}
            </p>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-center pb-6">
        {callState === 'idle' && (
          <Button 
            className="px-8 py-2"
            onClick={handleStartCall}
          >
            <Phone className="h-5 w-5 mr-2" />
            Call
          </Button>
        )}
        
        {callState === 'calling' && (
          <Button 
            variant="destructive"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            Cancel
          </Button>
        )}
        
        {callState === 'connected' && (
          <Button 
            variant="destructive"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            End Call
          </Button>
        )}
        
        {callState === 'ended' && (
          <Button 
            variant="outline"
            onClick={onCallEnded}
          >
            Return to Matches
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}