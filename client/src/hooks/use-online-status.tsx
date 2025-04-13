import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

type OnlineStatus = {
  [userId: number]: boolean;
};

type StatusMessage = {
  type: 'status';
  userId: number;
  online: boolean;
};

export function useOnlineStatus() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineStatus>({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  // Setup WebSocket connection
  useEffect(() => {
    if (!user?.id) return;
    
    let reconnectAttempts = 0;
    let heartbeatInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;
    
    const connect = () => {
      try {
        // Use the appropriate WebSocket endpoint with cache busting
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Add a cache buster to prevent caching issues
        const cacheBuster = Date.now();
        const wsUrl = `${protocol}//${window.location.host}/ws?t=${cacheBuster}`;
        
        if (socketRef.current) {
          // Clean up existing connection if it's still around
          try {
            socketRef.current.close();
          } catch (err) {
            // Ignore errors closing an already closed socket
          }
        }
        
        console.log('[Online Status] Attempting to connect to WebSocket...');
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;
        
        ws.onopen = () => {
          console.log('[Online Status] WebSocket connected successfully');
          setIsConnected(true);
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          
          // Register user as online
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'register',
                userId: user.id
              }));
              console.log('[Online Status] User registration sent');
            }
          } catch (err) {
            console.error('[Online Status] Error registering user:', err);
          }
          
          // Set up heartbeat - keep connection alive
          clearInterval(heartbeatInterval);
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: 'heartbeat' }));
              } catch (err) {
                console.error('[Online Status] Heartbeat error:', err);
              }
            }
          }, 15000); // Every 15 seconds
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Log the welcome message
            if (data.type === 'welcome') {
              console.log('[Online Status] Server welcomed client');
            }
            
            // Handle online status updates
            if (data.type === 'status') {
              const statusData = data as StatusMessage;
              console.log(`[Online Status] User ${statusData.userId} status: ${statusData.online ? 'online' : 'offline'}`);
              setOnlineUsers(prev => ({
                ...prev,
                [statusData.userId]: statusData.online
              }));
            }
            
            // Handle bulk status update (when first connecting)
            if (data.type === 'initialStatus' && Array.isArray(data.users)) {
              console.log(`[Online Status] Received initial status with ${data.users.length} online users`);
              const newOnlineUsers: OnlineStatus = {};
              data.users.forEach((userId: number) => {
                newOnlineUsers[userId] = true;
              });
              setOnlineUsers(newOnlineUsers);
            }
          } catch (e) {
            console.error('[Online Status] Error parsing message:', e);
          }
        };
        
        ws.onclose = (event) => {
          console.log(`[Online Status] WebSocket disconnected: code=${event.code}, reason=${event.reason || 'none'}, wasClean=${event.wasClean}`);
          setIsConnected(false);
          clearInterval(heartbeatInterval);
          
          // Handle abnormal closures (code 1006) with exponential backoff
          if (event.code === 1006) {
            reconnectAttempts++;
            const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000); // Exponential backoff with max 30s
            console.log(`[Online Status] Reconnect attempt ${reconnectAttempts} in ${delay}ms`);
            
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
              if (document.visibilityState !== 'hidden') {
                connect();
              }
            }, delay);
          }
        };
        
        ws.onerror = (event) => {
          console.error('[Online Status] WebSocket error:', event);
          // No action needed here as the onclose handler will be called after an error
        };
      } catch (err) {
        console.error('[Online Status] Failed to connect:', err);
        // Try to reconnect after a delay
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            connect();
          }
        }, 5000);
      }
    };
    
    // Initial connection
    connect();
    
    // Track tab visibility for reconnection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)) {
        console.log('[Online Status] Page became visible, attempting to reconnect');
        connect();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      clearTimeout(reconnectTimeout);
      
      if (socketRef.current) {
        try {
          if (socketRef.current.readyState === WebSocket.OPEN) {
            // Let the server know we're going offline before closing
            socketRef.current.send(JSON.stringify({
              type: 'offline',
              userId: user.id
            }));
          }
          socketRef.current.close();
        } catch (err) {
          console.error('[Online Status] Error during cleanup:', err);
        }
      }
    };
  }, [user?.id]);
  
  // Get online status for a specific user
  const isUserOnline = useCallback((userId: number): boolean => {
    return !!onlineUsers[userId];
  }, [onlineUsers]);
  
  // User is connected to the status service
  const isConnectedToStatusService = isConnected;
  
  return { isUserOnline, isConnectedToStatusService, onlineUsers };
}