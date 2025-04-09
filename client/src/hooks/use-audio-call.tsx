import { useState, useEffect, useCallback } from "react";
import { audioCallService, CallState, initializeAudioService } from "@/lib/audio-call";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function useAudioCall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);
  
  // Initialize audio service when component mounts and user is available
  useEffect(() => {
    if (user && user.id && !initialized) {
      initializeAudioService(user.id)
        .then(() => {
          setInitialized(true);
        })
        .catch((error) => {
          console.error("Failed to initialize audio service:", error);
          toast({
            title: "Connection Error",
            description: "Failed to initialize audio service. Please try again.",
            variant: "destructive",
          });
        });
    }
    
    // Cleanup on unmount
    return () => {
      if (initialized) {
        audioCallService.cleanup();
      }
    };
  }, [user, initialized, toast]);
  
  // Start a call
  const startCall = useCallback(async (matchId: number, otherUserId: number, callDay: number): Promise<void> => {
    try {
      if (!initialized) {
        throw new Error("Audio service not initialized");
      }
      
      await audioCallService.startCall(matchId, otherUserId, callDay);
    } catch (error) {
      console.error("Failed to start call:", error);
      toast({
        title: "Call Error",
        description: "Failed to start the call. Please check your microphone permissions and try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [initialized, toast]);
  
  // Answer an incoming call
  const answerCall = useCallback(async (matchId: number, otherUserId: number, callDay: number): Promise<void> => {
    try {
      if (!initialized) {
        throw new Error("Audio service not initialized");
      }
      
      await audioCallService.answerCall(matchId, otherUserId, callDay);
    } catch (error) {
      console.error("Failed to answer call:", error);
      toast({
        title: "Call Error",
        description: "Failed to answer the call. Please check your microphone permissions and try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [initialized, toast]);
  
  // Reject an incoming call
  const rejectCall = useCallback((matchId: number, otherUserId: number): void => {
    if (!initialized) {
      return;
    }
    
    audioCallService.rejectCall(matchId, otherUserId);
  }, [initialized]);
  
  // End an ongoing call
  const endCall = useCallback(async (): Promise<void> => {
    if (!initialized) {
      return;
    }
    
    await audioCallService.endCall();
  }, [initialized]);
  
  // Mute the local audio
  const mute = useCallback((): void => {
    if (!initialized) {
      return;
    }
    
    const localStream = audioCallService.getLocalStream();
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
  }, [initialized]);
  
  // Unmute the local audio
  const unmute = useCallback((): void => {
    if (!initialized) {
      return;
    }
    
    const localStream = audioCallService.getLocalStream();
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }, [initialized]);
  
  // Check if a call is active
  const isCallActive = useCallback((): boolean => {
    if (!initialized) {
      return false;
    }
    
    const state = audioCallService.getCallState();
    return state === 'connecting' || state === 'ringing' || state === 'connected';
  }, [initialized]);
  
  // Get the remaining time for the call (in seconds)
  const getTimeRemaining = useCallback((): number => {
    if (!initialized) {
      return 0;
    }
    
    return audioCallService.getTimeRemaining();
  }, [initialized]);
  
  // Subscribe to call state changes
  const onCallStateChange = useCallback((callback: (state: CallState) => void) => {
    return audioCallService.onCallStateChange(callback);
  }, []);
  
  // Get the local audio stream
  const getLocalStream = useCallback((): MediaStream | null => {
    if (!initialized) {
      return null;
    }
    
    return audioCallService.getLocalStream();
  }, [initialized]);
  
  // Get the remote audio stream
  const getRemoteStream = useCallback((): MediaStream | null => {
    if (!initialized) {
      return null;
    }
    
    return audioCallService.getRemoteStream();
  }, [initialized]);
  
  return {
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
  };
}