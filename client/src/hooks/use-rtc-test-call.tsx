import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

// Type definitions for call status
export type RtcCallState = 
  | 'idle'           // Initial state, not in a call
  | 'connecting'     // Establishing connection to the other user
  | 'ringing'        // Call is ringing on receiver's end
  | 'connected'      // Call is active and connected
  | 'ended'          // Call has ended normally
  | 'error';         // Call has encountered an error

// Call states that the server can send
export type RtcCallServerState = 
  | 'pending'      // Call is waiting to be answered
  | 'connecting'   // Call is being connected
  | 'active'       // Call is active
  | 'completed'    // Call has completed normally
  | 'missed'       // Call was not answered
  | 'rejected';    // Call was rejected

// Signal data received from other peer
type SignalData = RTCSessionDescriptionInit | RTCIceCandidateInit;

// Data for the WebSocket messages
type RtcTestSocketMessage = {
  type: string;
  [key: string]: any;
};

export function useRtcTestCall() {
  const { user } = useAuth();
  const [callState, setCallState] = useState<RtcCallState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes by default
  const [remoteUserId, setRemoteUserId] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [callDay, setCallDay] = useState<number>(1);
  
  // References
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStateListenersRef = useRef<((state: RtcCallState) => void)[]>([]);
  
  // Determine call time limit based on call day
  useEffect(() => {
    // Call day 1: 5 minutes, day 2: 10 minutes, day 3+: 20 minutes
    const timeLimits = [300, 600, 1200];
    const timeLimit = timeLimits[Math.min(callDay - 1, 2)];
    setTimeRemaining(timeLimit);
  }, [callDay]);
  
  // Connect to rtctest WebSocket
  const connectSocket = useCallback(() => {
    if (!user?.id) {
      setError('User must be logged in to make calls');
      return false;
    }
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('[RTC-TEST] WebSocket already connected');
      return true;
    }
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/rtctest`);
      
      socket.onopen = () => {
        console.log('[RTC-TEST] Connected to rtctest WebSocket');
        
        // Register with the server
        if (user?.id) {
          socket.send(JSON.stringify({
            type: 'register',
            userId: user.id
          }));
          console.log('[RTC-TEST] Registered as user', user.id);
        }
      };
      
      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[RTC-TEST] Received message:', message);
          
          if (message.type === 'rtc-signal') {
            handleSignalingData(message);
          } else if (message.type === 'error') {
            console.error('[RTC-TEST] Error from server:', message.message);
            setError(message.message);
            setCallState('error');
          }
        } catch (err) {
          console.error('[RTC-TEST] Error parsing message:', err);
        }
      };
      
      socket.onerror = (error) => {
        console.error('[RTC-TEST] WebSocket error:', error);
        setError('Connection error. Please try again.');
        setCallState('error');
      };
      
      socket.onclose = () => {
        console.log('[RTC-TEST] WebSocket connection closed');
        // Clean up peer connection when socket closes
        closePeerConnection();
      };
      
      socketRef.current = socket;
      return true;
    } catch (err) {
      console.error('[RTC-TEST] Error connecting to WebSocket:', err);
      setError('Failed to connect to call service');
      return false;
    }
  }, [user?.id]);
  
  // Handle signaling data from the other peer
  const handleSignalingData = async (message: RtcTestSocketMessage) => {
    const signalData = message.signalData;
    console.log('[RTC-TEST] Handling signal data:', signalData);
    
    // Ensure we have a peer connection
    if (!peerConnectionRef.current) {
      await setupPeerConnection(false);
    }
    
    const peer = peerConnectionRef.current;
    if (!peer) {
      console.error('[RTC-TEST] Peer connection not available');
      return;
    }
    
    try {
      if (signalData.type === 'offer') {
        // Someone is calling us
        console.log('[RTC-TEST] Received offer, setting remote description');
        
        // Store the remote user ID
        setRemoteUserId(message.fromUserId);
        
        // Set the remote description
        await peer.setRemoteDescription(new RTCSessionDescription(signalData));
        
        // Update call state to ringing if we're not already connected
        if (callState === 'idle') {
          setCallState('ringing');
        }
        
        // Create and send answer
        console.log('[RTC-TEST] Creating answer');
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        
        // Send the answer back
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'rtc-signal',
            targetUserId: message.fromUserId,
            signalData: answer,
          }));
          console.log('[RTC-TEST] Answer sent to user', message.fromUserId);
        }
      } 
      else if (signalData.type === 'answer') {
        // Our call was answered
        console.log('[RTC-TEST] Received answer, setting remote description');
        await peer.setRemoteDescription(new RTCSessionDescription(signalData));
        
        // Update call state to connected
        setCallState('connected');
        notifyCallStateListeners('connected');
        
        // Start call timer
        startCallTimer();
      } 
      else if (signalData.candidate) {
        // ICE candidate from the other peer
        console.log('[RTC-TEST] Adding ICE candidate');
        try {
          await peer.addIceCandidate(new RTCIceCandidate(signalData));
        } catch (err) {
          // It's normal for some ICE candidates to fail, especially before remote description is set
          console.warn('[RTC-TEST] Failed to add ICE candidate:', err);
        }
      }
    } catch (err) {
      console.error('[RTC-TEST] Error handling signaling data:', err);
      setError('Call connection error');
      setCallState('error');
    }
  };
  
  // Set up WebRTC peer connection
  const setupPeerConnection = async (isInitiator: boolean) => {
    try {
      console.log('[RTC-TEST] Setting up peer connection, initiator:', isInitiator);
      
      // Create a new RTCPeerConnection
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      
      // Handle ICE candidates
      peer.onicecandidate = (event) => {
        if (event.candidate && remoteUserId && socketRef.current?.readyState === WebSocket.OPEN) {
          console.log('[RTC-TEST] Sending ICE candidate to user', remoteUserId);
          socketRef.current.send(JSON.stringify({
            type: 'rtc-signal',
            targetUserId: remoteUserId,
            signalData: event.candidate,
          }));
        }
      };
      
      // Handle connection state changes
      peer.onconnectionstatechange = () => {
        console.log('[RTC-TEST] Connection state changed:', peer.connectionState);
        
        if (peer.connectionState === 'connected') {
          console.log('[RTC-TEST] Peer connection established');
          setCallState('connected');
          notifyCallStateListeners('connected');
          
          // Start call timer
          startCallTimer();
        } 
        else if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
          console.error('[RTC-TEST] Peer connection failed/disconnected');
          setError('Call connection lost');
          setCallState('error');
          notifyCallStateListeners('error');
          
          // Stop the timer
          stopCallTimer();
        }
      };
      
      // Handle remote tracks
      peer.ontrack = (event) => {
        console.log('[RTC-TEST] Received remote track');
        remoteStreamRef.current = event.streams[0];
        
        // Connect to remote audio element if available
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };
      
      // Get local media stream if we don't have one
      if (!localStreamRef.current) {
        console.log('[RTC-TEST] Getting local media stream');
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        // Connect to local audio element if available
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = localStreamRef.current;
        }
      }
      
      // Add local tracks to the peer connection
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
          peer.addTrack(track, localStreamRef.current);
        }
      });
      
      // Set initial mute state
      updateMuteState();
      
      // Store the peer connection
      peerConnectionRef.current = peer;
      
      // If we're the initiator, create an offer
      if (isInitiator && remoteUserId) {
        console.log('[RTC-TEST] Creating offer as initiator');
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        
        // Send the offer to the remote user
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'rtc-signal',
            targetUserId: remoteUserId,
            signalData: offer,
          }));
          console.log('[RTC-TEST] Offer sent to user', remoteUserId);
        }
      }
      
      return true;
    } catch (err) {
      console.error('[RTC-TEST] Error setting up peer connection:', err);
      setError('Failed to access microphone or setup call');
      setCallState('error');
      notifyCallStateListeners('error');
      return false;
    }
  };
  
  // Close and clean up peer connection
  const closePeerConnection = () => {
    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear remote stream
    remoteStreamRef.current = null;
    
    // Clear audio elements
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    
    // Stop the timer
    stopCallTimer();
  };
  
  // Start a call to another user
  const startCall = async (targetMatchId: number, targetUserId: number, targetCallDay: number = 1) => {
    try {
      console.log(`[RTC-TEST] Starting call to user ${targetUserId} for match ${targetMatchId}, day ${targetCallDay}`);
      
      // Store call details
      setRemoteUserId(targetUserId);
      setMatchId(targetMatchId);
      setCallDay(targetCallDay);
      
      // Connect to WebSocket if not already connected
      const connected = connectSocket();
      if (!connected) {
        throw new Error('Failed to connect to call service');
      }
      
      // Wait a moment for socket connection and registration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create call record in the database
      if (!user || !user.id) {
        throw new Error('User must be logged in to make calls');
      }
      
      const response = await apiRequest('POST', '/api/calls', {
        matchId: targetMatchId,
        initiatorId: user.id, // Important! Server requires this for authorization
        receiverId: targetUserId,
        callDay: targetCallDay
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RTC-TEST] Failed to create call record:', errorText);
        throw new Error('Failed to initiate call');
      }
      
      // Update call state
      setCallState('connecting');
      notifyCallStateListeners('connecting');
      
      // Setup WebRTC connection as the initiator
      const success = await setupPeerConnection(true);
      if (!success) {
        throw new Error('Failed to setup call connection');
      }
      
      return true;
    } catch (err) {
      console.error('[RTC-TEST] Error starting call:', err);
      setError(err instanceof Error ? err.message : 'Failed to start call');
      setCallState('error');
      notifyCallStateListeners('error');
      return false;
    }
  };
  
  // Answer an incoming call
  const answerCall = async () => {
    try {
      if (callState !== 'ringing' || !remoteUserId) {
        throw new Error('No incoming call to answer');
      }
      
      console.log('[RTC-TEST] Answering call from user', remoteUserId);
      
      // Update state
      setCallState('connecting');
      notifyCallStateListeners('connecting');
      
      // Send answer through the existing peer connection process
      // This is handled automatically when we receive an offer
      
      return true;
    } catch (err) {
      console.error('[RTC-TEST] Error answering call:', err);
      setError(err instanceof Error ? err.message : 'Failed to answer call');
      setCallState('error');
      notifyCallStateListeners('error');
      return false;
    }
  };
  
  // Reject an incoming call
  const rejectCall = async () => {
    try {
      if (callState !== 'ringing' || !remoteUserId) {
        throw new Error('No incoming call to reject');
      }
      
      console.log('[RTC-TEST] Rejecting call from user', remoteUserId);
      
      // Send rejection message
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'call-rejected',
          targetUserId: remoteUserId
        }));
      }
      
      // Close the peer connection
      closePeerConnection();
      
      // Update state
      setCallState('idle');
      notifyCallStateListeners('idle');
      
      return true;
    } catch (err) {
      console.error('[RTC-TEST] Error rejecting call:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject call');
      return false;
    }
  };
  
  // End an active call
  const endCall = async () => {
    try {
      console.log('[RTC-TEST] Ending call');
      
      // Send end call message
      if (socketRef.current?.readyState === WebSocket.OPEN && remoteUserId) {
        socketRef.current.send(JSON.stringify({
          type: 'call-ended',
          targetUserId: remoteUserId
        }));
      }
      
      // Close the peer connection
      closePeerConnection();
      
      // Update call record in the database
      if (matchId) {
        try {
          await apiRequest('PATCH', `/api/calls/match/${matchId}/complete`, {
            status: 'completed'
          });
        } catch (err) {
          console.error('[RTC-TEST] Error updating call record:', err);
        }
      }
      
      // Update state
      setCallState('ended');
      notifyCallStateListeners('ended');
      
      return true;
    } catch (err) {
      console.error('[RTC-TEST] Error ending call:', err);
      setError(err instanceof Error ? err.message : 'Failed to end call');
      return false;
    }
  };
  
  // Mute/unmute the local audio
  const toggleMute = () => {
    setIsMuted(!isMuted);
    updateMuteState();
  };
  
  // Set mute state directly
  const setMute = (mute: boolean) => {
    setIsMuted(mute);
    updateMuteState();
  };
  
  // Update the mute state of the local stream
  const updateMuteState = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  };
  
  // Start the call timer
  const startCallTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Start a new timer
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up, end the call
          endCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Stop the call timer
  const stopCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  // Subscribe to call state changes
  const onCallStateChange = (callback: (state: RtcCallState) => void) => {
    callStateListenersRef.current.push(callback);
    
    // Return unsubscribe function
    return () => {
      callStateListenersRef.current = callStateListenersRef.current.filter(cb => cb !== callback);
    };
  };
  
  // Notify all call state listeners
  const notifyCallStateListeners = (state: RtcCallState) => {
    callStateListenersRef.current.forEach(callback => {
      try {
        callback(state);
      } catch (err) {
        console.error('[RTC-TEST] Error in call state listener:', err);
      }
    });
  };
  
  // Format time remaining as MM:SS
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Connect the audio elements
  const setAudioElements = (local: HTMLAudioElement | null, remote: HTMLAudioElement | null) => {
    localAudioRef.current = local;
    remoteAudioRef.current = remote;
    
    // Connect streams to elements if available
    if (local && localStreamRef.current) {
      local.srcObject = localStreamRef.current;
    }
    
    if (remote && remoteStreamRef.current) {
      remote.srcObject = remoteStreamRef.current;
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Close the peer connection
      closePeerConnection();
      
      // Close the socket connection
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);
  
  // Return the hook API
  return {
    // State
    callState,
    error,
    isMuted,
    timeRemaining,
    remoteUserId,
    matchId,
    
    // Controls
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    setMute,
    
    // Audio elements
    setAudioElements,
    
    // Helpers
    formatTimeRemaining,
    onCallStateChange,
    
    // WebRTC helpers
    connectSocket
  };
}