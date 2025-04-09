import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAudioCall } from '@/hooks/use-audio-call';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import UserAvatar from '@/components/user-avatar';
import { Progress } from '@/components/ui/progress';
import { Loader2, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Match, User } from '@shared/schema';

type CallInterfaceProps = {
  match: Match & { otherUser?: Partial<User> };
  onCallEnded?: () => void;
};

export default function CallInterface({ match, onCallEnded }: CallInterfaceProps) {
  const [, navigate] = useLocation();
  const [isMuted, setIsMuted] = useState(false);
  const { 
    callState,
    timeRemaining, 
    formattedTimeRemaining,
    callDay,
    startCall, 
    answerCall, 
    rejectCall, 
    endCall,
    remoteAudioRef, 
    localAudioRef 
  } = useAudioCall();
  
  const otherUserId = match.otherUser?.id!;
  const callDayForMatch = match.callCount + 1; // Next call day
  
  // Auto-start call if it's a scheduled call
  useEffect(() => {
    // Only start if we're in idle state and have the necessary info
    if (callState === 'idle' && match && otherUserId) {
      startCall(match.id, otherUserId, callDayForMatch);
    }
  }, [match, otherUserId, callState, startCall, callDayForMatch]);
  
  // Handle call end
  useEffect(() => {
    if (callState === 'ended' && onCallEnded) {
      onCallEnded();
    }
  }, [callState, onCallEnded]);
  
  // Calculate progress for the timer
  const calculateProgress = () => {
    if (callState !== 'connected') return 0;
    
    // Determine the max time based on call day
    let maxTime;
    switch (callDay) {
      case 1: maxTime = 300; break; // 5 minutes
      case 2: maxTime = 600; break; // 10 minutes
      case 3: maxTime = 1200; break; // 20 minutes
      default: maxTime = 1800; break; // 30 minutes
    }
    
    return Math.max(0, Math.min(100, (timeRemaining / maxTime) * 100));
  };
  
  // Toggle mute
  const toggleMute = () => {
    const localStream = localAudioRef.current?.srcObject as MediaStream;
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  // Handle leaving the call
  const handleLeaveCall = () => {
    endCall();
    if (onCallEnded) {
      onCallEnded();
    } else {
      navigate('/matches');
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {callState === 'idle' && 'Starting Call...'}
          {callState === 'connecting' && 'Connecting...'}
          {callState === 'ringing' && 'Call Ringing...'}
          {callState === 'connected' && `Call with ${match.otherUser?.username || 'User'}`}
          {callState === 'ended' && 'Call Ended'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center justify-center space-y-6">
        {/* User avatar */}
        <div className="relative">
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
                Call {callDay}: {callDay === 1 ? '5 minute' : callDay === 2 ? '10 minute' : '20 minute'} limit
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