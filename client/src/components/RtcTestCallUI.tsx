import { useState, useEffect, useRef } from 'react';
import { useRtcTestCall, RtcCallState } from '@/hooks/use-rtc-test-call';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import UserAvatar from '@/components/user-avatar';

// Use a simplified user type for the UI component
type SimpleUser = {
  id: number;
  username: string;
  avatar?: string;
  [key: string]: any;
};

interface RtcTestCallUIProps {
  matchId: number;
  otherUserId: number;
  otherUserName: string;
  otherUser?: SimpleUser;
  callDay: number;
  onClose: () => void;
  isIncoming?: boolean;
  autoStart?: boolean;
  arePhotosRevealed?: boolean;
}

export function RtcTestCallUI({
  matchId,
  otherUserId,
  otherUserName,
  otherUser,
  callDay,
  onClose,
  isIncoming = false,
  autoStart = true,
  arePhotosRevealed = false
}: RtcTestCallUIProps) {
  const {
    callState,
    error,
    isMuted,
    timeRemaining,
    setAudioElements,
    toggleMute,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    formatTimeRemaining,
    onCallStateChange
  } = useRtcTestCall();
  
  const [logs, setLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  // Connect audio elements
  useEffect(() => {
    setAudioElements(localAudioRef.current, remoteAudioRef.current);
  }, [setAudioElements]);
  
  // Auto-start call if specified
  useEffect(() => {
    const initCall = async () => {
      if (autoStart && !isIncoming) {
        try {
          addLog(`Starting call to ${otherUserName} (ID: ${otherUserId})`);
          const result = await startCall(matchId, otherUserId, callDay);
          
          if (result) {
            addLog('Call started successfully');
          } else {
            addLog('Failed to start call');
          }
        } catch (err) {
          addLog(`Error starting call: ${err}`);
        }
      }
    };
    
    // Small delay to make sure everything is setup
    const timer = setTimeout(initCall, 500);
    return () => clearTimeout(timer);
  }, [autoStart, isIncoming, startCall, matchId, otherUserId, callDay, otherUserName]);
  
  // Handle call state changes
  useEffect(() => {
    const unsubscribe = onCallStateChange((state) => {
      addLog(`Call state changed to: ${state}`);
      
      // Handle call ending
      if (state === 'ended') {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    });
    
    return unsubscribe;
  }, [onCallStateChange, onClose]);
  
  // Add a log message
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  // Call state-specific UI components
  const renderCallActions = () => {
    if (callState === 'idle') {
      return (
        <Button 
          onClick={() => startCall(matchId, otherUserId, callDay)} 
          className="bg-[#9B1D54] hover:bg-[#9B1D54]/90 text-white"
        >
          <Phone className="mr-2 h-4 w-4" />
          Start Call
        </Button>
      );
    }
    
    if (callState === 'ringing' && isIncoming) {
      return (
        <div className="flex gap-3">
          <Button 
            onClick={() => rejectCall()} 
            variant="outline" 
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            <PhoneOff className="mr-2 h-4 w-4" />
            Decline
          </Button>
          <Button 
            onClick={() => answerCall()} 
            className="bg-[#9B1D54] hover:bg-[#9B1D54]/90 text-white"
          >
            <Phone className="mr-2 h-4 w-4" />
            Answer
          </Button>
        </div>
      );
    }
    
    if (callState === 'connecting' || callState === 'ringing') {
      return (
        <Button 
          onClick={() => endCall()} 
          variant="destructive"
        >
          <PhoneOff className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      );
    }
    
    if (callState === 'connected') {
      return (
        <div className="flex gap-3">
          <Button 
            onClick={() => toggleMute()} 
            variant="outline" 
            className={isMuted ? "border-destructive text-destructive" : ""}
          >
            {isMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
            {isMuted ? "Unmute" : "Mute"}
          </Button>
          <Button 
            onClick={() => endCall()} 
            variant="destructive"
          >
            <PhoneOff className="mr-2 h-4 w-4" />
            End Call
          </Button>
        </div>
      );
    }
    
    if (callState === 'error') {
      return (
        <Button 
          onClick={onClose} 
          variant="destructive"
        >
          Close
        </Button>
      );
    }
    
    if (callState === 'ended') {
      return (
        <Button 
          onClick={onClose} 
          variant="outline"
        >
          Close
        </Button>
      );
    }
    
    return null;
  };
  
  const renderCallStatus = () => {
    switch (callState) {
      case 'idle':
        return 'Ready to call';
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return isIncoming ? 'Incoming call...' : 'Ringing...';
      case 'connected':
        return 'Connected';
      case 'ended':
        return 'Call ended';
      case 'error':
        return `Error: ${error || 'Call failed'}`;
      default:
        return 'Unknown state';
    }
  };
  
  // Calculate progress for the timer
  const calculateProgress = () => {
    const defaultCallTime = callDay === 1 ? 300 : callDay === 2 ? 600 : 1200; // 5, 10 or 20 minutes
    const totalTime = defaultCallTime;
    return ((totalTime - timeRemaining) / totalTime) * 100;
  };
  
  // Toggle debug view
  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };
  
  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col items-center">
          {/* User avatar */}
          <div className="relative mb-4">
            <UserAvatar 
              user={otherUser || { username: otherUserName, id: otherUserId }}
              size="xl"
              showBadge={callState === 'connected'}
              showPhoto={arePhotosRevealed}
            />
            
            {/* Call animation indicator */}
            {(callState === 'connecting' || callState === 'ringing') && (
              <div className="absolute -top-2 -right-2">
                <span className="flex h-4 w-4 rounded-full bg-[#9B1D54] opacity-75 animate-ping"></span>
              </div>
            )}
          </div>
          
          {/* User name */}
          <h3 className="text-xl font-semibold">{otherUserName}</h3>
          
          {/* Call status */}
          <p className="text-muted-foreground mt-1">{renderCallStatus()}</p>
          
          {/* Call timer when connected */}
          {callState === 'connected' && (
            <div className="w-full mt-4 space-y-2">
              <div className="text-center text-2xl font-bold">
                {formatTimeRemaining()}
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Call {callDay}: {callDay === 1 ? '5 minute' : callDay === 2 ? '10 minute' : '20 minute'} limit
              </div>
              <Progress value={calculateProgress()} className="mt-2" />
            </div>
          )}
          
          {/* Audio elements (hidden) */}
          <audio ref={localAudioRef} autoPlay muted className="hidden" />
          <audio ref={remoteAudioRef} autoPlay className="hidden" />
        </div>
      </CardContent>
      
      <CardFooter className="justify-center flex-col gap-4 p-6 pt-0 border-t">
        {/* Call actions */}
        <div className="flex justify-center">
          {renderCallActions()}
        </div>
        
        {/* Debug toggle */}
        <div className="w-full mt-2">
          <button 
            onClick={toggleDebug}
            className="text-xs text-muted-foreground hover:underline w-full text-center"
          >
            {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>
        </div>
        
        {/* Debug logs */}
        {showDebug && (
          <div className="w-full mt-2 border rounded p-2 text-xs font-mono h-32 overflow-y-auto bg-muted/30">
            {logs.map((log, i) => (
              <div key={i} className="whitespace-nowrap">{log}</div>
            ))}
            {logs.length === 0 && <div className="text-muted-foreground">No logs yet</div>}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}