import { useState, useEffect, useRef, useCallback } from 'react';
import { audioCallService, CallState, initializeAudioService } from '@/lib/audio-call';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export function useAudioCall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [callState, setCallState] = useState<CallState>('idle');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [callDay, setCallDay] = useState<number>(1);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const initialized = useRef<boolean>(false);
  
  // Format time for display (MM:SS)
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Initialize the audio service when the component mounts
  useEffect(() => {
    if (user && !initialized.current) {
      initializeAudioService(user.id)
        .then(() => {
          initialized.current = true;
          console.log('Audio service initialized');
        })
        .catch(error => {
          console.error('Failed to initialize audio service:', error);
          toast({
            title: 'Audio Service Error',
            description: 'Could not initialize audio service. Please try again.',
            variant: 'destructive',
          });
        });
    }
    
    return () => {
      // Clean up if component unmounts
      if (initialized.current) {
        audioCallService.cleanup();
        initialized.current = false;
      }
    };
  }, [user, toast]);

  // Listen for call state changes
  useEffect(() => {
    const unsubscribe = audioCallService.onCallStateChange((state) => {
      setCallState(state);
      
      if (state === 'connected') {
        // Start timer when call connects
        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current);
        }
        
        timerIntervalRef.current = window.setInterval(() => {
          const remaining = audioCallService.getTimeRemaining();
          setTimeRemaining(remaining);
        }, 1000);
        
        setCallDay(audioCallService.getCallDay());
        
        // Set up remote audio stream
        const remoteStream = audioCallService.getRemoteStream();
        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        
        // Set up local audio stream (for testing purposes, usually muted)
        const localStream = audioCallService.getLocalStream();
        if (localAudioRef.current && localStream) {
          localAudioRef.current.srcObject = localStream;
          localAudioRef.current.muted = true; // Mute to prevent feedback
        }
      } else if (state === 'idle' || state === 'ended') {
        // Clear timer when call ends
        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      }
    });
    
    return unsubscribe;
  }, []);

  // Start a call
  const startCall = useCallback(async (matchId: number, otherUserId: number, callDay: number) => {
    try {
      if (callState !== 'idle') {
        toast({
          title: 'Call in progress',
          description: 'Please end your current call before starting a new one.',
          variant: 'default',
        });
        return;
      }
      
      await audioCallService.startCall(matchId, otherUserId, callDay);
    } catch (error) {
      console.error('Failed to start call:', error);
      toast({
        title: 'Call Failed',
        description: 'Could not start the call. Please check your microphone permissions and try again.',
        variant: 'destructive',
      });
    }
  }, [callState, toast]);

  // Answer an incoming call
  const answerCall = useCallback(async (matchId: number, fromUserId: number, callDay: number) => {
    try {
      await audioCallService.answerCall(matchId, fromUserId, callDay);
    } catch (error) {
      console.error('Failed to answer call:', error);
      toast({
        title: 'Call Failed',
        description: 'Could not answer the call. Please check your microphone permissions and try again.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Reject an incoming call
  const rejectCall = useCallback((matchId: number, fromUserId: number) => {
    audioCallService.rejectCall(matchId, fromUserId);
  }, []);

  // End an ongoing call
  const endCall = useCallback(() => {
    audioCallService.endCall();
  }, []);

  return {
    callState,
    timeRemaining,
    formattedTimeRemaining: formatTime(timeRemaining),
    callDay,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    remoteAudioRef,
    localAudioRef,
  };
}