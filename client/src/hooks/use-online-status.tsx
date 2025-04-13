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

    const connect = () => {
      try {
        // Use the appropriate WebSocket endpoint
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;
        
        ws.onopen = () => {
          console.log('[Online Status] WebSocket connected');
          setIsConnected(true);
          
          // Register user as online
          ws.send(JSON.stringify({
            type: 'register',
            userId: user.id
          }));
          
          // Send heartbeat every 20 seconds to keep the connection alive
          const heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'heartbeat' }));
            }
          }, 20000);
          
          // Clear interval on cleanup
          return () => clearInterval(heartbeatInterval);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle online status updates
            if (data.type === 'status') {
              const statusData = data as StatusMessage;
              setOnlineUsers(prev => ({
                ...prev,
                [statusData.userId]: statusData.online
              }));
            }
            
            // Handle bulk status update (when first connecting)
            if (data.type === 'initialStatus' && Array.isArray(data.users)) {
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
          console.log(`[Online Status] WebSocket disconnected: ${event.code}`);
          setIsConnected(false);
          
          // Try to reconnect after a delay (exponential backoff would be better in production)
          setTimeout(() => {
            if (document.visibilityState !== 'hidden') {
              connect();
            }
          }, 3000);
        };
        
        ws.onerror = (event) => {
          console.error('[Online Status] WebSocket error:', event);
        };
      } catch (err) {
        console.error('[Online Status] Failed to connect:', err);
      }
    };
    
    connect();
    
    // Track tab visibility for reconnection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)) {
        connect();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Let the server know we're going offline before closing
        socketRef.current.send(JSON.stringify({
          type: 'offline',
          userId: user.id
        }));
        socketRef.current.close();
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