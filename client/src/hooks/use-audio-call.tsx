import { useState, useEffect, useCallback, useRef } from 'react';
import { webRTCService, WebRTCEvent, ConnectionState } from '@/lib/webrtc-service';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

// Type for the call data from the backend
export type CallData = {
  id: number;
  matchId: number;
  initiatorId: number;
  receiverId: number;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
  status: 'pending' | 'active' | 'completed' | 'missed' | 'failed';
  callDay: number;
};

export type RemoteStreamInfo = {
  userId: number;
  stream: MediaStream;
};

export type AudioCallState = {
  isInitializing: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isFailed: boolean;
  isEnded: boolean;
  error: Error | null;
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  otherUserId: number | null;
  matchId: number | null;
  callData: CallData | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  connectionState: ConnectionState;
};

export function useAudioCall(matchId?: number, otherUserId?: number) {
  const { user } = useAuth();
  const [callState, setCallState] = useState<AudioCallState>({
    isInitializing: false,
    isConnecting: false,
    isConnected: false,
    isFailed: false,
    isEnded: false,
    error: null,
    localStream: null,
    remoteStreams: new Map(),
    otherUserId: otherUserId || null,
    matchId: matchId || null,
    callData: null,
    audioEnabled: true,
    videoEnabled: false,
    connectionState: 'disconnected',
  });

  // We need to keep a ref to prevent stale closure issues
  const callStateRef = useRef(callState);
  callStateRef.current = callState;

  // Initialize the WebRTC service
  const initialize = useCallback(async (videoEnabled = false) => {
    if (!user?.id) {
      throw new Error('User must be logged in to use audio calls');
    }

    try {
      setCallState(prev => ({ ...prev, isInitializing: true }));
      await webRTCService.initialize(user.id, videoEnabled);
      setCallState(prev => ({ 
        ...prev, 
        isInitializing: false,
        videoEnabled
      }));
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      setCallState(prev => ({ 
        ...prev, 
        isInitializing: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      }));
    }
  }, [user?.id]);

  // Start a call (as initiator)
  const startCall = useCallback(async (targetMatchId: number, targetUserId: number, callDay: number, videoEnabled = false) => {
    if (!user?.id) {
      throw new Error('User must be logged in to start a call');
    }

    try {
      // Initialize WebRTC if not already done
      if (callStateRef.current.isInitializing === false && callStateRef.current.localStream === null) {
        await initialize(videoEnabled);
      }

      setCallState(prev => ({ 
        ...prev, 
        isConnecting: true, 
        otherUserId: targetUserId,
        matchId: targetMatchId
      }));

      // Create call record in backend
      const response = await apiRequest('POST', '/api/calls', {
        matchId: targetMatchId,
        initiatorId: user.id,
        receiverId: targetUserId,
        callDay
      });

      if (!response.ok) {
        throw new Error('Failed to create call record');
      }

      const callData = await response.json();
      
      // Join a room with the call ID as the room ID
      const roomId = `call-${callData.id}`;
      await webRTCService.joinRoom(roomId, { callId: callData.id });

      setCallState(prev => ({ 
        ...prev, 
        callData,
        isConnecting: false
      }));

      return callData;
    } catch (error) {
      console.error('Failed to start call:', error);
      setCallState(prev => ({ 
        ...prev, 
        isConnecting: false,
        isFailed: true,
        error: error instanceof Error ? error : new Error(String(error)) 
      }));
      throw error;
    }
  }, [user?.id, initialize]);

  // Join an existing call (as receiver)
  const joinCall = useCallback(async (callId: number, targetUserId: number, targetMatchId: number, videoEnabled = false) => {
    if (!user?.id) {
      throw new Error('User must be logged in to join a call');
    }

    try {
      // Initialize WebRTC if not already done
      if (callStateRef.current.isInitializing === false && callStateRef.current.localStream === null) {
        await initialize(videoEnabled);
      }

      setCallState(prev => ({ 
        ...prev, 
        isConnecting: true,
        otherUserId: targetUserId,
        matchId: targetMatchId
      }));

      // Get call data from backend
      const response = await apiRequest('GET', `/api/calls/${callId}`);
      if (!response.ok) {
        throw new Error('Failed to get call data');
      }
      
      const callData = await response.json();
      
      // Update call status to active
      await apiRequest('PATCH', `/api/calls/${callId}`, {
        status: 'active'
      });

      // Join the room with the same call ID
      const roomId = `call-${callId}`;
      await webRTCService.joinRoom(roomId, { callId });

      setCallState(prev => ({ 
        ...prev,
        callData,
        isConnecting: false
      }));

      return callData;
    } catch (error) {
      console.error('Failed to join call:', error);
      setCallState(prev => ({ 
        ...prev, 
        isConnecting: false,
        isFailed: true,
        error: error instanceof Error ? error : new Error(String(error)) 
      }));
      throw error;
    }
  }, [user?.id, initialize]);

  // End the current call
  const endCall = useCallback(async () => {
    try {
      const currentState = callStateRef.current;
      
      // Leave the WebRTC room
      await webRTCService.leaveRoom();
      
      // Update the call record in the backend if we have a call ID
      if (currentState.callData?.id) {
        await apiRequest('PATCH', `/api/calls/${currentState.callData.id}`, {
          status: 'completed',
          endTime: new Date().toISOString()
        });
      }
      
      setCallState(prev => ({ 
        ...prev, 
        isConnected: false,
        isEnded: true,
        connectionState: 'disconnected'
      }));
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, []);

  // Toggle audio mute state
  const toggleAudio = useCallback((enabled?: boolean) => {
    const newState = enabled !== undefined ? enabled : !callStateRef.current.audioEnabled;
    webRTCService.setAudioEnabled(newState);
    setCallState(prev => ({ ...prev, audioEnabled: newState }));
  }, []);

  // Toggle video enabled state
  const toggleVideo = useCallback((enabled?: boolean) => {
    const newState = enabled !== undefined ? enabled : !callStateRef.current.videoEnabled;
    webRTCService.setVideoEnabled(newState);
    setCallState(prev => ({ ...prev, videoEnabled: newState }));
  }, []);

  // Get the local media stream (microphone/camera)
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await webRTCService.getLocalStream();
      setCallState(prev => ({ ...prev, localStream: stream }));
      return stream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      setCallState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error(String(error)) 
      }));
      throw error;
    }
  }, []);

  // Handle WebRTC events
  useEffect(() => {
    const handleWebRTCEvent = (event: WebRTCEvent) => {
      console.log('[WebRTC Event]', event.type);
      
      switch (event.type) {
        case 'connecting':
          setCallState(prev => ({ 
            ...prev, 
            isConnecting: true, 
            connectionState: 'connecting' 
          }));
          break;
          
        case 'connected':
          setCallState(prev => ({ 
            ...prev, 
            isConnecting: false, 
            isConnected: true,
            connectionState: 'connected'
          }));
          break;
          
        case 'disconnected':
          setCallState(prev => ({ 
            ...prev, 
            isConnected: false, 
            connectionState: 'disconnected',
            isEnded: true,
            ...(event.reason ? { error: new Error(event.reason) } : {})
          }));
          break;
          
        case 'error':
          setCallState(prev => ({ 
            ...prev, 
            error: event.error 
          }));
          break;
          
        case 'localStream':
          setCallState(prev => ({ 
            ...prev, 
            localStream: event.stream 
          }));
          break;
          
        case 'remoteStream':
          setCallState(prev => {
            const newStreams = new Map(prev.remoteStreams);
            // Note: in a multi-user scenario, we'd need to track which user this stream belongs to
            if (prev.otherUserId) {
              newStreams.set(prev.otherUserId, event.stream);
            }
            return { 
              ...prev, 
              remoteStreams: newStreams,
              isConnected: true
            };
          });
          break;
          
        case 'reconnecting':
          setCallState(prev => ({ 
            ...prev, 
            isConnecting: true,
            isConnected: false,
            connectionState: 'reconnecting'
          }));
          break;
          
        case 'iceStateChange':
          // Just log for now
          console.log('ICE connection state:', event.state);
          break;
          
        case 'connectionStateChange':
          console.log('Connection state:', event.state);
          if (event.state === 'failed') {
            setCallState(prev => ({ 
              ...prev, 
              isFailed: true,
              isConnected: false,
              connectionState: 'failed',
              error: new Error('Connection failed')
            }));
          }
          break;
      }
    };
    
    // Register event listener
    const removeListener = webRTCService.addEventListener(handleWebRTCEvent);
    
    // Clean up
    return () => {
      removeListener();
    };
  }, []);
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Only cleanup if we're the ones who initiated all this
      if (callStateRef.current.localStream || callStateRef.current.isConnected) {
        console.log('[AudioCall] Cleaning up WebRTC resources');
        webRTCService.cleanup();
      }
    };
  }, []);

  return {
    ...callState,
    initialize,
    startCall,
    joinCall,
    endCall,
    toggleAudio,
    toggleVideo,
    getLocalStream
  };
}