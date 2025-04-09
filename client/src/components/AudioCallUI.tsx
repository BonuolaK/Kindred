// components/AudioCallUI.tsx
import { useState, useEffect, useRef } from "react";
import { useAudioCall } from "@/hooks/use-audio-call";
import { Button } from "@/components/ui/button";
import { PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { formatSecondsToTime } from "@/lib/utils";

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
      const localStream = getLocalStream();
      if (localStream && localAudioRef.current) {
        localAudioRef.current.srcObject = localStream;
        localAudioRef.current.muted = true; // Always mute local audio output to prevent echo
      }
      
      // Set up remote audio
      const remoteStream = getRemoteStream();
      if (remoteStream && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      
      // Start timer to track remaining time
      timerRef.current = setInterval(() => {
        setTimeRemaining(getTimeRemaining());
      }, 1000);
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
            await startCall(matchId, otherUserId, callDay);
          } catch (error) {
            console.error("Failed to start call:", error);
          }
        }
      }
    };
    
    initCall();
  }, [initialized, isIncoming, startCall, matchId, otherUserId, callDay]);

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
    <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg p-6 shadow-lg w-80">
      <h2 className="text-xl font-semibold mb-4">
        {callState === 'idle' && 'Starting call...'}
        {callState === 'connecting' && 'Connecting...'}
        {callState === 'ringing' && (isIncoming ? 'Incoming Call' : 'Calling...')}
        {callState === 'connected' && 'On Call'}
        {callState === 'ended' && 'Call Ended'}
        {callState === 'error' && 'Call Failed'}
      </h2>
      
      <div className="text-lg mb-6">{otherUserName}</div>
      
      {callState === 'connected' && (
        <div className="text-md mb-4">
          Time remaining: {formatSecondsToTime(timeRemaining)}
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
            <Button onClick={toggleMute} variant="outline">
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </Button>
            <Button onClick={handleEndCall} variant="destructive">
              <PhoneOff className="mr-2" size={16} />
              End Call
            </Button>
          </>
        )}
        
        {/* Connecting/Outgoing call state */}
        {(callState === 'connecting' || (callState === 'ringing' && !isIncoming)) && (
          <Button onClick={handleEndCall} variant="destructive">
            <PhoneOff className="mr-2" size={16} />
            Cancel
          </Button>
        )}
      </div>
      
      {/* Hidden audio elements to play the streams */}
      <audio ref={localAudioRef} autoPlay />
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}