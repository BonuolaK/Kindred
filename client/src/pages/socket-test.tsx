import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function SocketTestPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  
  const socketRef = useRef<WebSocket | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);
  
  // Connect/disconnect WebSocket
  const toggleConnection = () => {
    if (connected) {
      // Disconnect
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setConnected(false);
        addLog("WebSocket disconnected");
      }
    } else {
      // Connect
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        addLog(`Connecting to ${wsUrl}`);
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          addLog("WebSocket connected");
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
          addLog(`Received: ${event.data}`);
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
  
  // Send test message
  const sendMessage = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addLog("Cannot send message - socket not connected");
      return;
    }
    
    try {
      const testMessage = {
        type: 'test',
        text: message,
        fromUserId: user?.id,
        toUserId: parseInt(targetUserId, 10) || null
      };
      
      socketRef.current.send(JSON.stringify(testMessage));
      addLog(`Sent: ${JSON.stringify(testMessage)}`);
      setMessage("");
    } catch (error) {
      addLog(`Send error: ${error}`);
    }
  };
  
  // Simluate call initiation
  const initiateCall = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addLog("Cannot initiate call - socket not connected");
      return;
    }
    
    if (!targetUserId) {
      addLog("Cannot initiate call - no target user ID");
      return;
    }
    
    try {
      const callMessage = {
        type: 'call-initiate',
        fromUserId: user?.id,
        toUserId: parseInt(targetUserId, 10),
        matchId: 32, // Hard-coded for testing
        callDay: 1
      };
      
      socketRef.current.send(JSON.stringify(callMessage));
      addLog(`Call initiated to user ${targetUserId}`);
    } catch (error) {
      addLog(`Call initiation error: ${error}`);
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
          <CardTitle>WebSocket Test Page</CardTitle>
          <CardDescription>
            Test WebSocket connections and messaging
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={toggleConnection}
              variant={connected ? "destructive" : "default"}
            >
              {connected ? "Disconnect" : "Connect"}
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
            <div className="font-medium">Message</div>
            
            <div className="flex gap-2">
              <Input 
                placeholder="Target User ID"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-32"
              />
              
              <Input 
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              
              <Button onClick={sendMessage} disabled={!connected}>Send</Button>
              <Button onClick={initiateCall} disabled={!connected} variant="outline">
                Simulate Call
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