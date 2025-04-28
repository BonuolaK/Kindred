import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocketManager } from '@/lib/websocket-manager';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Type definitions for call status
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

// Data structure for calls
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
}

// WebSocket message type for call signals
interface CallSignalingMessage {
  type: string;
  callData?: CallData;
  error?: string;
}

// Call timeout durations
const CALL_RING_TIMEOUT = 30000; // 30 seconds

/**
 * This hook manages call signaling and state management for audio calls
 * It provides a higher-level interface above the WebRTC connections
 */
export function useCallSignaling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    rtcStatus,
    sendRtcMessage,
    onRtcMessage,
    isUserAvailableForCall
  } = useWebSocketManager();
  
  // Call state
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Timeout refs
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up any timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
      }
    };
  }, []);
  
  // Set up message listener for call signals
  useEffect(() => {
    const handleMessage = (message: any) => {
      console.log('[Call Signaling] Received message:', message);
      
      if (message.type === 'call:request') {
        // Incoming call
        handleIncomingCall(message.callData);
      } 
      else if (message.type === 'call:accept') {
        // Call was accepted
        handleCallAccepted(message.callData);
      }
      else if (message.type === 'call:reject') {
        // Call was rejected
        handleCallRejected(message.callData);
      }
      else if (message.type === 'call:end') {
        // Call ended
        handleCallEnded(message.callData);
      }
      else if (message.type === 'error') {
        // Error occurred
        setCallStatus('error');
        setError(message.message || 'An error occurred with the call');
      }
    };
    
    // Register message handler and get unsubscribe function
    const unsubscribe = onRtcMessage(handleMessage);
    
    return () => {
      // Clean up subscription when component unmounts
      unsubscribe();
    };
  }, [onRtcMessage]);
  
  // Handle incoming call
  const handleIncomingCall = useCallback((callData: CallData) => {
    console.log('[Call Signaling] Incoming call from:', callData.initiatorId);
    
    // Only accept the call if we're idle and not already in a call
    if (callStatus !== 'idle') {
      console.log('[Call Signaling] Rejecting call - already in a call');
      sendRtcMessage({
        type: 'call:reject',
        callData: {
          ...callData,
          status: 'rejected'
        }
      });
      return;
    }
    
    // Set current call data and update status to ringing
    setCurrentCall(callData);
    setCallStatus('ringing');
    
    // Set a timeout for the ringing state
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
    }
    
    ringTimeoutRef.current = setTimeout(() => {
      // Call was not answered in time
      if (callStatus === 'ringing') {
        // Send missed call signal
        sendRtcMessage({
          type: 'call:missed',
          callData: {
            ...callData,
            status: 'missed'
          }
        });
        
        // Update local state
        setCallStatus('missed');
        
        // Show notification
        toast({
          title: 'Missed Call',
          description: `You missed a call from ${callData.otherUserName}`,
          variant: 'default',
        });
      }
    }, CALL_RING_TIMEOUT);
  }, [callStatus, sendRtcMessage, toast]);
  
  // Handle call accepted
  const handleCallAccepted = useCallback((callData: CallData) => {
    console.log('[Call Signaling] Call accepted');
    
    // Clear any timeouts
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    
    // Update call state
    setCallStatus('connecting');
    setCurrentCall(callData);
    
    // After a short delay, transition to active state
    setTimeout(() => {
      setCallStatus('active');
      setIsConnected(true);
    }, 1000);
  }, []);
  
  // Handle call rejected
  const handleCallRejected = useCallback((callData: CallData) => {
    console.log('[Call Signaling] Call rejected');
    
    // Clear any timeouts
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    
    // Update call state
    setCallStatus('rejected');
    setCurrentCall(callData);
    
    // Show notification
    toast({
      title: 'Call Rejected',
      description: `${callData.otherUserName} rejected the call`,
      variant: 'default',
    });
    
    // Return to idle state after a delay
    setTimeout(() => {
      setCallStatus('idle');
      setCurrentCall(null);
    }, 3000);
  }, [toast]);
  
  // Handle call ended
  const handleCallEnded = useCallback((callData: CallData) => {
    console.log('[Call Signaling] Call ended');
    
    // Update call state
    setCallStatus('ended');
    setCurrentCall(callData);
    setIsConnected(false);
    
    // Return to idle state after a delay
    setTimeout(() => {
      setCallStatus('idle');
      setCurrentCall(null);
    }, 3000);
  }, []);
  
  // Update call status in database and send signal
  const updateCallStatus = useCallback(async (
    callData: CallData, 
    status: CallStatus
  ) => {
    try {
      // Update call in database
      if (callData.id) {
        await apiRequest('PATCH', `/api/calls/${callData.id}`, {
          status,
          ...(status === 'active' ? { startTime: new Date() } : {}),
          ...(status === 'ended' ? { endTime: new Date() } : {})
        });
      }
      
      // Send signal to other user
      const signalCallData: CallData = {
        ...callData,
        status,
        otherUserId: user?.id || 0,
        otherUserName: user?.username || 'Unknown'
      };
      
      // Determine signal type based on status
      const signalType = 
        status === 'calling' ? 'call:request' :
        status === 'connecting' ? 'call:accept' :
        status === 'rejected' ? 'call:reject' :
        status === 'ended' ? 'call:end' :
        status === 'missed' ? 'call:missed' :
        'call:update';
      
      sendRtcMessage({
        type: signalType,
        callData: signalCallData
      });
      
      return true;
    } catch (err) {
      console.error('[Call Signaling] Error updating call status:', err);
      setError('Failed to update call status');
      return false;
    }
  }, [sendRtcMessage, user]);
  
  // Start a new call
  const startCall = useCallback(async (
    matchId: number, 
    otherUserId: number,
    otherUserName: string,
    callDay: number
  ) => {
    try {
      console.log(`[Call Signaling] Starting call to ${otherUserName} (${otherUserId})`);
      
      // Check if other user is available
      if (!isUserAvailableForCall(otherUserId)) {
        setError(`${otherUserName} is not available for calls right now`);
        return false;
      }
      
      // Create call record in database
      const response = await apiRequest('POST', '/api/calls', {
        matchId,
        initiatorId: user?.id,
        receiverId: otherUserId,
        callDay
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create call: ${errorText}`);
      }
      
      const callRecord = await response.json();
      
      // Create call data
      const callData: CallData = {
        id: callRecord.id,
        matchId,
        initiatorId: user?.id || 0,
        receiverId: otherUserId,
        otherUserId,
        otherUserName,
        callDay,
        status: 'calling'
      };
      
      // Update local state
      setCurrentCall(callData);
      setCallStatus('calling');
      setError(null);
      
      // Send call request to other user
      const success = await updateCallStatus(callData, 'calling');
      
      // Set timeout for call ringing
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
      }
      
      ringTimeoutRef.current = setTimeout(() => {
        // Call was not answered in time
        if (callStatus === 'calling') {
          updateCallStatus(callData, 'missed');
          setCallStatus('missed');
          
          toast({
            title: 'Call Not Answered',
            description: `${otherUserName} did not answer the call`,
            variant: 'default',
          });
        }
      }, CALL_RING_TIMEOUT);
      
      return success;
    } catch (err) {
      console.error('[Call Signaling] Error starting call:', err);
      setError((err as Error).message || 'Failed to start call');
      setCallStatus('error');
      return false;
    }
  }, [isUserAvailableForCall, user, updateCallStatus, callStatus, toast]);
  
  // Answer an incoming call
  const answerCall = useCallback(async () => {
    if (!currentCall || callStatus !== 'ringing') {
      console.error('[Call Signaling] Cannot answer call - no incoming call');
      return false;
    }
    
    try {
      // Clear ring timeout
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      
      // Update call status
      setCallStatus('connecting');
      
      // Send acceptance to other user
      const success = await updateCallStatus(currentCall, 'connecting');
      
      // After a short delay, transition to active state
      setTimeout(() => {
        setCallStatus('active');
        setIsConnected(true);
      }, 1000);
      
      return success;
    } catch (err) {
      console.error('[Call Signaling] Error answering call:', err);
      setError('Failed to answer call');
      setCallStatus('error');
      return false;
    }
  }, [currentCall, callStatus, updateCallStatus]);
  
  // Reject an incoming call
  const rejectCall = useCallback(async () => {
    if (!currentCall || callStatus !== 'ringing') {
      console.error('[Call Signaling] Cannot reject call - no incoming call');
      return false;
    }
    
    try {
      // Clear ring timeout
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      
      // Update call status
      setCallStatus('rejected');
      
      // Send rejection to other user
      const success = await updateCallStatus(currentCall, 'rejected');
      
      // Return to idle state after a delay
      setTimeout(() => {
        setCallStatus('idle');
        setCurrentCall(null);
      }, 3000);
      
      return success;
    } catch (err) {
      console.error('[Call Signaling] Error rejecting call:', err);
      setError('Failed to reject call');
      return false;
    }
  }, [currentCall, callStatus, updateCallStatus]);
  
  // End an active call
  const endCall = useCallback(async () => {
    if (!currentCall || (callStatus !== 'active' && callStatus !== 'calling' && callStatus !== 'connecting')) {
      console.warn('[Call Signaling] Cannot end call - no active call');
      setCallStatus('idle');
      setCurrentCall(null);
      return true;
    }
    
    try {
      // Clear any timeouts
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      
      // Update call status
      setCallStatus('ended');
      setIsConnected(false);
      
      // Send end call signal to other user
      const success = await updateCallStatus(currentCall, 'ended');
      
      // Return to idle state after a delay
      setTimeout(() => {
        setCallStatus('idle');
        setCurrentCall(null);
      }, 3000);
      
      return success;
    } catch (err) {
      console.error('[Call Signaling] Error ending call:', err);
      setError('Failed to end call');
      setCallStatus('error');
      return false;
    }
  }, [currentCall, callStatus, updateCallStatus]);
  
  return {
    callStatus,
    currentCall,
    error,
    isConnected,
    startCall,
    answerCall,
    rejectCall,
    endCall
  };
}