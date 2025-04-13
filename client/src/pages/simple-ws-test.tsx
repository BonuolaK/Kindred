import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SimpleWsTest() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    // Determine the WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/basic-ws`;
    setUrl(wsUrl);
    
    return () => {
      // Clean up on component unmount
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket connection due to component unmount");
        socketRef.current.close();
      }
    };
  }, []);
  
  // Connect to WebSocket
  const connect = () => {
    try {
      if (!url) {
        setError("WebSocket URL is empty");
        return;
      }
      
      console.log(`Attempting to connect to: ${url}`);
      const ws = new WebSocket(url);
      socketRef.current = ws;
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
        setConnected(true);
        setError(null);
        setMessages((prev) => [...prev, "🟢 Connection established"]);
      };
      
      ws.onmessage = (event) => {
        console.log(`Received message: ${event.data}`);
        try {
          // Try to parse as JSON, but if it fails, just display the raw message
          const data = JSON.parse(event.data);
          setMessages((prev) => [...prev, `📥 Received: ${JSON.stringify(data, null, 2)}`]);
        } catch (e) {
          setMessages((prev) => [...prev, `📥 Received: ${event.data}`]);
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket connection closed with code: ${event.code}, reason: ${event.reason}`);
        setConnected(false);
        setMessages((prev) => [...prev, `🔴 Connection closed (code: ${event.code}${event.reason ? `, reason: ${event.reason}` : ''})`]);
      };
      
      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error. Check console for details.");
        setMessages((prev) => [...prev, "⚠️ Connection error"]);
      };
    } catch (err) {
      console.error("Error creating WebSocket connection:", err);
      setError(`Error creating WebSocket connection: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Disconnect from WebSocket
  const disconnect = () => {
    if (socketRef.current) {
      console.log("Manually closing WebSocket connection");
      socketRef.current.close();
      socketRef.current = null;
    }
  };
  
  // Send a message
  const sendMessage = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("WebSocket is not connected");
      return;
    }
    
    if (!inputValue.trim()) {
      setError("Message cannot be empty");
      return;
    }
    
    try {
      socketRef.current.send(inputValue);
      setMessages((prev) => [...prev, `📤 Sent: ${inputValue}`]);
      setInputValue("");
      setError(null);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(`Error sending message: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Send a ping message
  const sendPing = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("WebSocket is not connected");
      return;
    }
    
    try {
      const pingMessage = JSON.stringify({ type: "ping", timestamp: Date.now() });
      socketRef.current.send(pingMessage);
      setMessages((prev) => [...prev, `📤 Sent ping: ${pingMessage}`]);
      setError(null);
    } catch (err) {
      console.error("Error sending ping:", err);
      setError(`Error sending ping: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <Card className="w-full mx-auto mb-6 max-w-3xl">
        <CardHeader>
          <CardTitle>Simple WebSocket Test</CardTitle>
          <CardDescription>
            A basic WebSocket client for testing the connection to the server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <div className="font-medium">WebSocket URL</div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="WebSocket URL"
                disabled={connected}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={connect} 
                disabled={connected}
                variant={connected ? "outline" : "default"}
              >
                Connect
              </Button>
              <Button 
                onClick={disconnect} 
                disabled={!connected}
                variant="destructive"
              >
                Disconnect
              </Button>
              <Button 
                onClick={sendPing} 
                disabled={!connected}
                variant="outline"
              >
                Send Ping
              </Button>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="font-medium">
                {connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid gap-4">
            <div className="font-medium">Send Message</div>
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
                disabled={!connected}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />
              <Button 
                onClick={sendMessage} 
                disabled={!connected}
              >
                Send
              </Button>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid gap-2">
            <div className="font-medium">Message Log</div>
            <ScrollArea className="h-80 w-full rounded border p-4 bg-muted/20">
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className="whitespace-pre-wrap font-mono text-sm"
                    >
                      {msg}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}