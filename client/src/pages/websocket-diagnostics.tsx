import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function WebSocketDiagnostics() {
  const [activeTab, setActiveTab] = useState("basic");
  const [status, setStatus] = useState<{[key: string]: "disconnected" | "connecting" | "connected" | "error"}>({
    basic: "disconnected",
    main: "disconnected", 
    rtc: "disconnected"
  });
  const [logs, setLogs] = useState<{[key: string]: string[]}>({
    basic: [],
    main: [],
    rtc: []
  });
  const [errors, setErrors] = useState<{[key: string]: string | null}>({
    basic: null,
    main: null,
    rtc: null
  });
  
  // WebSocket references
  const wsRefs = useRef<{[key: string]: WebSocket | null}>({
    basic: null,
    main: null,
    rtc: null
  });
  
  // Define valid endpoint types to fix TypeScript errors
  type EndpointType = 'basic' | 'main' | 'rtc';
  
  // Connection configuration
  const endpoints: Record<EndpointType, string> = {
    basic: "/basic-ws",
    main: "/ws",
    rtc: "/rtc"
  };
  
  // Close connections on unmount
  useEffect(() => {
    return () => {
      Object.keys(wsRefs.current).forEach(key => {
        if (wsRefs.current[key] && wsRefs.current[key]?.readyState === WebSocket.OPEN) {
          wsRefs.current[key]?.close();
        }
      });
    };
  }, []);
  
  // Add log entry
  const addLog = (type: EndpointType, message: string) => {
    setLogs(prev => ({
      ...prev,
      [type]: [...prev[type], `${new Date().toISOString().substring(11, 23)} - ${message}`]
    }));
  };
  
  // Clear logs for a specific type
  const clearLogs = (type: EndpointType) => {
    setLogs(prev => ({
      ...prev,
      [type]: []
    }));
  };
  
  // Connect to a WebSocket endpoint
  const connect = (type: EndpointType) => {
    try {
      // Close existing connection if any
      if (wsRefs.current[type] && wsRefs.current[type]?.readyState !== WebSocket.CLOSED) {
        wsRefs.current[type]?.close();
      }
      
      // Reset error state
      setErrors(prev => ({ ...prev, [type]: null }));
      
      // Update status
      setStatus(prev => ({ ...prev, [type]: "connecting" }));
      addLog(type, `Connecting to ${endpoints[type]}...`);
      
      // Create WebSocket URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}${endpoints[type]}`;
      addLog(type, `WebSocket URL: ${wsUrl}`);
      
      // Create WebSocket instance with diagnostic instrumentation
      const ws = new WebSocket(wsUrl);
      
      // Instrument the WebSocket with a proxy to catch all exceptions
      const wsProxy = new Proxy(ws, {
        get: (target, prop) => {
          const value = Reflect.get(target, prop);
          if (typeof value === 'function') {
            return function(...args: any[]) {
              try {
                return value.apply(this === wsProxy ? target : this, args);
              } catch (err) {
                addLog(type, `Error in WebSocket.${String(prop)}: ${err}`);
                console.error(`[${type}] Error in WebSocket.${String(prop)}:`, err);
                return undefined;
              }
            };
          }
          return value;
        },
        set: (target, prop, value) => {
          try {
            return Reflect.set(target, prop, value);
          } catch (err) {
            addLog(type, `Error setting WebSocket.${String(prop)}: ${err}`);
            console.error(`[${type}] Error setting WebSocket.${String(prop)}:`, err);
            return false;
          }
        }
      });
      
      wsRefs.current[type] = ws;
      
      // Set up event listeners
      ws.onopen = (event) => {
        addLog(type, "Connection established");
        addLog(type, `Event details: ${JSON.stringify({
          type: event.type,
          target: { readyState: ws.readyState }
        })}`);
        setStatus(prev => ({ ...prev, [type]: "connected" }));
        
        // Send a simple test message
        setTimeout(() => {
          try {
            ws.send(JSON.stringify({ 
              type: "ping", 
              timestamp: Date.now(),
              client: "diagnostics"
            }));
            addLog(type, "Sent ping message");
          } catch (err) {
            addLog(type, `Error sending ping: ${err}`);
            setErrors(prev => ({ ...prev, [type]: `Error sending ping: ${err}` }));
          }
        }, 500);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addLog(type, `Received message: ${JSON.stringify(data)}`);
        } catch (err) {
          addLog(type, `Received raw message: ${event.data}`);
        }
      };
      
      ws.onclose = (event) => {
        addLog(type, `Connection closed: Code=${event.code}, Reason=${event.reason || 'none'}, Clean=${event.wasClean}`);
        
        // Add special handling for common close codes
        if (event.code === 1006) {
          addLog(type, "ERROR: Code 1006 indicates abnormal closure (server unreachable, connection dropped, or CORS issue)");
          setErrors(prev => ({ 
            ...prev, 
            [type]: "Abnormal closure (Code 1006). This usually indicates network issues, CORS problems, or server errors."
          }));
        } else if (event.code === 1001) {
          addLog(type, "INFO: Code 1001 indicates the endpoint is going away (server shutdown or restart)");
        } else if (event.code === 1009) {
          addLog(type, "ERROR: Code 1009 indicates message too large");
        } else if (event.code === 1011) {
          addLog(type, "ERROR: Code 1011 indicates server encountered an error");
        }
        
        setStatus(prev => ({ ...prev, [type]: "disconnected" }));
      };
      
      ws.onerror = (event) => {
        addLog(type, `WebSocket error`);
        // Inspect the raw error event for any clues
        try {
          addLog(type, `Error details: ${JSON.stringify({
            type: event.type,
            target: { readyState: ws.readyState },
            isTrusted: (event as any).isTrusted
          })}`);
        } catch (err) {
          addLog(type, `Error serializing error event: ${err}`);
        }
        
        // Check if CORS might be the issue
        if (window.location.protocol === "https:" && wsUrl.startsWith("wss:")) {
          addLog(type, "DIAGNOSTIC: Secure protocol being used, potential TLS/SSL certificate issues");
        }
        
        setStatus(prev => ({ ...prev, [type]: "error" }));
        setErrors(prev => ({ 
          ...prev, 
          [type]: "WebSocket connection error. Check console for details."
        }));
      };
      
      // Add instrumentation for browser events during connection
      window.addEventListener('offline', () => {
        addLog(type, "BROWSER NETWORK: Device went offline");
      }, { once: true });
      
      window.addEventListener('online', () => {
        addLog(type, "BROWSER NETWORK: Device is back online");
      }, { once: true });
      
    } catch (err) {
      addLog(type, `Exception creating WebSocket: ${err}`);
      setStatus(prev => ({ ...prev, [type]: "error" }));
      setErrors(prev => ({ ...prev, [type]: `Exception creating WebSocket: ${err}` }));
    }
  };
  
  // Disconnect from a WebSocket endpoint
  const disconnect = (type: string) => {
    if (wsRefs.current[type]) {
      try {
        addLog(type, "Manually closing connection...");
        wsRefs.current[type]?.close(1000, "User initiated disconnect");
        wsRefs.current[type] = null;
      } catch (err) {
        addLog(type, `Error closing connection: ${err}`);
      }
    }
  };
  
  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "connected": return "default";
      case "connecting": return "secondary";
      case "error": return "destructive";
      default: return "secondary";
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">WebSocket Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="basic">
                Basic WebSocket
                <Badge variant={getStatusVariant(status.basic)} className="ml-2">
                  {status.basic}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="main">
                Main WebSocket
                <Badge variant={getStatusVariant(status.main)} className="ml-2">
                  {status.main}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="rtc">
                RTC WebSocket
                <Badge variant={getStatusVariant(status.rtc)} className="ml-2">
                  {status.rtc}
                </Badge>
              </TabsTrigger>
            </TabsList>
            
            {Object.keys(endpoints).map(type => (
              <TabsContent key={type} value={type} className="space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">/{type} Endpoint</h3>
                    <p className="text-muted-foreground">
                      Test connection to the {type} WebSocket endpoint
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      onClick={() => connect(type)}
                      disabled={status[type] === "connecting" || status[type] === "connected"}
                      variant="default"
                    >
                      Connect
                    </Button>
                    <Button
                      onClick={() => disconnect(type)}
                      disabled={status[type] !== "connected" && status[type] !== "error"}
                      variant="outline"
                    >
                      Disconnect
                    </Button>
                    <Button
                      onClick={() => clearLogs(type)}
                      variant="ghost"
                      size="sm"
                    >
                      Clear Logs
                    </Button>
                  </div>
                </div>
                
                {errors[type] && (
                  <Alert variant="destructive">
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>{errors[type]}</AlertDescription>
                  </Alert>
                )}
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Connection Logs</CardTitle>
                  </CardHeader>
                  <Separator />
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px] w-full">
                      <div className="p-4 font-mono text-xs space-y-1">
                        {logs[type].length === 0 ? (
                          <div className="text-muted-foreground py-8 text-center">
                            No logs yet. Connect to see detailed logs.
                          </div>
                        ) : (
                          logs[type].map((log, index) => (
                            <div key={index} className="whitespace-pre-wrap">
                              {log}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                <div className="text-sm text-muted-foreground">
                  <p>Diagnostic information will be logged here. Check browser console for additional details.</p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}