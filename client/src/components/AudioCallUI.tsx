// components/AudioCallUI.tsx
import { useState, useEffect, useRef } from "react";
import { useAudioCall, CallData } from "@/hooks/use-audio-call";
import { Button } from "@/components/ui/button";
import { PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { formatSecondsToTime } from "@/lib/utils";
import { CallState } from "@/lib/audio-call";

interface AudioCallUIProps {
  matchId: number;
  otherUserId: number;
  otherUserName: string;
  callDay: number;
  onClose: () => void;
  isIncoming?: boolean;
}

export function AudioCallUI({
  matchId,
  otherUserId,
  otherUserName,
  callDay,
  onClose,
  isIncoming = false
}: AudioCallUIProps) {
  const {
    startCall,
    answerCall,
    rejectCall,
    endCall,
    mute,
    unmute,
    isCallActive,
    getTimeRemaining,
    onCallStateChange,
    getLocalStream,
    getRemoteStream,
    initialized
  } = useAudioCall();

  // Define all possible call states
  type AudioCallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'error';
  
  const [callState, setCallState] = useState<AudioCallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle call state changes
  useEffect(() => {
    const unsubscribe = onCallStateChange((state) => {
      setCallState(state);
      
      // Handle call ending
      if (state === 'ended') {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    });
    
    return unsubscribe;
  }, [onCallStateChange, onClose]);

  // Handle audio streams
  useEffect(() => {
    if (callState === 'connected') {
      // Set up local audio (typically muted to avoid echo)
      const setupLocalStream = async () => {
        try {
          const stream = await getLocalStream();
          if (stream && localAudioRef.current) {
            localAudioRef.current.srcObject = stream;
            localAudioRef.current.muted = true; // Always mute local audio output to prevent echo
          }
        } catch (error) {
          console.error("Error setting up local stream:", error);
        }
      };
      
      // Start timer to track remaining time
      timerRef.current = setInterval(() => {
        setTimeRemaining(getTimeRemaining());
      }, 1000);
      
      setupLocalStream();
      
      // Set up remote audio
      const remoteStream = getRemoteStream();
      if (remoteStream && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState, getLocalStream, getRemoteStream, getTimeRemaining]);

  // Initialize the call
  useEffect(() => {
    const initCall = async () => {
      if (initialized) {
        if (isIncoming) {
          // Wait for user to answer or reject
          setCallState('ringing');
        } else {
          // Start outgoing call
          try {
            console.log(`Attempting to start call - Match ID: ${matchId}, User ID: ${otherUserId}, Call Day: ${callDay}`);
            await startCall(matchId, otherUserId, callDay);
          } catch (error) {
            console.error("Failed to start call:", error);
            setCallState('error');
            
            // Show a more user-friendly message
            setTimeout(() => {
              onClose();
            }, 3000);
          }
        }
      } else {
        console.log("Audio service not yet initialized, waiting...");
      }
    };
    
    initCall();
  }, [initialized, isIncoming, startCall, matchId, otherUserId, callDay, onClose]);

  // Handle call actions
  const handleAnswer = async () => {
    try {
      await answerCall(matchId, otherUserId, callDay);
    } catch (error) {
      console.error("Failed to answer call:", error);
    }
  };

  const handleReject = () => {
    rejectCall(matchId, otherUserId);
    onClose();
  };

  const handleEndCall = async () => {
    await endCall();
  };

  const toggleMute = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-lg p-6 w-full max-w-sm mx-auto">
      {/* Call state banner */}
      <div className={`w-full py-3 px-4 rounded-md text-center mb-6 ${
        callState === 'idle' ? 'bg-gray-100 text-gray-700' :
        callState === 'connecting' ? 'bg-blue-100 text-blue-700 animate-pulse' :
        callState === 'ringing' ? 'bg-yellow-100 text-yellow-700' :
        callState === 'connected' ? 'bg-green-100 text-green-700' :
        callState === 'ended' ? 'bg-gray-100 text-gray-700' :
        'bg-red-100 text-red-700'
      }`}>
        <h2 className="text-xl font-semibold">
          {callState === 'idle' && 'Starting call...'}
          {callState === 'connecting' && 'Connecting...'}
          {callState === 'ringing' && (isIncoming ? 'Incoming Call' : 'Calling...')}
          {callState === 'connected' && 'On Call'}
          {callState === 'ended' && 'Call Ended'}
          {callState === 'error' && 'Call Failed'}
        </h2>
      </div>
      
      {/* Contact avatar placeholder */}
      <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">{otherUserName.charAt(0).toUpperCase()}</span>
      </div>
      
      <div className="text-lg font-medium mb-6">{otherUserName}</div>
      
      {callState === 'connected' && (
        <div className="text-md mb-4 bg-primary/10 py-2 px-4 rounded-md">
          Time remaining: {formatSecondsToTime(timeRemaining)}
        </div>
      )}
      
      {/* Show error message if call failed */}
      {callState === 'error' && (
        <div className="text-sm text-red-500 mb-4 bg-red-50 p-3 rounded-md">
          There was a problem connecting the call. Please check your microphone permissions and network connection.
        </div>
      )}
      
      <div className="flex gap-4 mt-4">
        {/* Ringing state controls */}
        {callState === 'ringing' && isIncoming && (
          <>
            <Button onClick={handleAnswer} className="bg-green-500 hover:bg-green-600">
              <PhoneCall className="mr-2" size={16} />
              Answer
            </Button>
            <Button onClick={handleReject} variant="destructive">
              <PhoneOff className="mr-2" size={16} />
              Reject
            </Button>
          </>
        )}
        
        {/* Connected state controls */}
        {callState === 'connected' && (
          <>
            <Button onClick={toggleMute} variant={isMuted ? "default" : "outline"} className="w-14 h-14 rounded-full">
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>
            <Button onClick={handleEndCall} variant="destructive" className="w-14 h-14 rounded-full">
              <PhoneOff size={20} />
            </Button>
          </>
        )}
        
        {/* Connecting/Outgoing call state */}
        {(callState === 'connecting' || (callState === 'ringing' && !isIncoming)) && (
          <Button onClick={handleEndCall} variant="destructive" className="px-6">
            <PhoneOff className="mr-2" size={16} />
            Cancel Call
          </Button>
        )}
        
        {/* Error or ended state */}
        {(callState === 'error' || callState === 'ended') && (
          <Button onClick={onClose} variant="outline" className="px-6">
            Return to Matches
          </Button>
        )}
      </div>
      
      {/* Hidden audio elements to play the streams */}
      <audio ref={localAudioRef} autoPlay />
      <audio ref={remoteAudioRef} autoPlay />
      
      {/* Debug connection status */}
      <div className="mt-8 text-xs text-gray-500 border-t pt-2">
        <p>Connection status: {initialized ? 'Initialized' : 'Not initialized'}</p>
        <p>Match ID: {matchId} | User ID: {otherUserId}</p>
      </div>
    </div>
  );
}