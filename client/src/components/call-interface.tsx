import { useState, useRef, useEffect } from "react";
import { useAudioCall } from "@/hooks/use-audio-call";
import UserAvatar from "./user-avatar";
import { CallState } from "@/lib/audio-call";
import { Match, User } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { Loader2 } from "lucide-react";

type CallInterfaceProps = {
  match: Match & { otherUser?: Partial<User> };
  onCallEnded?: () => void;
};

export default function CallInterface({ match, onCallEnded }: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Audio element refs
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  // Get call day and otherUserId
  const callDayForMatch = (match.callCount ?? 0) + 1;
  const otherUserId = match.otherUser?.id;
  
  // Get audio call service functions
  const { 
    startCall, 
    answerCall, 
    rejectCall, 
    endCall, 
    getRemoteStream,
    getLocalStream,
    getTimeRemaining,
    mute,
    unmute,
    isCallActive,
    onCallStateChange
  } = useAudioCall();
  
  // Handle leaving/ending call
  const handleLeaveCall = () => {
    endCall();
    if (onCallEnded) {
      onCallEnded();
    }
  };
  
  // Initialize call state listener
  useEffect(() => {
    // Subscribe to call state changes using the same hook instance
    const unsubscribe = onCallStateChange((state: CallState) => {
      console.log("Call state changed:", state);
      setCallState(state);
      
      // If call ended, notify parent component
      if (state === 'ended' && onCallEnded) {
        onCallEnded();
      }
    });
    
    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [onCallStateChange, onCallEnded]);
  
  // Connect audio streams to audio elements
  useEffect(() => {
    // Set up local audio
    const localStream = getLocalStream();
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
    }
    
    // Set up remote audio
    const remoteStream = getRemoteStream();
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [callState, getLocalStream, getRemoteStream]);
  
  // Update time remaining
  useEffect(() => {
    if (callState === 'connected') {
      const intervalId = setInterval(() => {
        setTimeRemaining(getTimeRemaining());
      }, 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [callState, getTimeRemaining]);
  
  // Toggle mute state
  const toggleMute = () => {
    if (isMuted) {
      unmute();
      setIsMuted(false);
    } else {
      mute();
      setIsMuted(true);
    }
  };
  
  // Format time remaining as MM:SS
  const formattedTimeRemaining = (() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  })();
  
  // Calculate progress percentage
  const calculateProgress = () => {
    // Time limits for different call days (in seconds)
    const timeLimits: Record<number, number> = {
      1: 300, // 5 minutes
      2: 600, // 10 minutes
      3: 1200, // 20 minutes
      4: 1800, // 30 minutes
    };
    
    const totalTime = timeLimits[callDayForMatch] || timeLimits[4];
    return (timeRemaining / totalTime) * 100;
  };
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardContent className="space-y-4 pt-6">
        <h2 className="text-2xl font-bold text-center mb-4">
          Call with {match.otherUser?.username || 'Match'}
        </h2>
        
        {/* Avatar display */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <UserAvatar 
            user={match.otherUser} 
            size="xl" 
            showBadge={callState === 'connected'}
            showPhoto={match.arePhotosRevealed === true}
          />
          
          {(callState === 'connecting' || callState === 'ringing') && (
            <div className="absolute -top-2 -right-2 animate-ping">
              <span className="flex h-4 w-4 rounded-full bg-primary opacity-75"></span>
            </div>
          )}
        </div>
        
        {/* Status and timer */}
        <div className="text-center">
          {callState === 'connected' ? (
            <div className="space-y-2">
              <div className="text-2xl font-heading font-bold">
                {formattedTimeRemaining}
              </div>
              <div className="text-sm text-gray-500">
                Call {callDayForMatch}: {callDayForMatch === 1 ? '5 minute' : callDayForMatch === 2 ? '10 minute' : '20 minute'} limit
              </div>
              <Progress value={calculateProgress()} className="w-full max-w-xs mt-2" />
            </div>
          ) : (
            <div className="h-12 flex items-center justify-center">
              {callState === 'connecting' && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
              {callState === 'connecting' && 'Connecting...'}
              {callState === 'ringing' && 'Ringing...'}
              {callState === 'ended' && 'Call has ended'}
            </div>
          )}
        </div>
        
        {/* Audio elements (hidden) */}
        <audio ref={remoteAudioRef} autoPlay playsInline />
        <audio ref={localAudioRef} autoPlay playsInline muted />
      </CardContent>
      
      <CardFooter className="flex justify-center space-x-4">
        {/* Call controls */}
        {callState === 'connected' && (
          <Button 
            variant={isMuted ? "destructive" : "outline"} 
            size="icon" 
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        )}
        
        {(callState === 'ringing' && match.otherUser?.id) ? (
          <>
            <Button 
              variant="destructive" 
              size="icon"
              onClick={() => rejectCall(match.id, match.otherUser?.id!)}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button 
              variant="default" 
              size="icon"
              onClick={() => answerCall(match.id, match.otherUser?.id!, callDayForMatch)}
            >
              <Phone className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <Button 
            variant="destructive" 
            onClick={handleLeaveCall}
            disabled={callState === 'idle' || callState === 'ended'}
          >
            {callState === 'connected' ? 'End Call' : 'Cancel'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}