import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { AlertTriangle, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Simple audio call test component that doesn't rely on the WebRTC service
export default function SimpleRtcTest() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [wsConnected, setWsConnected] = useState(false);
  
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const logEnd = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
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
  
  // Test WebSocket connection
  const testWebSocketConnection = () => {
    try {
      addLog('Testing WebSocket connection...');
      
      // Close any existing connection
      if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      addLog(`Connecting to ${wsUrl}`);
      
      socketRef.current = new WebSocket(wsUrl);
      
      socketRef.current.onopen = () => {
        addLog('WebSocket connection established successfully!');
        setWsConnected(true);
        
        // Register with the server
        if (user && socketRef.current) {
          const message = {
            type: 'register',
            userId: user.id
          };
          socketRef.current.send(JSON.stringify(message));
          addLog(`Sent registration message for user ${user.id}`);
        }
      };
      
      socketRef.current.onclose = (event) => {
        addLog(`WebSocket connection closed: code=${event.code}, reason="${event.reason || 'none'}"`);
        setWsConnected(false);
      };
      
      socketRef.current.onerror = (error) => {
        addLog(`WebSocket error occurred`);
        setError('WebSocket connection failed');
        setWsConnected(false);
      };
      
      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addLog(`Received message: ${JSON.stringify(data).substring(0, 100)}...`);
        } catch (e) {
          addLog(`Received non-JSON message: ${event.data.substring(0, 100)}...`);
        }
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error testing WebSocket: ${errorMessage}`);
      setError(`WebSocket test failed: ${errorMessage}`);
    }
  };
  
  // Test microphone access
  const testMicrophoneAccess = async () => {
    try {
      addLog('Testing microphone access...');
      
      // Stop any existing stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
      
      addLog(`Requesting user media with constraints: ${JSON.stringify(constraints)}`);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      addLog(`Microphone access granted! Got ${stream.getAudioTracks().length} audio tracks`);
      setLocalStream(stream);
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        addLog('Connected stream to audio element');
      }
      
      setStatus('mic-ready');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error accessing microphone: ${errorMessage}`);
      setError(`Microphone access failed: ${errorMessage}`);
    }
  };
  
  // Send a test ping message over WebSocket
  const sendPingMessage = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addLog('Cannot send ping: WebSocket not connected');
      return;
    }
    
    try {
      const message = {
        type: 'ping',
        timestamp: Date.now()
      };
      
      socketRef.current.send(JSON.stringify(message));
      addLog('Sent ping message');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error sending ping: ${errorMessage}`);
    }
  };
  
  // Clean up resources
  const cleanup = () => {
    // Stop media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setWsConnected(false);
    setStatus('idle');
    setError(null);
    addLog('Resources cleaned up');
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [localStream]);
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Simple WebRTC Test</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls panel */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                <p><strong>User ID:</strong> {user?.id || 'Not logged in'}</p>
                <p><strong>Status:</strong> {status}</p>
                <p><strong>WebSocket:</strong> {wsConnected ? 'Connected' : 'Disconnected'}</p>
                <p><strong>Microphone:</strong> {localStream ? 'Active' : 'Not active'}</p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 1: Test WebSocket Connection</p>
                <Button 
                  onClick={testWebSocketConnection}
                  variant={wsConnected ? "outline" : "default"}
                  disabled={!user}
                >
                  {wsConnected ? 'WebSocket Connected' : 'Test WebSocket'}
                </Button>
                
                {wsConnected && (
                  <Button onClick={sendPingMessage} variant="outline" size="sm" className="ml-2">
                    Send Ping
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 2: Test Microphone Access</p>
                <Button 
                  onClick={testMicrophoneAccess}
                  variant={localStream ? "outline" : "default"}
                  disabled={!user}
                >
                  {localStream ? 'Microphone Active' : 'Test Microphone'}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button onClick={cleanup} variant="outline" className="ml-auto">
              Clean Up Resources
            </Button>
          </CardFooter>
        </Card>
        
        {/* Log panel */}
        <Card>
          <CardHeader>
            <CardTitle>Test Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/90 text-green-400 font-mono text-xs p-4 rounded-md h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Start the tests to begin.</p>
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
      
      {/* Hidden audio element for local audio */}
      <audio ref={localAudioRef} autoPlay muted className="hidden" />
    </div>
  );
}