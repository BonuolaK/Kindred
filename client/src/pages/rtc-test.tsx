import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { webRTCService, WebRTCEvent } from '@/lib/webrtc-service';

export default function RtcTestPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [step, setStep] = useState<number>(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string>('test-room');
  const [isMuted, setIsMuted] = useState(false);
  
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const logEnd = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Auto scroll logs to bottom
    if (logEnd.current) {
      logEnd.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };
  
  const initialize = async () => {
    try {
      addLog('Initializing WebRTC service...');
      if (!user) {
        setError('You must be logged in to use WebRTC');
        return;
      }
      
      await webRTCService.initialize(user.id, false);
      addLog('WebRTC service initialized successfully');
      setStep(1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error initializing WebRTC: ${errorMessage}`);
      setError(`Initialization failed: ${errorMessage}`);
    }
  };
  
  const getLocalStream = async () => {
    try {
      addLog('Requesting microphone access...');
      const stream = await webRTCService.getLocalStream();
      addLog('Microphone access granted');
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        addLog('Local audio stream connected to audio element');
      }
      
      setStep(2);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error accessing microphone: ${errorMessage}`);
      setError(`Microphone access failed: ${errorMessage}`);
    }
  };
  
  const joinRoom = async () => {
    try {
      addLog(`Joining room: ${roomId}`);
      await webRTCService.joinRoom(roomId);
      addLog(`Joined room: ${roomId}`);
      setConnected(true);
      setStep(3);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error joining room: ${errorMessage}`);
      setError(`Room join failed: ${errorMessage}`);
    }
  };
  
  const leaveRoom = async () => {
    try {
      addLog('Leaving room...');
      await webRTCService.leaveRoom();
      addLog('Left room');
      setConnected(false);
      setStep(2);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error leaving room: ${errorMessage}`);
    }
  };
  
  const toggleMute = () => {
    if (isMuted) {
      webRTCService.setAudioEnabled(true);
      addLog('Microphone unmuted');
    } else {
      webRTCService.setAudioEnabled(false);
      addLog('Microphone muted');
    }
    setIsMuted(!isMuted);
  };
  
  const cleanup = () => {
    addLog('Cleaning up WebRTC resources...');
    webRTCService.cleanup();
    setConnected(false);
    setStep(0);
    setError(null);
    setLogs([]);
  };
  
  // Set up event listeners
  useEffect(() => {
    const handleEvent = (event: WebRTCEvent) => {
      switch (event.type) {
        case 'connecting':
          addLog('WebRTC connecting...');
          break;
          
        case 'connected':
          addLog('WebRTC connected');
          break;
          
        case 'disconnected':
          addLog(`WebRTC disconnected${event.reason ? `: ${event.reason}` : ''}`);
          setConnected(false);
          break;
          
        case 'error':
          addLog(`WebRTC error: ${event.error.message}`);
          setError(event.error.message);
          break;
          
        case 'localStream':
          addLog('Local stream available');
          if (localAudioRef.current) {
            localAudioRef.current.srcObject = event.stream;
            localAudioRef.current.muted = true; // Prevent echo
          }
          break;
          
        case 'remoteStream':
          addLog('Remote stream received');
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.stream;
          }
          break;
          
        case 'roomJoined':
          addLog(`Joined room: ${event.roomId}, participants: ${event.participants.length}`);
          break;
          
        case 'participantJoined':
          addLog(`Participant joined: ${event.userId}`);
          break;
          
        case 'participantLeft':
          addLog(`Participant left: ${event.userId}`);
          break;
          
        case 'reconnecting':
          addLog(`Reconnecting... (attempt ${event.attempt})`);
          break;
          
        case 'iceStateChange':
          addLog(`ICE state changed: ${event.state}`);
          break;
          
        case 'connectionStateChange':
          addLog(`Connection state changed: ${event.state}`);
          break;
      }
    };
    
    const unsubscribe = webRTCService.addEventListener(handleEvent);
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      webRTCService.cleanup();
    };
  }, []);
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">WebRTC Connection Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Control panel */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-800 mb-4">
                  <p className="font-semibold">Error</p>
                  <p>{error}</p>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground mb-2">
                <p><strong>User ID:</strong> {user?.id || 'Not logged in'}</p>
                <p><strong>Current Step:</strong> {
                  step === 0 ? 'Not initialized' :
                  step === 1 ? 'Initialized' :
                  step === 2 ? 'Microphone access granted' :
                  step === 3 ? 'Connected to room' :
                  'Unknown'
                }</p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 1: Initialize WebRTC</p>
                <Button 
                  onClick={initialize} 
                  disabled={step > 0 || !user}
                  variant={step > 0 ? "outline" : "default"}
                >
                  Initialize
                </Button>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 2: Get Microphone Access</p>
                <Button 
                  onClick={getLocalStream} 
                  disabled={step < 1 || step > 1}
                  variant={step > 1 ? "outline" : "default"}
                >
                  Access Microphone
                </Button>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 3: Join Room</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder="Room ID"
                    disabled={step !== 2}
                  />
                  <Button 
                    onClick={joinRoom} 
                    disabled={step !== 2 || !roomId}
                    variant="default"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Join
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            {connected ? (
              <>
                <Button onClick={toggleMute} variant="outline">
                  {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button onClick={leaveRoom} variant="destructive">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Leave Room
                </Button>
              </>
            ) : (
              <Button onClick={cleanup} variant="outline" className="ml-auto">
                Reset
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Log panel */}
        <Card>
          <CardHeader>
            <CardTitle>Event Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/90 text-green-400 font-mono text-xs p-4 rounded-md h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No events yet. Initialize WebRTC to begin.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
              <div ref={logEnd} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Audio elements - hidden but functional */}
      <audio ref={localAudioRef} autoPlay muted className="hidden" />
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
    </div>
  );
}