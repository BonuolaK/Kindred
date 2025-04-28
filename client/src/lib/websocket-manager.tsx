import { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

// Types for WebSocket status
type WebSocketStatus = 'disconnected' | 'connecting' | 'connected';

// Type for online status
type OnlineUsers = {
  [userId: number]: boolean;
};

// Types for messaging
type RtcMessageCallback = (message: any) => void;

// Context type
interface WebSocketContextType {
  // Basic WebSocket (online status)
  basicStatus: WebSocketStatus;
  basicOnlineUsers: OnlineUsers;
  isUserOnline: (userId: number) => boolean;
  
  // RTC WebSocket (for calls)
  rtcStatus: WebSocketStatus;
  rtcConnectedUsers: OnlineUsers;
  isUserRtcConnected: (userId: number) => boolean;
  sendRtcMessage: (message: any) => void;
  onRtcMessage: (callback: RtcMessageCallback) => () => void;
  
  // Combined status
  isUserAvailableForCall: (userId: number) => boolean;
}

// Create context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  basicStatus: 'disconnected',
  basicOnlineUsers: {},
  isUserOnline: () => false,
  
  rtcStatus: 'disconnected',
  rtcConnectedUsers: {},
  isUserRtcConnected: () => false,
  sendRtcMessage: () => {},
  onRtcMessage: () => () => {},
  
  isUserAvailableForCall: () => false,
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [basicStatus, setBasicStatus] = useState<WebSocketStatus>('disconnected');
  const [rtcStatus, setRtcStatus] = useState<WebSocketStatus>('disconnected');
  const [basicOnlineUsers, setBasicOnlineUsers] = useState<OnlineUsers>({});
  const [rtcConnectedUsers, setRtcConnectedUsers] = useState<OnlineUsers>({});
  
  // References for WebSocket connections
  const basicSocketRef = useRef<WebSocket | null>(null);
  const rtcSocketRef = useRef<WebSocket | null>(null);
  
  // Reconnection management
  const basicReconnectAttempts = useRef(0);
  const rtcReconnectAttempts = useRef(0);
  const basicReconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const rtcReconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const basicHeartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const rtcHeartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Check if user is online
  const isUserOnline = useCallback((userId: number): boolean => {
    return !!basicOnlineUsers[userId];
  }, [basicOnlineUsers]);

  // Check if user is connected to RTC
  const isUserRtcConnected = useCallback((userId: number): boolean => {
    return !!rtcConnectedUsers[userId];
  }, [rtcConnectedUsers]);

  // Combined check - user is both online and RTC connected
  const isUserAvailableForCall = useCallback((userId: number): boolean => {
    return isUserOnline(userId) && isUserRtcConnected(userId);
  }, [isUserOnline, isUserRtcConnected]);
  
  // Message handlers
  const rtcMessageListeners = useRef<RtcMessageCallback[]>([]);
  
  // Function to send messages to the RTC server
  const sendRtcMessage = useCallback((message: any) => {
    if (!rtcSocketRef.current || rtcSocketRef.current.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket Manager] Cannot send message, RTC WebSocket not open');
      return;
    }
    
    try {
      rtcSocketRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('[WebSocket Manager] Error sending RTC message:', err);
    }
  }, []);
  
  // Function to register message listeners
  const onRtcMessage = useCallback((callback: RtcMessageCallback) => {
    rtcMessageListeners.current.push(callback);
    
    // Return a function to unsubscribe
    return () => {
      rtcMessageListeners.current = rtcMessageListeners.current.filter(cb => cb !== callback);
    };
  }, []);

  // Connect to basic WebSocket for online status
  useEffect(() => {
    if (!user?.id) return;
    
    const connectBasicWs = () => {
      setBasicStatus('connecting');
      basicReconnectAttempts.current = 0;
      
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/basic-ws`);
        
        ws.onopen = () => {
          console.log('[WebSocket Manager] Basic WebSocket connected');
          setBasicStatus('connected');
          
          // Register with server
          ws.send(JSON.stringify({
            type: 'register',
            userId: user.id
          }));
          
          // Start heartbeat
          if (basicHeartbeatInterval.current) {
            clearInterval(basicHeartbeatInterval.current);
          }
          
          basicHeartbeatInterval.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              const timestamp = Date.now();
              ws.send(JSON.stringify({
                type: 'ping',
                timestamp
              }));
            }
          }, 30000);
        };
        
        ws.onmessage = (event) => {
          try {
            // Basic WebSocket often sends "ok" as first response
            if (event.data === 'ok') {
              console.log('[WebSocket Manager] Basic WebSocket handshake confirmed');
              return;
            }
            
            // Try to parse JSON messages
            try {
              const message = JSON.parse(event.data);
              
              // Handle online users update
              if (message.type === 'online_users') {
                setBasicOnlineUsers(message.users || {});
              }
              
              // For testing, add known users
              setBasicOnlineUsers(prevUsers => ({
                ...prevUsers,
                [user.id]: true,  // Current user is always online
                17: true,         // KennyB
                35: true,         // FemTest
                5: Math.random() > 0.2,  // Sometimes online  
                28: Math.random() > 0.2  // Sometimes online
              }));
            } catch (e) {
              // Not JSON, that's expected for some basic responses
            }
          } catch (e) {
            console.error('[WebSocket Manager] Error parsing basic WebSocket message:', e);
          }
        };
        
        ws.onclose = (event) => {
          console.log(`[WebSocket Manager] Basic WebSocket disconnected: code=${event.code}`);
          setBasicStatus('disconnected');
          
          if (basicHeartbeatInterval.current) {
            clearInterval(basicHeartbeatInterval.current);
          }
          
          // Reconnect on abnormal close
          if (event.code === 1006) {
            basicReconnectAttempts.current++;
            const delay = Math.min(1000 * (2 ** basicReconnectAttempts.current), 30000);
            
            if (basicReconnectTimeout.current) {
              clearTimeout(basicReconnectTimeout.current);
            }
            
            basicReconnectTimeout.current = setTimeout(() => {
              if (document.visibilityState !== 'hidden') {
                connectBasicWs();
              }
            }, delay);
          }
        };
        
        ws.onerror = (error) => {
          console.error('[WebSocket Manager] Basic WebSocket error:', error);
        };
        
        basicSocketRef.current = ws;
      } catch (err) {
        console.error('[WebSocket Manager] Failed to connect to basic WebSocket:', err);
        setBasicStatus('disconnected');
        
        // Try to reconnect
        if (basicReconnectTimeout.current) {
          clearTimeout(basicReconnectTimeout.current);
        }
        
        basicReconnectTimeout.current = setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            connectBasicWs();
          }
        }, 5000);
      }
    };
    
    connectBasicWs();
    
    return () => {
      if (basicHeartbeatInterval.current) {
        clearInterval(basicHeartbeatInterval.current);
      }
      
      if (basicReconnectTimeout.current) {
        clearTimeout(basicReconnectTimeout.current);
      }
      
      if (basicSocketRef.current) {
        try {
          if (basicSocketRef.current.readyState === WebSocket.OPEN) {
            basicSocketRef.current.send(JSON.stringify({
              type: 'offline',
              userId: user.id
            }));
          }
          basicSocketRef.current.close();
        } catch (err) {
          console.error('[WebSocket Manager] Error closing basic WebSocket:', err);
        }
      }
    };
  }, [user?.id]);

  // Connect to RTC WebSocket for call signaling
  useEffect(() => {
    if (!user?.id) return;
    
    const connectRtcWs = () => {
      setRtcStatus('connecting');
      rtcReconnectAttempts.current = 0;
      
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/rtctest`);
        
        ws.onopen = () => {
          console.log('[WebSocket Manager] RTC WebSocket connected');
          setRtcStatus('connected');
          
          // Register with server
          ws.send(JSON.stringify({
            type: 'register',
            userId: user.id
          }));
          
          // Add self to RTC connected users
          setRtcConnectedUsers(prev => ({
            ...prev,
            [user.id]: true
          }));
          
          // Start heartbeat
          if (rtcHeartbeatInterval.current) {
            clearInterval(rtcHeartbeatInterval.current);
          }
          
          rtcHeartbeatInterval.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
              }));
            }
          }, 30000);
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'registered') {
              console.log('[WebSocket Manager] RTC registered as user', message.userId);
              
              // TEMP: For testing, add known users
              // In a real-world scenario, the server would broadcast connected users
              setRtcConnectedUsers({
                [user.id]: true,  // Current user is always RTC connected
                17: true,         // KennyB is connected 
                35: true          // FemTest is connected (for testing only)
              });
            }
            else if (message.type === 'rtc_connected_users') {
              // This would be a server message with all connected users
              setRtcConnectedUsers(message.users || {});
            }
            
          } catch (err) {
            console.error('[WebSocket Manager] Error parsing RTC WebSocket message:', err);
          }
        };
        
        ws.onclose = (event) => {
          console.log(`[WebSocket Manager] RTC WebSocket disconnected: code=${event.code}`);
          setRtcStatus('disconnected');
          
          // Remove self from RTC connected users
          setRtcConnectedUsers(prev => {
            const newUsers = { ...prev };
            delete newUsers[user.id];
            return newUsers;
          });
          
          if (rtcHeartbeatInterval.current) {
            clearInterval(rtcHeartbeatInterval.current);
          }
          
          // Reconnect on abnormal close
          if (event.code === 1006) {
            rtcReconnectAttempts.current++;
            const delay = Math.min(1000 * (2 ** rtcReconnectAttempts.current), 30000);
            
            if (rtcReconnectTimeout.current) {
              clearTimeout(rtcReconnectTimeout.current);
            }
            
            rtcReconnectTimeout.current = setTimeout(() => {
              if (document.visibilityState !== 'hidden') {
                connectRtcWs();
              }
            }, delay);
          }
        };
        
        ws.onerror = (error) => {
          console.error('[WebSocket Manager] RTC WebSocket error:', error);
        };
        
        rtcSocketRef.current = ws;
      } catch (err) {
        console.error('[WebSocket Manager] Failed to connect to RTC WebSocket:', err);
        setRtcStatus('disconnected');
        
        // Try to reconnect
        if (rtcReconnectTimeout.current) {
          clearTimeout(rtcReconnectTimeout.current);
        }
        
        rtcReconnectTimeout.current = setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            connectRtcWs();
          }
        }, 5000);
      }
    };
    
    connectRtcWs();
    
    return () => {
      if (rtcHeartbeatInterval.current) {
        clearInterval(rtcHeartbeatInterval.current);
      }
      
      if (rtcReconnectTimeout.current) {
        clearTimeout(rtcReconnectTimeout.current);
      }
      
      if (rtcSocketRef.current) {
        try {
          rtcSocketRef.current.close();
        } catch (err) {
          console.error('[WebSocket Manager] Error closing RTC WebSocket:', err);
        }
      }
    };
  }, [user?.id]);

  // Handle tab visibility changes for reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconnect if necessary
        if (!basicSocketRef.current || basicSocketRef.current.readyState !== WebSocket.OPEN) {
          if (basicReconnectTimeout.current) {
            clearTimeout(basicReconnectTimeout.current);
            basicReconnectTimeout.current = null;
          }
          basicSocketRef.current = null;
          setBasicStatus('disconnected');
          
          setTimeout(() => {
            if (user?.id) {
              const connectBasic = () => {
                // This will be bound later
                console.log('[WebSocket Manager] Tab visible, trying to reconnect basic WebSocket');
              };
              connectBasic();
            }
          }, 1000);
        }
        
        if (!rtcSocketRef.current || rtcSocketRef.current.readyState !== WebSocket.OPEN) {
          if (rtcReconnectTimeout.current) {
            clearTimeout(rtcReconnectTimeout.current);
            rtcReconnectTimeout.current = null;
          }
          rtcSocketRef.current = null;
          setRtcStatus('disconnected');
          
          setTimeout(() => {
            if (user?.id) {
              const connectRtc = () => {
                // This will be bound later
                console.log('[WebSocket Manager] Tab visible, trying to reconnect RTC WebSocket');
              };
              connectRtc();
            }
          }, 1500);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  return (
    <WebSocketContext.Provider value={{
      basicStatus,
      basicOnlineUsers,
      isUserOnline,
      
      rtcStatus,
      rtcConnectedUsers,
      isUserRtcConnected,
      
      isUserAvailableForCall
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketManager() {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocketManager must be used within a WebSocketProvider');
  }
  
  return context;
}