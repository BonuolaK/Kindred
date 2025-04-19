import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createWebSocketWithHeartbeat, WebSocketWithHeartbeat } from '@/lib/websocket-heartbeat';

// For testing calls between two users
type User = {
  id: number;
  name: string;
  color: string;
};

type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

// Test users for simulating call
const USER_1: User = { id: 17, name: "KennyB", color: "#4f46e5" };
const USER_2: User = { id: 35, name: "FemTest", color: "#9B1D54" };

export default function MatchCallTest() {
  const { user: loggedInUser } = useAuth();
  const [activeUser, setActiveUser] = useState<User>(USER_1);
  const [otherUser, setOtherUser] = useState<User>(USER_2);
  
  const [logs, setLogs] = useState<{[userId: number]: string[]}>({
    [USER_1.id]: [],
    [USER_2.id]: []
  });
  
  const [localStreams, setLocalStreams] = useState<{[userId: number]: MediaStream | null}>({
    [USER_1.id]: null,
    [USER_2.id]: null
  });
  
  const [callState, setCallState] = useState<{[userId: number]: CallState}>({
    [USER_1.id]: 'idle',
    [USER_2.id]: 'idle'
  });
  
  const [errors, setErrors] = useState<{[userId: number]: string | null}>({
    [USER_1.id]: null,
    [USER_2.id]: null
  });
  
  const [muted, setMuted] = useState<{[userId: number]: boolean}>({
    [USER_1.id]: false,
    [USER_2.id]: false
  });
  
  const [speakerMuted, setSpeakerMuted] = useState<{[userId: number]: boolean}>({
    [USER_1.id]: false,
    [USER_2.id]: false
  });
  
  const [wsConnected, setWsConnected] = useState<{[userId: number]: boolean}>({
    [USER_1.id]: false,
    [USER_2.id]: false
  });
  
  // References
  const socketRefs = useRef<{[userId: number]: WebSocketWithHeartbeat | null}>({
    [USER_1.id]: null,
    [USER_2.id]: null
  });
  
  const audioRefs = useRef<{[userId: number]: HTMLAudioElement | null}>({
    [USER_1.id]: null,
    [USER_2.id]: null
  });
  
  const logEnds = useRef<{[userId: number]: HTMLDivElement | null}>({
    [USER_1.id]: null,
    [USER_2.id]: null
  });
  
  // RTCPeerConnection
  const peerConnections = useRef<{[userId: number]: RTCPeerConnection | null}>({
    [USER_1.id]: null,
    [USER_2.id]: null
  });
  
  // ICE candidate storage for delayed candidates
  const iceCandidateQueue = useRef<{[userId: number]: RTCIceCandidate[]}>({
    [USER_1.id]: [],
    [USER_2.id]: []
  });
  
  // Auto scroll logs to bottom when they change
  useEffect(() => {
    const logEnd = logEnds.current[activeUser.id];
    if (logEnd) {
      logEnd.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeUser.id]);
  
  // Helper to add log entry for a user
  const addLog = (userId: number, message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => ({
      ...prev,
      [userId]: [...(prev[userId] || []), `[${timestamp}] ${message}`]
    }));
  };
  
  // Switch active user
  const switchUser = () => {
    if (activeUser.id === USER_1.id) {
      setActiveUser(USER_2);
      setOtherUser(USER_1);
    } else {
      setActiveUser(USER_1);
      setOtherUser(USER_2);
    }
  };
  
  // Setup WebSocket connection for a user
  const setupWebSocket = async (userId: number) => {
    try {
      addLog(userId, 'Setting up WebSocket connection...');
      
      // Close existing socket if any
      if (socketRefs.current[userId]) {
        socketRefs.current[userId]?.close();
        socketRefs.current[userId] = null;
      }
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/rtc`;
      
      // Create WebSocket with heartbeat support
      const socket = createWebSocketWithHeartbeat(wsUrl);
      socket.userId = userId;
      socketRefs.current[userId] = socket;
      
      socket.addEventListener('open', () => {
        addLog(userId, 'WebSocket connection established');
        setWsConnected(prev => ({ ...prev, [userId]: true }));
        
        // Register with the server
        socket.send(JSON.stringify({
          type: 'register',
          userId: userId
        }));
        
        addLog(userId, `Registered with signaling server as user ${userId}`);
      });
      
      socket.addEventListener('message', (event) => handleSignalingMessage(userId, event.data));
      
      socket.addEventListener('close', (event) => {
        addLog(userId, `WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`);
        setWsConnected(prev => ({ ...prev, [userId]: false }));
      });
      
      socket.addEventListener('error', () => {
        addLog(userId, 'WebSocket error occurred');
        setErrors(prev => ({ ...prev, [userId]: 'WebSocket connection error' }));
      });
      
      return socket;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to create WebSocket: ${errorMessage}`);
      setErrors(prev => ({ ...prev, [userId]: `WebSocket setup failed: ${errorMessage}` }));
      return null;
    }
  };
  
  // Setup media for a user
  const setupMedia = async (userId: number) => {
    try {
      addLog(userId, 'Requesting microphone access...');
      
      if (localStreams[userId]) {
        localStreams[userId]?.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      addLog(userId, `Microphone access granted (${stream.getAudioTracks().length} tracks)`);
      
      setLocalStreams(prev => ({ ...prev, [userId]: stream }));
      
      if (audioRefs.current[userId]) {
        audioRefs.current[userId]!.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to access microphone: ${errorMessage}`);
      setErrors(prev => ({ ...prev, [userId]: `Microphone access failed: ${errorMessage}` }));
      return null;
    }
  };
  
  // Create RTCPeerConnection for a user
  const createPeerConnection = (userId: number): RTCPeerConnection | null => {
    try {
      addLog(userId, 'Creating RTCPeerConnection...');
      
      // STUN servers config
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };
      
      const pc = new RTCPeerConnection(configuration);
      peerConnections.current[userId] = pc;
      
      // Add local stream tracks to the connection
      const stream = localStreams[userId];
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
          addLog(userId, `Added ${track.kind} track to connection`);
        });
      } else {
        addLog(userId, 'Warning: No local stream to add to connection');
      }
      
      // Set up event handlers
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addLog(userId, `Generated ICE candidate`);
          sendToPeer(userId, {
            type: 'ice-candidate',
            candidate: event.candidate
          });
        } else {
          addLog(userId, 'ICE candidate generation complete');
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        addLog(userId, `ICE connection state: ${pc.iceConnectionState}`);
        
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setCallState(prev => ({ ...prev, [userId]: 'connected' }));
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          addLog(userId, 'Connection failed or disconnected');
          setCallState(prev => ({ ...prev, [userId]: 'ended' }));
        }
      };
      
      pc.ontrack = (event) => {
        addLog(userId, `Received remote ${event.track.kind} track`);
        
        // Get the other user's ID
        const otherUserId = userId === USER_1.id ? USER_2.id : USER_1.id;
        
        if (audioRefs.current[otherUserId]) {
          audioRefs.current[otherUserId]!.srcObject = event.streams[0];
          addLog(userId, 'Connected remote stream to audio element');
        }
      };
      
      return pc;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to create peer connection: ${errorMessage}`);
      setErrors(prev => ({ ...prev, [userId]: `Connection creation failed: ${errorMessage}` }));
      return null;
    }
  };
  
  // Send signaling message to the other peer
  const sendToPeer = (userId: number, message: any) => {
    const ws = socketRefs.current[userId];
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog(userId, 'Cannot send message: WebSocket not connected');
      return;
    }
    
    const otherUserId = userId === USER_1.id ? USER_2.id : USER_1.id;
    
    try {
      const signalMessage = {
        ...message,
        targetUserId: otherUserId
      };
      
      ws.send(JSON.stringify(signalMessage));
      addLog(userId, `Sent ${message.type} to user ${otherUserId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to send message: ${errorMessage}`);
    }
  };
  
  // Handle incoming signaling messages
  const handleSignalingMessage = (userId: number, data: string | ArrayBuffer) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Skip logging pong messages
      if (message.type === 'pong') {
        return;
      }
      
      addLog(userId, `Received ${message.type} message`);
      
      switch (message.type) {
        case 'offer':
          handleOffer(userId, message.offer);
          setCallState(prev => ({ ...prev, [userId]: 'ringing' }));
          break;
          
        case 'answer':
          handleAnswer(userId, message.answer);
          break;
          
        case 'ice-candidate':
          handleIceCandidate(userId, message.candidate);
          break;
          
        case 'call-request':
          // The other user is calling this user
          setCallState(prev => ({ ...prev, [userId]: 'ringing' }));
          break;
          
        case 'call-accepted':
          // The other user accepted the call
          setCallState(prev => ({ ...prev, [userId]: 'connected' }));
          break;
          
        case 'call-rejected':
          // The other user rejected the call
          setCallState(prev => ({ ...prev, [userId]: 'ended' }));
          addLog(userId, 'Call was rejected');
          break;
          
        case 'call-ended':
          // The other user ended the call
          setCallState(prev => ({ ...prev, [userId]: 'ended' }));
          cleanupPeerConnection(userId);
          addLog(userId, 'Call ended by the other user');
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Error processing message: ${errorMessage}`);
    }
  };
  
  // Handle incoming offer
  const handleOffer = async (userId: number, offer: RTCSessionDescriptionInit) => {
    try {
      addLog(userId, 'Received call offer');
      
      // Create peer connection if it doesn't exist
      if (!peerConnections.current[userId]) {
        peerConnections.current[userId] = createPeerConnection(userId);
      }
      
      const pc = peerConnections.current[userId];
      if (!pc) {
        addLog(userId, 'No peer connection available');
        return;
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      addLog(userId, 'Set remote description from offer');
      
      // Create and set local answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      addLog(userId, 'Created and set local answer');
      
      // Send answer to the other peer
      sendToPeer(userId, {
        type: 'answer',
        answer
      });
      
      // Apply any queued ICE candidates
      const candidates = iceCandidateQueue.current[userId];
      if (candidates.length > 0) {
        addLog(userId, `Applying ${candidates.length} queued ICE candidates`);
        
        for (const candidate of candidates) {
          await pc.addIceCandidate(candidate);
        }
        
        iceCandidateQueue.current[userId] = [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Error handling offer: ${errorMessage}`);
      setErrors(prev => ({ ...prev, [userId]: `Failed to process offer: ${errorMessage}` }));
    }
  };
  
  // Handle incoming answer
  const handleAnswer = async (userId: number, answer: RTCSessionDescriptionInit) => {
    try {
      addLog(userId, 'Received answer to our offer');
      
      const pc = peerConnections.current[userId];
      if (!pc) {
        addLog(userId, 'No peer connection available');
        return;
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      addLog(userId, 'Set remote description from answer');
      
      // Apply any queued ICE candidates
      const candidates = iceCandidateQueue.current[userId];
      if (candidates.length > 0) {
        addLog(userId, `Applying ${candidates.length} queued ICE candidates`);
        
        for (const candidate of candidates) {
          await pc.addIceCandidate(candidate);
        }
        
        iceCandidateQueue.current[userId] = [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Error handling answer: ${errorMessage}`);
      setErrors(prev => ({ ...prev, [userId]: `Failed to process answer: ${errorMessage}` }));
    }
  };
  
  // Handle incoming ICE candidate
  const handleIceCandidate = async (userId: number, candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnections.current[userId];
      
      if (!pc || !pc.remoteDescription) {
        // Queue the candidate for later
        iceCandidateQueue.current[userId].push(new RTCIceCandidate(candidate));
        addLog(userId, 'Queued ICE candidate (no remote description yet)');
        return;
      }
      
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      addLog(userId, 'Added remote ICE candidate');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Error handling ICE candidate: ${errorMessage}`);
    }
  };
  
  // Initialize the call setup for this user
  const initializeCall = async () => {
    const userId = activeUser.id;
    
    try {
      addLog(userId, 'Initializing call setup...');
      
      // Setup WebSocket if not already connected
      if (!socketRefs.current[userId] || socketRefs.current[userId]?.readyState !== WebSocket.OPEN) {
        await setupWebSocket(userId);
      }
      
      // Setup media if not already set up
      if (!localStreams[userId]) {
        await setupMedia(userId);
      }
      
      addLog(userId, 'Call setup initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to initialize call: ${errorMessage}`);
      setErrors(prev => ({ ...prev, [userId]: `Initialization failed: ${errorMessage}` }));
    }
  };
  
  // Start a call to the other user
  const startCall = async () => {
    const userId = activeUser.id;
    const otherUserId = activeUser.id === USER_1.id ? USER_2.id : USER_1.id;
    
    try {
      addLog(userId, `Starting call to user ${otherUserId}...`);
      
      // Check prerequisites
      if (!socketRefs.current[userId] || socketRefs.current[userId]?.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
      }
      
      if (!localStreams[userId]) {
        throw new Error('Local media not available');
      }
      
      // Create peer connection
      const pc = createPeerConnection(userId);
      if (!pc) {
        throw new Error('Failed to create peer connection');
      }
      
      // Create and send offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await pc.setLocalDescription(offer);
      addLog(userId, 'Created and set local offer');
      
      // Send offer to the other peer
      sendToPeer(userId, {
        type: 'offer',
        offer
      });
      
      // Update call state
      setCallState(prev => ({ ...prev, [userId]: 'calling' }));
      addLog(userId, `Call initiated to user ${otherUserId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to start call: ${errorMessage}`);
      setErrors(prev => ({ ...prev, [userId]: `Call initiation failed: ${errorMessage}` }));
    }
  };
  
  // Answer an incoming call
  const answerCall = async () => {
    const userId = activeUser.id;
    
    try {
      addLog(userId, 'Answering incoming call...');
      
      // Let the other user know we're answering
      sendToPeer(userId, {
        type: 'call-accepted'
      });
      
      setCallState(prev => ({ ...prev, [userId]: 'connected' }));
      addLog(userId, 'Call connected');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to answer call: ${errorMessage}`);
      setErrors(prev => ({ ...prev, [userId]: `Answer failed: ${errorMessage}` }));
    }
  };
  
  // Reject an incoming call
  const rejectCall = () => {
    const userId = activeUser.id;
    
    try {
      addLog(userId, 'Rejecting incoming call...');
      
      sendToPeer(userId, {
        type: 'call-rejected'
      });
      
      setCallState(prev => ({ ...prev, [userId]: 'idle' }));
      addLog(userId, 'Call rejected');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to reject call: ${errorMessage}`);
    }
  };
  
  // End the current call
  const endCall = () => {
    const userId = activeUser.id;
    
    try {
      addLog(userId, 'Ending call...');
      
      sendToPeer(userId, {
        type: 'call-ended'
      });
      
      cleanupPeerConnection(userId);
      setCallState(prev => ({ ...prev, [userId]: 'idle' }));
      addLog(userId, 'Call ended');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to end call: ${errorMessage}`);
    }
  };
  
  // Toggle microphone mute
  const toggleMute = () => {
    const userId = activeUser.id;
    
    try {
      const stream = localStreams[userId];
      if (!stream) {
        addLog(userId, 'No local stream available');
        return;
      }
      
      const newMuteState = !muted[userId];
      
      stream.getAudioTracks().forEach(track => {
        track.enabled = !newMuteState;
      });
      
      setMuted(prev => ({ ...prev, [userId]: newMuteState }));
      addLog(userId, newMuteState ? 'Microphone muted' : 'Microphone unmuted');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to toggle mute: ${errorMessage}`);
    }
  };
  
  // Toggle speaker mute
  const toggleSpeakerMute = () => {
    const userId = activeUser.id;
    const otherUserId = userId === USER_1.id ? USER_2.id : USER_1.id;
    
    try {
      const audioElement = audioRefs.current[otherUserId];
      if (!audioElement) {
        addLog(userId, 'No audio element for other user');
        return;
      }
      
      const newMuteState = !speakerMuted[userId];
      audioElement.muted = newMuteState;
      
      setSpeakerMuted(prev => ({ ...prev, [userId]: newMuteState }));
      addLog(userId, newMuteState ? 'Speaker muted' : 'Speaker unmuted');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(userId, `Failed to toggle speaker: ${errorMessage}`);
    }
  };
  
  // Clean up peer connection
  const cleanupPeerConnection = (userId: number) => {
    const pc = peerConnections.current[userId];
    if (pc) {
      pc.close();
      peerConnections.current[userId] = null;
      addLog(userId, 'Peer connection closed');
    }
    
    // Clear ICE candidate queue
    iceCandidateQueue.current[userId] = [];
  };
  
  // Full cleanup of resources
  const cleanupResources = (userId: number) => {
    // Close peer connection
    cleanupPeerConnection(userId);
    
    // Stop media tracks
    if (localStreams[userId]) {
      localStreams[userId]?.getTracks().forEach(track => track.stop());
      setLocalStreams(prev => ({ ...prev, [userId]: null }));
    }
    
    // Close WebSocket
    if (socketRefs.current[userId]) {
      socketRefs.current[userId]?.close();
      socketRefs.current[userId] = null;
      setWsConnected(prev => ({ ...prev, [userId]: false }));
    }
    
    // Reset state
    setCallState(prev => ({ ...prev, [userId]: 'idle' }));
    setErrors(prev => ({ ...prev, [userId]: null }));
    setMuted(prev => ({ ...prev, [userId]: false }));
    setSpeakerMuted(prev => ({ ...prev, [userId]: false }));
    addLog(userId, 'All resources cleaned up');
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Cleanup both user's resources
      [USER_1.id, USER_2.id].forEach(userId => {
        if (localStreams[userId]) {
          localStreams[userId]?.getTracks().forEach(track => track.stop());
        }
        
        if (peerConnections.current[userId]) {
          peerConnections.current[userId]?.close();
        }
        
        if (socketRefs.current[userId]) {
          socketRefs.current[userId]?.close();
        }
      });
    };
  }, [localStreams]);
  
  // Determine call button state and icon
  const getCallActionButton = () => {
    const userId = activeUser.id;
    const callStateValue = callState[userId];
    
    switch (callStateValue) {
      case 'idle':
        return (
          <Button onClick={startCall} disabled={!wsConnected[userId] || !localStreams[userId]}>
            <Phone className="h-4 w-4 mr-2" />
            Call {otherUser.name}
          </Button>
        );
        
      case 'calling':
        return (
          <Button variant="destructive" onClick={endCall}>
            <PhoneOff className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        );
        
      case 'ringing':
        return (
          <div className="flex gap-2">
            <Button variant="destructive" onClick={rejectCall}>
              <PhoneOff className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button variant="default" onClick={answerCall}>
              <Phone className="h-4 w-4 mr-2" />
              Answer
            </Button>
          </div>
        );
        
      case 'connected':
        return (
          <Button variant="destructive" onClick={endCall}>
            <PhoneOff className="h-4 w-4 mr-2" />
            End Call
          </Button>
        );
        
      case 'ended':
        return (
          <Button onClick={startCall} disabled={!wsConnected[userId] || !localStreams[userId]}>
            <Phone className="h-4 w-4 mr-2" />
            Call Again
          </Button>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Match Call Test Simulator</h1>
        <Button onClick={switchUser} variant="outline">
          Switch to {otherUser.name}
        </Button>
      </div>
      
      <div className="mb-6 p-4 border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground">
          This page simulates a call between two users. Use the "Switch" button to change between the two users.
          For a real test, log in as one user in this browser and as another user in a different browser or device.
        </p>
      </div>
      
      <Tabs defaultValue={USER_1.id.toString()} value={activeUser.id.toString()} className="mb-8">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger 
            value={USER_1.id.toString()} 
            onClick={() => {
              setActiveUser(USER_1);
              setOtherUser(USER_2);
            }}
            className="flex items-center justify-center gap-2"
          >
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: USER_1.color }}></div>
            {USER_1.name}
          </TabsTrigger>
          <TabsTrigger 
            value={USER_2.id.toString()} 
            onClick={() => {
              setActiveUser(USER_2);
              setOtherUser(USER_1);
            }}
            className="flex items-center justify-center gap-2"
          >
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: USER_2.color }}></div>
            {USER_2.name}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeUser.id.toString()} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Call control panel */}
            <Card>
              <CardHeader style={{ borderColor: activeUser.color }}>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: activeUser.color }}></div>
                  {activeUser.name}'s Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {errors[activeUser.id] && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errors[activeUser.id]}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    <p><strong>Connection:</strong> {wsConnected[activeUser.id] ? 'Connected' : 'Disconnected'}</p>
                    <p><strong>Microphone:</strong> {localStreams[activeUser.id] ? 'Enabled' : 'Disabled'}</p>
                    <p><strong>Call Status:</strong> {callState[activeUser.id]}</p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Step 1: Initialize Connection</p>
                    <Button 
                      onClick={initializeCall} 
                      variant={wsConnected[activeUser.id] && localStreams[activeUser.id] ? "outline" : "default"}
                      disabled={!loggedInUser}
                    >
                      {wsConnected[activeUser.id] && localStreams[activeUser.id] ? 'Initialized' : 'Initialize'}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Step 2: Call Controls</p>
                    {getCallActionButton()}
                  </div>
                  
                  {callState[activeUser.id] === 'connected' && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Audio Controls</p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={toggleMute} 
                          variant="outline"
                          size="sm"
                        >
                          {muted[activeUser.id] ? (
                            <><MicOff className="h-4 w-4 mr-2" /> Unmute</>
                          ) : (
                            <><Mic className="h-4 w-4 mr-2" /> Mute</>
                          )}
                        </Button>
                        
                        <Button 
                          onClick={toggleSpeakerMute} 
                          variant="outline"
                          size="sm"
                        >
                          {speakerMuted[activeUser.id] ? (
                            <><Volume2 className="h-4 w-4 mr-2" /> Unmute Speaker</>
                          ) : (
                            <><VolumeX className="h-4 w-4 mr-2" /> Mute Speaker</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button onClick={() => cleanupResources(activeUser.id)} variant="outline" className="ml-auto">
                  Reset
                </Button>
              </CardFooter>
            </Card>
            
            {/* Log panel */}
            <Card>
              <CardHeader style={{ borderColor: activeUser.color }}>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: activeUser.color }}></div>
                  {activeUser.name}'s Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="bg-black/90 text-green-400 font-mono text-xs p-4 rounded-md h-[400px] overflow-y-auto"
                  style={{ borderLeft: `4px solid ${activeUser.color}` }}
                >
                  {logs[activeUser.id]?.length === 0 ? (
                    <p className="text-gray-500">No logs yet. Initialize connection to begin.</p>
                  ) : (
                    logs[activeUser.id]?.map((log, index) => (
                      <div key={index} className="mb-1">{log}</div>
                    ))
                  )}
                  <div ref={(el) => logEnds.current[activeUser.id] = el} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Audio elements - hidden but functional */}
      <audio 
        ref={(el) => audioRefs.current[USER_1.id] = el} 
        autoPlay 
        className="hidden" 
      />
      <audio 
        ref={(el) => audioRefs.current[USER_2.id] = el} 
        autoPlay 
        className="hidden" 
      />
    </div>
  );
}