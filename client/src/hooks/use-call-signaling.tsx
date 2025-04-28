import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketManager } from '@/lib/websocket-manager';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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

interface CallSignalingMessage {
  type: string;
  callData?: CallData;
  error?: string;
}

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
      else if (message.type === 'call:error') {
        // Call error
        handleCallError(message.error || 'Unknown call error');
      }
    };
    
    const unsubscribe = onRtcMessage(handleMessage);
    return unsubscribe;
  }, [onRtcMessage]);

  // Handler functions
  const handleIncomingCall = useCallback((callData: CallData) => {
    if (!user) return;
    
    // Only handle calls that are meant for this user
    if (callData.receiverId !== user.id) return;
    
    // Update state
    setCallStatus('ringing');
    setCurrentCall(callData);
    
    // Set a timeout for the ringing (30 seconds)
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
    }
    
    ringTimeoutRef.current = setTimeout(() => {
      // If call is still ringing after timeout, mark as missed
      if (callStatus === 'ringing') {
        setCallStatus('missed');
        sendRtcMessage({
          type: 'call:miss',
          callData
        });
        
        // Log the missed call
        updateCallStatus(callData, 'missed');
      }
    }, 30000);
    
    // Notify user
    toast({
      title: 'Incoming Call',
      description: `${callData.otherUserName} is calling you`,
      variant: 'default',
      duration: 30000,
    });
  }, [user, callStatus, sendRtcMessage, toast]);
  
  const handleCallAccepted = useCallback((callData: CallData) => {
    if (callStatus !== 'calling') return;
    
    setCallStatus('connecting');
    setCurrentCall(callData);
    
    // Update call status in database
    updateCallStatus(callData, 'active');
  }, [callStatus]);
  
  const handleCallRejected = useCallback((callData: CallData) => {
    setCallStatus('rejected');
    
    toast({
      title: 'Call Rejected',
      description: `${callData.otherUserName} rejected your call`,
      variant: 'destructive',
    });
    
    // Update call status in database
    updateCallStatus(callData, 'rejected');
    
    // Clean up after a short delay
    setTimeout(() => {
      setCallStatus('idle');
      setCurrentCall(null);
    }, 3000);
  }, [toast]);
  
  const handleCallEnded = useCallback((callData: CallData) => {
    setCallStatus('ended');
    
    // Update call status in database
    updateCallStatus(callData, 'ended');
    
    // Clean up after a short delay
    setTimeout(() => {
      setCallStatus('idle');
      setCurrentCall(null);
    }, 3000);
  }, []);
  
  const handleCallError = useCallback((errorMessage: string) => {
    setCallStatus('error');
    setError(errorMessage);
    
    toast({
      title: 'Call Error',
      description: errorMessage,
      variant: 'destructive',
    });
    
    // If we have a current call, update its status
    if (currentCall) {
      updateCallStatus(currentCall, 'error');
    }
    
    // Clean up after a short delay
    setTimeout(() => {
      setCallStatus('idle');
      setCurrentCall(null);
      setError(null);
    }, 3000);
  }, [currentCall, toast]);
  
  // Helper to update call status in the database
  const updateCallStatus = useCallback(async (
    callData: CallData, 
    status: CallStatus
  ) => {
    try {
      const response = await apiRequest('PATCH', `/api/calls/match/${callData.matchId}/complete`, {
        status
      });
      
      if (!response.ok) {
        console.error('Failed to update call status:', await response.text());
      }
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }, []);
  
  // API to initiate a call
  const startCall = useCallback(async (
    matchId: number,
    receiverId: number,
    receiverName: string,
    callDay: number
  ) => {
    try {
      if (!user) {
        setError('You must be logged in to make calls');
        return false;
      }
      
      // Check if recipient is available for calls
      if (!isUserAvailableForCall(receiverId)) {
        setError(`${receiverName} is not available for calls right now`);
        return false;
      }
      
      // Create a call record in the database
      const response = await apiRequest('POST', '/api/calls', {
        matchId,
        initiatorId: user.id,
        receiverId,
        callDay
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        setError(`Failed to start call: ${errorText}`);
        return false;
      }
      
      const callData = await response.json();
      
      // Create call data for signaling
      const signalCallData: CallData = {
        ...callData,
        otherUserId: receiverId,
        otherUserName: receiverName,
        status: 'calling'
      };
      
      // Update local state
      setCallStatus('calling');
      setCurrentCall(signalCallData);
      
      // Send call request to the recipient
      sendRtcMessage({
        type: 'call:request',
        callData: signalCallData
      });
      
      // Set a timeout for the call (60 seconds)
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
      }
      
      ringTimeoutRef.current = setTimeout(() => {
        // If call is still in calling state after timeout, mark as missed
        if (callStatus === 'calling') {
          setCallStatus('missed');
          
          // Update call status in database
          updateCallStatus(signalCallData, 'missed');
          
          toast({
            title: 'Call Not Answered',
            description: `${receiverName} didn't answer the call`,
            variant: 'default',
          });
          
          // Clean up after a short delay
          setTimeout(() => {
            setCallStatus('idle');
            setCurrentCall(null);
          }, 3000);
        }
      }, 60000);
      
      return true;
    } catch (error) {
      console.error('Error starting call:', error);
      setError('Failed to start call due to a network error');
      return false;
    }
  }, [user, callStatus, isUserAvailableForCall, sendRtcMessage, toast, updateCallStatus]);
  
  // API to answer an incoming call
  const answerCall = useCallback(() => {
    if (callStatus !== 'ringing' || !currentCall) {
      setError('No incoming call to answer');
      return false;
    }
    
    // Clear the ring timeout
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    
    // Update call status
    setCallStatus('connecting');
    
    // Send call accept message
    sendRtcMessage({
      type: 'call:accept',
      callData: {
        ...currentCall,
        status: 'connecting'
      }
    });
    
    // Update call status in database
    updateCallStatus(currentCall, 'active');
    
    return true;
  }, [callStatus, currentCall, sendRtcMessage, updateCallStatus]);
  
  // API to reject an incoming call
  const rejectCall = useCallback(() => {
    if (callStatus !== 'ringing' || !currentCall) {
      return false;
    }
    
    // Clear the ring timeout
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    
    // Update call status
    setCallStatus('rejected');
    
    // Send call reject message
    sendRtcMessage({
      type: 'call:reject',
      callData: {
        ...currentCall,
        status: 'rejected'
      }
    });
    
    // Update call status in database
    updateCallStatus(currentCall, 'rejected');
    
    // Clean up after a short delay
    setTimeout(() => {
      setCallStatus('idle');
      setCurrentCall(null);
    }, 3000);
    
    return true;
  }, [callStatus, currentCall, sendRtcMessage, updateCallStatus]);
  
  // API to end an active call
  const endCall = useCallback(() => {
    if (
      (callStatus !== 'active' && callStatus !== 'connecting' && callStatus !== 'calling') || 
      !currentCall
    ) {
      return false;
    }
    
    // Update call status
    setCallStatus('ended');
    
    // Send call end message
    sendRtcMessage({
      type: 'call:end',
      callData: {
        ...currentCall,
        status: 'ended'
      }
    });
    
    // Update call status in database
    updateCallStatus(currentCall, 'ended');
    
    // Clean up after a short delay
    setTimeout(() => {
      setCallStatus('idle');
      setCurrentCall(null);
    }, 3000);
    
    return true;
  }, [callStatus, currentCall, sendRtcMessage, updateCallStatus]);
  
  return {
    callStatus,
    currentCall,
    error,
    isConnected: rtcStatus === 'connected',
    startCall,
    answerCall,
    rejectCall,
    endCall,
  };
}