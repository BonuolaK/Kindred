import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RTCTestPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [roomId, setRoomId] = useState("test-room");
  
  const socketRef = useRef<WebSocket | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);
  
  // Connect to WebRTC signaling server
  const connectRTCSocket = () => {
    if (connected) {
      // Disconnect
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setConnected(false);
        addLog("WebRTC signaling disconnected");
      }
    } else {
      // Connect
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/rtc`;
        addLog(`Connecting to ${wsUrl}`);
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          addLog("WebRTC signaling connected");
          setConnected(true);
          
          // Register user with WebSocket server
          if (user?.id) {
            const registerMessage = {
              type: 'register',
              userId: user.id
            };
            socket.send(JSON.stringify(registerMessage));
            addLog(`Registered as user ${user.id}`);
          }
        };
        
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          addLog(`Received: ${JSON.stringify(data)}`);
          
          // Auto-join room on welcome message
          if (data.type === 'welcome') {
            setTimeout(() => {
              joinRoom();
            }, 1000);
          }
        };
        
        socket.onerror = (error) => {
          addLog(`Error: ${JSON.stringify(error)}`);
        };
        
        socket.onclose = (event) => {
          addLog(`Connection closed: code=${event.code}, reason=${event.reason}, clean=${event.wasClean}`);
          setConnected(false);
        };
        
        socketRef.current = socket;
      } catch (error) {
        addLog(`Connection error: ${error}`);
      }
    }
  };
  
  // Join a room
  const joinRoom = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addLog("Cannot join room - socket not connected");
      return;
    }
    
    try {
      const joinMessage = {
        type: 'join-room',
        roomId: roomId,
        userId: user?.id,
        metadata: { username: user?.username }
      };
      
      socketRef.current.send(JSON.stringify(joinMessage));
      addLog(`Joining room: ${roomId}`);
    } catch (error) {
      addLog(`Room join error: ${error}`);
    }
  };
  
  // Leave room
  const leaveRoom = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addLog("Cannot leave room - socket not connected");
      return;
    }
    
    try {
      const leaveMessage = {
        type: 'leave-room',
        userId: user?.id
      };
      
      socketRef.current.send(JSON.stringify(leaveMessage));
      addLog(`Leaving room`);
    } catch (error) {
      addLog(`Room leave error: ${error}`);
    }
  };
  
  // Send offer to target user
  const sendOffer = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addLog("Cannot send offer - socket not connected");
      return;
    }
    
    if (!targetUserId) {
      addLog("Cannot send offer - no target user ID");
      return;
    }
    
    try {
      // Create dummy offer data
      const dummyOffer = {
        type: 'offer',
        sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio\r\n'
      };
      
      const offerMessage = {
        type: 'offer',
        offer: dummyOffer,
        toUserId: parseInt(targetUserId, 10),
        matchId: 1
      };
      
      socketRef.current.send(JSON.stringify(offerMessage));
      addLog(`Sent offer to user ${targetUserId}`);
    } catch (error) {
      addLog(`Offer send error: ${error}`);
    }
  };
  
  // Send answer to target user
  const sendAnswer = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addLog("Cannot send answer - socket not connected");
      return;
    }
    
    if (!targetUserId) {
      addLog("Cannot send answer - no target user ID");
      return;
    }
    
    try {
      // Create dummy answer data
      const dummyAnswer = {
        type: 'answer',
        sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio\r\n'
      };
      
      const answerMessage = {
        type: 'answer',
        answer: dummyAnswer,
        toUserId: parseInt(targetUserId, 10)
      };
      
      socketRef.current.send(JSON.stringify(answerMessage));
      addLog(`Sent answer to user ${targetUserId}`);
    } catch (error) {
      addLog(`Answer send error: ${error}`);
    }
  };
  
  // Send ICE candidate to target user
  const sendIceCandidate = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addLog("Cannot send ICE candidate - socket not connected");
      return;
    }
    
    if (!targetUserId) {
      addLog("Cannot send ICE candidate - no target user ID");
      return;
    }
    
    try {
      // Create dummy ICE candidate
      const dummyCandidate = {
        candidate: 'candidate:1234567890 1 udp 2122260223 192.168.0.1 56789 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0
      };
      
      const candidateMessage = {
        type: 'ice-candidate',
        candidate: dummyCandidate,
        toUserId: parseInt(targetUserId, 10)
      };
      
      socketRef.current.send(JSON.stringify(candidateMessage));
      addLog(`Sent ICE candidate to user ${targetUserId}`);
    } catch (error) {
      addLog(`ICE candidate send error: ${error}`);
    }
  };
  
  // Add log message
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };
  
  return (
    <div className="container py-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>WebRTC Signaling Test Page</CardTitle>
          <CardDescription>
            Test WebRTC signaling connections and peer discovery
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={connectRTCSocket}
              variant={connected ? "destructive" : "default"}
            >
              {connected ? "Disconnect" : "Connect to RTC"}
            </Button>
            
            <div className="text-sm">
              Status: <span className={connected ? "text-green-500" : "text-red-500"}>
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            
            {user && (
              <div className="text-sm ml-auto">
                Logged in as: {user.username} (ID: {user.id})
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="font-medium">Room Management</div>
            
            <div className="flex gap-2">
              <Input 
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-32"
              />
              
              <Button onClick={joinRoom} disabled={!connected}>Join Room</Button>
              <Button onClick={leaveRoom} disabled={!connected} variant="outline">
                Leave Room
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="font-medium">Peer Communication</div>
            
            <div className="flex gap-2">
              <Input 
                placeholder="Target User ID"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-32"
              />
              
              <Button onClick={sendOffer} disabled={!connected}>Send Offer</Button>
              <Button onClick={sendAnswer} disabled={!connected} variant="outline">
                Send Answer
              </Button>
              <Button onClick={sendIceCandidate} disabled={!connected} variant="outline">
                Send ICE
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="font-medium">Log</div>
            
            <Card className="border border-gray-200">
              <ScrollArea className="h-64 w-full rounded-md" ref={logsRef}>
                <div className="p-4 font-mono text-sm whitespace-pre-wrap">
                  {logs.length ? logs.join('\n') : 'No logs yet...'}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setLogs([])}>
            Clear Logs
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}