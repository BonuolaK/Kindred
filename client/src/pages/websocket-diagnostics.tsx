import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

export default function WebSocketDiagnostics() {
  const { user } = useAuth();
  const [generalWsStatus, setGeneralWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [rtcWsStatus, setRtcWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [basicWsStatus, setBasicWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  
  const generalWsRef = useRef<WebSocket | null>(null);
  const rtcWsRef = useRef<WebSocket | null>(null);
  const basicWsRef = useRef<WebSocket | null>(null);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };
  
  const testGeneralWebSocket = () => {
    if (!user?.id) {
      addLog('ERROR: Must be logged in to test WebSockets');
      return;
    }
    
    try {
      setGeneralWsStatus('connecting');
      addLog('Connecting to general WebSocket on /ws...');
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?t=${Date.now()}&uid=${user.id}`;
      
      if (generalWsRef.current) {
        generalWsRef.current.close();
      }
      
      const ws = new WebSocket(wsUrl);
      generalWsRef.current = ws;
      
      ws.onopen = () => {
        setGeneralWsStatus('connected');
        addLog('✅ Connected to general WebSocket!');
        
        // Send a test message
        ws.send(JSON.stringify({ type: 'register', userId: user.id }));
        addLog('Sent registration message to general WebSocket');
      };
      
      ws.onmessage = (event) => {
        addLog(`Received from general WS: ${event.data}`);
      };
      
      ws.onerror = (error) => {
        setGeneralWsStatus('error');
        addLog(`❌ General WebSocket error: ${JSON.stringify(error)}`);
      };
      
      ws.onclose = (event) => {
        setGeneralWsStatus('disconnected');
        addLog(`General WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`);
      };
      
    } catch (err) {
      setGeneralWsStatus('error');
      addLog(`❌ Error creating general WebSocket: ${err}`);
    }
  };
  
  const testRtcWebSocket = () => {
    if (!user?.id) {
      addLog('ERROR: Must be logged in to test WebSockets');
      return;
    }
    
    try {
      setRtcWsStatus('connecting');
      addLog('Connecting to RTC WebSocket on /rtc...');
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/rtc?t=${Date.now()}&uid=${user.id}`;
      
      if (rtcWsRef.current) {
        rtcWsRef.current.close();
      }
      
      const ws = new WebSocket(wsUrl);
      rtcWsRef.current = ws;
      
      ws.onopen = () => {
        setRtcWsStatus('connected');
        addLog('✅ Connected to RTC WebSocket!');
        
        // Send a test message
        ws.send(JSON.stringify({ type: 'register', userId: user.id }));
        addLog('Sent registration message to RTC WebSocket');
      };
      
      ws.onmessage = (event) => {
        addLog(`Received from RTC WS: ${event.data}`);
      };
      
      ws.onerror = (error) => {
        setRtcWsStatus('error');
        addLog(`❌ RTC WebSocket error: ${JSON.stringify(error)}`);
      };
      
      ws.onclose = (event) => {
        setRtcWsStatus('disconnected');
        addLog(`RTC WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`);
      };
      
    } catch (err) {
      setRtcWsStatus('error');
      addLog(`❌ Error creating RTC WebSocket: ${err}`);
    }
  };
  
  const testBasicWebSocket = () => {
    if (!user?.id) {
      addLog('ERROR: Must be logged in to test WebSockets');
      return;
    }
    
    try {
      setBasicWsStatus('connecting');
      addLog('Connecting to Basic WebSocket on /basic-ws...');
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/basic-ws?t=${Date.now()}&uid=${user.id}`;
      
      if (basicWsRef.current) {
        basicWsRef.current.close();
      }
      
      const ws = new WebSocket(wsUrl);
      basicWsRef.current = ws;
      
      ws.onopen = () => {
        setBasicWsStatus('connected');
        addLog('✅ Connected to Basic WebSocket!');
        
        // Send a test message
        ws.send('hello');
        addLog('Sent test message to Basic WebSocket');
      };
      
      ws.onmessage = (event) => {
        addLog(`Received from Basic WS: ${event.data}`);
      };
      
      ws.onerror = (error) => {
        setBasicWsStatus('error');
        addLog(`❌ Basic WebSocket error: ${JSON.stringify(error)}`);
      };
      
      ws.onclose = (event) => {
        setBasicWsStatus('disconnected');
        addLog(`Basic WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`);
      };
      
    } catch (err) {
      setBasicWsStatus('error');
      addLog(`❌ Error creating Basic WebSocket: ${err}`);
    }
  };
  
  const closeAllConnections = () => {
    if (generalWsRef.current) generalWsRef.current.close();
    if (rtcWsRef.current) rtcWsRef.current.close();
    if (basicWsRef.current) basicWsRef.current.close();
    addLog('All WebSocket connections closed');
  };
  
  useEffect(() => {
    // Clean up on unmount
    return () => {
      closeAllConnections();
    };
  }, []);
  
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">WebSocket Diagnostics</h1>
        
        <Alert>
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>
            This page helps diagnose WebSocket connection issues. 
            Click each button to test different WebSocket endpoints.
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>General WebSocket (/ws)</span>
                <div className={`h-3 w-3 rounded-full ${
                  generalWsStatus === 'connected' ? 'bg-green-500' :
                  generalWsStatus === 'connecting' ? 'bg-yellow-500' :
                  generalWsStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={testGeneralWebSocket}>Test Connection</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>RTC WebSocket (/rtc)</span>
                <div className={`h-3 w-3 rounded-full ${
                  rtcWsStatus === 'connected' ? 'bg-green-500' :
                  rtcWsStatus === 'connecting' ? 'bg-yellow-500' :
                  rtcWsStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={testRtcWebSocket}>Test Connection</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Basic WebSocket (/basic-ws)</span>
                <div className={`h-3 w-3 rounded-full ${
                  basicWsStatus === 'connected' ? 'bg-green-500' :
                  basicWsStatus === 'connecting' ? 'bg-yellow-500' :
                  basicWsStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={testBasicWebSocket}>Test Connection</Button>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Connection Logs</CardTitle>
            <Button variant="destructive" onClick={closeAllConnections}>Close All Connections</Button>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-sm border-b border-border py-1">{log}</div>
              ))}
              {logs.length === 0 && (
                <div className="text-muted-foreground text-center py-8">No logs yet. Test a connection to begin.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}