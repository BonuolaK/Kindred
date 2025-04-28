import { useState, useEffect, useRef } from 'react';
import { CallStatus, useCallSignaling } from '@/hooks/use-call-signaling';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  CheckCircle2,
  XCircle,
  Phone as PhoneIcon,
  Timer,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserAvatar from '@/components/user-avatar';
import { formatSecondsToTime } from '@/lib/utils';
import { useRtcTestCall } from '@/hooks/use-rtc-test-call';
import { useToast } from '@/hooks/use-toast';

interface CallDialogProps {
  matchId: number;
  otherUserId: number;
  otherUserName: string;
  callDay: number;
  isOpen: boolean;
  onClose: () => void;
  avatar?: string;
  arePhotosRevealed?: boolean;
}

export function CallDialog({
  matchId,
  otherUserId,
  otherUserName,
  callDay,
  isOpen,
  onClose,
  avatar,
  arePhotosRevealed = false
}: CallDialogProps) {
  const { toast } = useToast();
  const {
    callStatus,
    currentCall,
    error,
    isConnected,
    startCall,
    answerCall,
    rejectCall,
    endCall
  } = useCallSignaling();
  
  // RTC test call handling
  const {
    callState,
    error: rtcError,
    isMuted,
    timeRemaining,
    setAudioElements,
    toggleMute,
    startCall: startRtcCall,
    answerCall: answerRtcCall,
    endCall: endRtcCall,
    formatTimeRemaining,
  } = useRtcTestCall();
  
  const [timerValue, setTimerValue] = useState(0);
  const [maxTime, setMaxTime] = useState(300); // 5 minutes default
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for audio elements
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  // Connect audio elements to RTC
  useEffect(() => {
    setAudioElements(localAudioRef.current, remoteAudioRef.current);
  }, [setAudioElements]);
  
  // Set timer based on call day
  useEffect(() => {
    // Call day 1: 5 minutes, day 2: 10 minutes, day 3+: 20 minutes
    const timeLimits = [300, 600, 1200];
    const timeLimit = timeLimits[Math.min(callDay - 1, 2)];
    setMaxTime(timeLimit);
  }, [callDay]);
  
  // Start the call when dialog opens
  useEffect(() => {
    if (isOpen && callStatus === 'idle') {
      startCall(matchId, otherUserId, otherUserName, callDay);
    }
  }, [isOpen, callStatus, startCall, matchId, otherUserId, otherUserName, callDay]);
  
  // Handle call state changes
  useEffect(() => {
    if (callStatus === 'active') {
      // Start RTC call when signaling is active
      startRtcCall(matchId, otherUserId, callDay);
      
      // Start timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      setTimerValue(0);
      timerRef.current = setInterval(() => {
        setTimerValue(prev => {
          if (prev >= maxTime) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            endCall();
            return maxTime;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (callStatus === 'connecting') {
      // Getting ready for the call
    } else if (callStatus === 'ringing') {
      // Incoming call, wait for user to answer or reject
      toast({
        title: 'Incoming Call',
        description: `${otherUserName} is calling you`,
        duration: 10000,
      });
    } else if (callStatus === 'ended' || callStatus === 'rejected' || callStatus === 'missed' || callStatus === 'error') {
      // Clean up
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Close dialog after short delay
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus, startRtcCall, matchId, otherUserId, callDay, maxTime, endCall, onClose, otherUserName, toast]);
  
  // Handle RTC call state changes
  useEffect(() => {
    if (callState === 'active' && callStatus !== 'active') {
      // Update signaling state based on RTC state
    }
  }, [callState, callStatus]);
  
  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (callStatus !== 'idle') {
        endCall();
      }
    };
  }, [endCall, callStatus]);
  
  // Render call UI based on state
  const renderCallContent = () => {
    switch (callStatus) {
      case 'calling':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <div className="animate-pulse">
              <UserAvatar
                username={otherUserName}
                avatar={avatar}
                size="lg"
                showStatus={false}
              />
            </div>
            <div className="text-xl font-semibold">{otherUserName}</div>
            <div className="text-muted-foreground">Calling...</div>
            <div className="flex gap-4 mt-4">
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-12 w-12 rounded-full"
                onClick={() => endCall()}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        );
        
      case 'ringing':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <div className="animate-pulse">
              <UserAvatar
                username={otherUserName}
                avatar={avatar}
                size="lg"
                showStatus={false}
              />
            </div>
            <div className="text-xl font-semibold">{otherUserName}</div>
            <div className="text-muted-foreground">Incoming call...</div>
            <div className="flex gap-4 mt-4">
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-12 w-12 rounded-full"
                onClick={() => rejectCall()}
              >
                <XCircle className="h-6 w-6" />
              </Button>
              <Button 
                variant="success" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700"
                onClick={() => answerCall()}
              >
                <CheckCircle2 className="h-6 w-6" />
              </Button>
            </div>
          </div>
        );
        
      case 'connecting':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <div className="animate-pulse">
              <UserAvatar
                username={otherUserName}
                avatar={avatar}
                size="lg"
                showStatus={false}
              />
            </div>
            <div className="text-xl font-semibold">{otherUserName}</div>
            <div className="text-muted-foreground">Connecting call...</div>
            <Progress value={50} className="w-56" />
          </div>
        );
        
      case 'active':
        return (
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <UserAvatar
              username={otherUserName}
              avatar={avatar}
              size="lg"
              showStatus={false}
            />
            <div className="text-xl font-semibold">{otherUserName}</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>{formatSecondsToTime(timerValue)}</span>
            </div>
            <Progress 
              value={(timerValue / maxTime) * 100} 
              className="w-56 mt-2"
            />
            <div className="flex gap-4 mt-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-12 w-12 rounded-full"
                onClick={() => endCall()}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        );
        
      case 'ended':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <UserAvatar
              username={otherUserName}
              avatar={avatar}
              size="lg"
              showStatus={false}
            />
            <div className="text-xl font-semibold">{otherUserName}</div>
            <div className="text-muted-foreground">Call ended</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>{formatSecondsToTime(timerValue)}</span>
            </div>
          </div>
        );
        
      case 'missed':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <UserAvatar
              username={otherUserName}
              avatar={avatar}
              size="lg"
              showStatus={false}
              className="opacity-70"
            />
            <div className="text-xl font-semibold">{otherUserName}</div>
            <div className="text-muted-foreground">Call was not answered</div>
          </div>
        );
        
      case 'rejected':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <UserAvatar
              username={otherUserName}
              avatar={avatar}
              size="lg"
              showStatus={false}
              className="opacity-70"
            />
            <div className="text-xl font-semibold">{otherUserName}</div>
            <div className="text-muted-foreground">Call rejected</div>
          </div>
        );
        
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <div className="text-destructive">
              <AlertCircle className="h-12 w-12" />
            </div>
            <div className="text-xl font-semibold">Error</div>
            <div className="text-muted-foreground">{error || "An error occurred with the call"}</div>
          </div>
        );
        
      default:
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <UserAvatar
              username={otherUserName}
              avatar={avatar}
              size="lg"
              showStatus={false}
            />
            <div className="text-xl font-semibold">{otherUserName}</div>
            <div className="text-muted-foreground">Preparing call...</div>
          </div>
        );
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {callStatus === 'ringing' ? 'Incoming Call' : 'Call'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {callStatus === 'active' ? 'Call in progress' : 
             callStatus === 'calling' ? 'Calling...' :
             callStatus === 'ringing' ? 'Someone is calling you' :
             callStatus === 'connecting' ? 'Connecting...' :
             callStatus === 'ended' ? 'Call ended' :
             callStatus === 'missed' ? 'Call missed' :
             callStatus === 'rejected' ? 'Call rejected' :
             callStatus === 'error' ? 'Call error' :
             'Audio call'}
          </DialogDescription>
        </DialogHeader>
        
        {renderCallContent()}
        
        {/* Audio Elements */}
        <audio ref={localAudioRef} muted className="hidden" />
        <audio ref={remoteAudioRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}