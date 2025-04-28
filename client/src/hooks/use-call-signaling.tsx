import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Call statuses
export type CallStatus = 
  // No call in progress
  | 'idle' 
  // User is initiating a call
  | 'calling' 
  // User is receiving a call
  | 'ringing'
  // Both users are connected and call is being established
  | 'connecting'
  // Call is active and ongoing
  | 'active'
  // Call ended normally
  | 'ended'
  // Call was missed (not answered in time)
  | 'missed'
  // Call was rejected by recipient
  | 'rejected'
  // There was an error during the call
  | 'error';

// Call data structure
export interface CallData {
  id?: number;
  matchId: number;
  initiatorId: number;
  receiverId: number;
  otherUserId: number;
  otherUserName: string;
  callDay: number;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  errorMessage?: string;
  avatar?: string;
  arePhotosRevealed?: boolean;
}

// Message structure for call signaling
interface CallSignalingMessage {
  type: string;
  callData?: CallData;
  error?: string;
}

// Context type for call signaling
interface CallSignalingContextType {
  // Call state
  currentCall: CallData | null;
  callStatus: CallStatus;
  
  // WebSocket status
  isConnected: boolean;
  isConnecting: boolean;
  
  // Call actions
  initiateCall: (callData: Omit<CallData, 'status' | 'initiatorId'>) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  resetCallState: () => void;
}

// Create context
const CallSignalingContext = createContext<CallSignalingContextType | null>(null);

export function CallSignalingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  
  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  
  // Timeout reference for auto-ending missed calls
  const missedCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create call log in database
  const createCallLogMutation = useMutation({
    mutationFn: async (callData: any) => {
      const res = await apiRequest('POST', '/api/calls', callData);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries when a call log is created
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
    }
  });
  
  // Update call log in database
  const updateCallLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest('PATCH', `/api/calls/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries when a call log is updated
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
    }
  });

  // Connect to the signaling server
  const connectToSignalingServer = useCallback(() => {
    if (!user || isConnecting) return;
    
    try {
      setIsConnecting(true);
      
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Determine WebSocket URL (check if we're using HTTPS)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/callsignal`;
      
      console.log('[CALL-SIGNAL] Connecting to call signaling server...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Setup event handlers
      ws.onopen = () => {
        console.log('[CALL-SIGNAL] Connected to call signaling server');
        setIsConnected(true);
        setIsConnecting(false);
        
        // Register with user ID
        sendMessage({
          type: 'register',
          userId: user.id
        });
      };
      
      ws.onclose = (event) => {
        console.log(`[CALL-SIGNAL] Disconnected from call signaling server: code=${event.code}, reason=${event.reason}`);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Handle disconnection during active call
        if (callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'active' || callStatus === 'ringing') {
          handleCallError('Connection to signaling server lost');
        }
        
        // Try to reconnect after a delay if not intentionally closed
        if (event.code !== 1000) {
          setTimeout(() => {
            if (document.visibilityState === 'visible') {
              connectToSignalingServer();
            }
          }, 3000);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[CALL-SIGNAL] WebSocket error:', error);
        setIsConnecting(false);
        
        // Handle error during active call
        if (callStatus !== 'idle') {
          handleCallError('Connection error');
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as CallSignalingMessage;
          handleIncomingMessage(message);
        } catch (error) {
          console.error('[CALL-SIGNAL] Error parsing message:', error);
        }
      };
    } catch (error) {
      console.error('[CALL-SIGNAL] Error connecting to signaling server:', error);
      setIsConnecting(false);
    }
  }, [user, isConnecting, callStatus]);
  
  // Send message to the signaling server
  const sendMessage = useCallback((message: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[CALL-SIGNAL] Cannot send message, WebSocket not connected');
      return false;
    }
    
    try {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[CALL-SIGNAL] Error sending message:', error);
      return false;
    }
  }, []);
  
  // Handle incoming messages from the signaling server
  const handleIncomingMessage = useCallback((message: CallSignalingMessage) => {
    console.log('[CALL-SIGNAL] Received message:', message);
    
    switch (message.type) {
      case 'registered':
        console.log('[CALL-SIGNAL] Successfully registered with call signaling server');
        break;
        
      case 'call:request':
        if (message.callData) {
          handleIncomingCall(message.callData);
        }
        break;
        
      case 'call:accept':
        if (message.callData) {
          handleCallAccepted(message.callData);
        }
        break;
        
      case 'call:reject':
        if (message.callData) {
          handleCallRejected(message.callData);
        }
        break;
        
      case 'call:end':
        if (message.callData) {
          handleCallEnded(message.callData);
        }
        break;
        
      case 'call:missed':
        if (message.callData) {
          handleCallMissed(message.callData);
        }
        break;
        
      case 'error':
        console.error('[CALL-SIGNAL] Error from server:', message.error);
        if (callStatus !== 'idle') {
          handleCallError(message.error || 'Unknown error');
        }
        break;
        
      default:
        console.warn('[CALL-SIGNAL] Unknown message type:', message.type);
    }
  }, [callStatus]);
  
  // Handle incoming call from another user
  const handleIncomingCall = useCallback((callData: CallData) => {
    console.log('[CALL-SIGNAL] Incoming call from user', callData.initiatorId);
    
    // If already in a call, automatically reject this one
    if (callStatus !== 'idle') {
      console.log('[CALL-SIGNAL] Already in a call, rejecting incoming call');
      sendCallSignal(callData, 'rejected');
      return;
    }
    
    // Play ringtone sound here
    // const ringtone = new Audio('/sounds/ringtone.mp3');
    // ringtone.loop = true;
    // ringtone.play();
    
    // Update state for incoming call
    setCallStatus('ringing');
    setCurrentCall(callData);
    
    // Set a timeout to automatically mark call as missed if not answered
    if (missedCallTimeoutRef.current) {
      clearTimeout(missedCallTimeoutRef.current);
    }
    
    // Use a local variable to capture the current callData
    const callDataCopy = { ...callData };
    missedCallTimeoutRef.current = setTimeout(() => {
      console.log('[CALL-SIGNAL] Call not answered, marking as missed');
      sendCallSignal(callDataCopy, 'missed');
      handleCallMissed(callDataCopy);
    }, 30000); // 30 seconds to answer
    
    // Show toast notification
    toast({
      title: 'Incoming Call',
      description: `${callData.otherUserName} is calling you`,
      duration: 10000, // 10 seconds notification
    });
  }, [callStatus, toast]);
  
  // Handle when the other user accepts our call
  const handleCallAccepted = useCallback((callData: CallData) => {
    console.log('[CALL-SIGNAL] Call accepted by user', callData.receiverId);
    
    if (callStatus === 'calling') {
      // Update state for accepted call
      setCallStatus('connecting');
      setCurrentCall({
        ...callData,
        status: 'connecting'
      });
      
      // Update call log in database
      if (callData.id) {
        updateCallLogMutation.mutate({
          id: callData.id,
          data: {
            status: 'connecting',
            startTime: new Date()
          }
        });
      }
      
      // At this point, WebRTC connection should be established
      // This would be handled by the specific call UI component
    }
  }, [callStatus, updateCallLogMutation]);
  
  // Handle when the other user rejects our call
  const handleCallRejected = useCallback((callData: CallData) => {
    console.log('[CALL-SIGNAL] Call rejected by user', callData.receiverId);
    
    if (callStatus === 'calling') {
      // Update state for rejected call
      setCallStatus('rejected');
      setCurrentCall({
        ...callData,
        status: 'rejected'
      });
      
      // Update call log in database
      if (callData.id) {
        updateCallLogMutation.mutate({
          id: callData.id,
          data: {
            status: 'rejected',
            endTime: new Date()
          }
        });
      }
      
      // Show toast notification
      toast({
        title: 'Call Rejected',
        description: `${callData.otherUserName} rejected your call`,
        variant: 'destructive',
      });
      
      // Automatically reset after a delay
      setTimeout(() => {
        resetCallState();
      }, 5000);
    }
  }, [callStatus, toast, updateCallLogMutation]);
  
  // Handle when the other user ends the call
  const handleCallEnded = useCallback((callData: CallData) => {
    console.log('[CALL-SIGNAL] Call ended by the other user');
    
    if (callStatus === 'connecting' || callStatus === 'active') {
      // Calculate call duration
      const duration = callData.startTime && callData.endTime 
        ? (new Date(callData.endTime).getTime() - new Date(callData.startTime).getTime()) / 1000
        : undefined;
      
      // Update state for ended call
      setCallStatus('ended');
      setCurrentCall({
        ...callData,
        status: 'ended',
        duration
      });
      
      // Update call log in database
      if (callData.id) {
        updateCallLogMutation.mutate({
          id: callData.id,
          data: {
            status: 'completed',
            endTime: new Date(),
            duration
          }
        });
      }
      
      // Show toast notification
      toast({
        title: 'Call Ended',
        description: `Call with ${callData.otherUserName} has ended`,
      });
      
      // Automatically reset after a delay
      setTimeout(() => {
        resetCallState();
      }, 5000);
    }
  }, [callStatus, toast, updateCallLogMutation]);
  
  // Handle missed calls
  const handleCallMissed = useCallback((callData: CallData) => {
    console.log('[CALL-SIGNAL] Call missed');
    
    // Stop ringtone if playing
    // if (ringtone) ringtone.pause();
    
    // Clear the missed call timeout
    if (missedCallTimeoutRef.current) {
      clearTimeout(missedCallTimeoutRef.current);
      missedCallTimeoutRef.current = null;
    }
    
    // Update state for missed call
    setCallStatus('missed');
    setCurrentCall({
      ...callData,
      status: 'missed'
    });
    
    // Update call log in database
    if (callData.id) {
      updateCallLogMutation.mutate({
        id: callData.id,
        data: {
          status: 'missed',
          endTime: new Date()
        }
      });
    }
    
    // Show toast notification
    toast({
      title: 'Missed Call',
      description: `You missed a call from ${callData.otherUserName}`,
      variant: 'destructive',
    });
    
    // Automatically reset after a delay
    setTimeout(() => {
      resetCallState();
    }, 5000);
  }, [toast, updateCallLogMutation]);
  
  // Handle call errors
  const handleCallError = useCallback((errorMessage: string) => {
    console.error('[CALL-SIGNAL] Call error:', errorMessage);
    
    // Update state for call error
    setCallStatus('error');
    
    if (currentCall) {
      setCurrentCall({
        ...currentCall,
        status: 'error',
        errorMessage
      });
      
      // Update call log in database
      if (currentCall.id) {
        updateCallLogMutation.mutate({
          id: currentCall.id,
          data: {
            status: 'error',
            endTime: new Date()
          }
        });
      }
    }
    
    // Show toast notification
    toast({
      title: 'Call Error',
      description: errorMessage,
      variant: 'destructive',
    });
    
    // Automatically reset after a delay
    setTimeout(() => {
      resetCallState();
    }, 5000);
  }, [currentCall, toast, updateCallLogMutation]);
  
  // Helper function to send call signaling messages
  const sendCallSignal = useCallback((callData: CallData, status: CallStatus) => {
    const signalType = `call:${status}`;
    
    // Set the correct status in the call data
    const signalCallData: CallData = {
      ...callData,
      status
    };
    
    // For calls that are ending, set the end time
    if (status === 'ended' || status === 'rejected' || status === 'missed') {
      signalCallData.endTime = new Date();
      
      // Calculate duration for ended calls
      if (status === 'ended' && signalCallData.startTime) {
        signalCallData.duration = (new Date().getTime() - new Date(signalCallData.startTime).getTime()) / 1000;
      }
    }
    
    // For calls that are being accepted, set the start time
    if (status === 'connecting' && !signalCallData.startTime) {
      signalCallData.startTime = new Date();
    }
    
    // Send the signal
    return sendMessage({
      type: signalType,
      callData: signalCallData
    });
  }, [sendMessage]);
  
  // Initiates a call to another user
  const initiateCall = useCallback(async (callParams: Omit<CallData, 'status' | 'initiatorId'>) => {
    if (!user) {
      console.error('[CALL-SIGNAL] Cannot initiate call: No user logged in');
      return;
    }
    
    if (callStatus !== 'idle') {
      console.warn('[CALL-SIGNAL] Cannot initiate call: Already in a call');
      return;
    }
    
    if (!isConnected) {
      console.warn('[CALL-SIGNAL] Cannot initiate call: Not connected to signaling server');
      connectToSignalingServer();
      
      toast({
        title: 'Connection Error',
        description: 'Trying to reconnect to call server...',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      console.log('[CALL-SIGNAL] Initiating call to user', callParams.otherUserId);
      
      // Create call record in database
      const callData = await createCallLogMutation.mutateAsync({
        matchId: callParams.matchId,
        initiatorId: user.id,
        receiverId: callParams.otherUserId,
        callDay: callParams.callDay,
        status: 'pending'
      });
      
      // Prepare call data
      const fullCallData: CallData = {
        ...callParams,
        id: callData.id,
        initiatorId: user.id,
        receiverId: callParams.otherUserId,
        status: 'calling'
      };
      
      // Update local state
      setCallStatus('calling');
      setCurrentCall(fullCallData);
      
      // Send call request signal
      const sent = sendCallSignal(fullCallData, 'calling');
      if (!sent) {
        handleCallError('Failed to send call request');
      }
    } catch (error) {
      console.error('[CALL-SIGNAL] Error initiating call:', error);
      handleCallError('Failed to create call record');
    }
  }, [user, callStatus, isConnected, connectToSignalingServer, createCallLogMutation, sendCallSignal, handleCallError, toast]);
  
  // Accept an incoming call
  const acceptCall = useCallback(() => {
    if (callStatus !== 'ringing' || !currentCall) {
      console.warn('[CALL-SIGNAL] Cannot accept call: No incoming call');
      return;
    }
    
    // Clear the missed call timeout
    if (missedCallTimeoutRef.current) {
      clearTimeout(missedCallTimeoutRef.current);
      missedCallTimeoutRef.current = null;
    }
    
    // Stop ringtone if playing
    // if (ringtone) ringtone.pause();
    
    console.log('[CALL-SIGNAL] Accepting call from user', currentCall.initiatorId);
    
    // Update state
    setCallStatus('connecting');
    setCurrentCall({
      ...currentCall,
      status: 'connecting',
      startTime: new Date()
    });
    
    // Update call log in database
    if (currentCall.id) {
      updateCallLogMutation.mutate({
        id: currentCall.id,
        data: {
          status: 'connecting',
          startTime: new Date()
        }
      });
    }
    
    // Send accept signal
    const sent = sendCallSignal(currentCall, 'connecting');
    if (!sent) {
      handleCallError('Failed to send call acceptance');
    }
  }, [callStatus, currentCall, updateCallLogMutation, sendCallSignal, handleCallError]);
  
  // Reject an incoming call
  const rejectCall = useCallback(() => {
    if (callStatus !== 'ringing' || !currentCall) {
      console.warn('[CALL-SIGNAL] Cannot reject call: No incoming call');
      return;
    }
    
    // Clear the missed call timeout
    if (missedCallTimeoutRef.current) {
      clearTimeout(missedCallTimeoutRef.current);
      missedCallTimeoutRef.current = null;
    }
    
    // Stop ringtone if playing
    // if (ringtone) ringtone.pause();
    
    console.log('[CALL-SIGNAL] Rejecting call from user', currentCall.initiatorId);
    
    // Update state
    setCallStatus('rejected');
    setCurrentCall({
      ...currentCall,
      status: 'rejected'
    });
    
    // Update call log in database
    if (currentCall.id) {
      updateCallLogMutation.mutate({
        id: currentCall.id,
        data: {
          status: 'rejected',
          endTime: new Date()
        }
      });
    }
    
    // Send reject signal
    const sent = sendCallSignal(currentCall, 'rejected');
    if (!sent) {
      console.warn('[CALL-SIGNAL] Failed to send rejection signal');
    }
    
    // Automatically reset after a delay
    setTimeout(() => {
      resetCallState();
    }, 5000);
  }, [callStatus, currentCall, updateCallLogMutation, sendCallSignal]);
  
  // End an active call
  const endCall = useCallback(() => {
    if (!currentCall || (callStatus !== 'connecting' && callStatus !== 'active')) {
      console.warn('[CALL-SIGNAL] Cannot end call: No active call');
      return;
    }
    
    console.log('[CALL-SIGNAL] Ending call with user', 
      currentCall.initiatorId === user?.id ? currentCall.receiverId : currentCall.initiatorId);
    
    // Calculate duration
    const duration = currentCall.startTime 
      ? (new Date().getTime() - new Date(currentCall.startTime).getTime()) / 1000
      : undefined;
    
    // Update state
    setCallStatus('ended');
    setCurrentCall({
      ...currentCall,
      status: 'ended',
      endTime: new Date(),
      duration
    });
    
    // Update call log in database
    if (currentCall.id) {
      updateCallLogMutation.mutate({
        id: currentCall.id,
        data: {
          status: 'completed',
          endTime: new Date(),
          duration
        }
      });
    }
    
    // Send end signal
    const sent = sendCallSignal(currentCall, 'ended');
    if (!sent) {
      console.warn('[CALL-SIGNAL] Failed to send end call signal');
    }
    
    // Automatically reset after a delay
    setTimeout(() => {
      resetCallState();
    }, 5000);
  }, [callStatus, currentCall, user, updateCallLogMutation, sendCallSignal]);
  
  // Reset call state to idle
  const resetCallState = useCallback(() => {
    console.log('[CALL-SIGNAL] Resetting call state');
    setCallStatus('idle');
    setCurrentCall(null);
    
    // Clear any pending timeouts
    if (missedCallTimeoutRef.current) {
      clearTimeout(missedCallTimeoutRef.current);
      missedCallTimeoutRef.current = null;
    }
  }, []);
  
  // Connect to the signaling server when the user is logged in
  useEffect(() => {
    if (user && !wsRef.current && !isConnecting) {
      connectToSignalingServer();
    }
  }, [user, connectToSignalingServer, isConnecting]);
  
  // Clean up when component unmounts
  useEffect(() => {
    // Handle visibility change to reconnect when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !wsRef.current && !isConnecting) {
        connectToSignalingServer();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Clear any pending timeouts
      if (missedCallTimeoutRef.current) {
        clearTimeout(missedCallTimeoutRef.current);
        missedCallTimeoutRef.current = null;
      }
    };
  }, [user, connectToSignalingServer, isConnecting]);
  
  // Provide context value
  const contextValue: CallSignalingContextType = {
    currentCall,
    callStatus,
    isConnected,
    isConnecting,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    resetCallState
  };
  
  return (
    <CallSignalingContext.Provider value={contextValue}>
      {children}
    </CallSignalingContext.Provider>
  );
}

// Custom hook to use the call signaling context
export function useCallSignaling() {
  const context = useContext(CallSignalingContext);
  
  if (!context) {
    throw new Error('useCallSignaling must be used within a CallSignalingProvider');
  }
  
  return context;
}