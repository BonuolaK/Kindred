/**
 * WebSocket Heartbeat Utility
 * 
 * This utility helps maintain WebSocket connections in environments like Replit
 * where connections may be unstable or drop unexpectedly.
 */

// Maximum number of reconnection attempts
const MAX_RECONNECTION_ATTEMPTS = 5;

// Initial delay between reconnection attempts (milliseconds)
const RECONNECTION_DELAY = 2000;

// Heartbeat interval (milliseconds)
const HEARTBEAT_INTERVAL = 15000;

export interface WebSocketWithHeartbeat extends WebSocket {
  heartbeatInterval: number | null;
  reconnectAttempts: number;
  heartbeatEnabled: boolean;
  heartbeatTimeout: number | null;
  userId: number | null;
  roomId: string | null;
  onReconnect?: () => void;
}

/**
 * Creates a WebSocket connection with heartbeat support
 * 
 * @param url The WebSocket URL to connect to
 * @param protocols The WebSocket protocols to use
 * @returns A WebSocket with heartbeat functionality
 */
export function createWebSocketWithHeartbeat(
  url: string,
  protocols?: string | string[]
): WebSocketWithHeartbeat {
  // Create WebSocket connection
  const ws = new WebSocket(url, protocols) as WebSocketWithHeartbeat;
  
  // Initialize heartbeat properties
  ws.heartbeatInterval = null;
  ws.reconnectAttempts = 0;
  ws.heartbeatEnabled = true;
  ws.heartbeatTimeout = null;
  ws.userId = null;
  ws.roomId = null;
  
  // Set up heartbeat when connection opens
  ws.addEventListener('open', () => {
    console.log('[WebSocket] Connection established');
    startHeartbeat(ws);
    
    // Reset reconnection attempts on successful connection
    ws.reconnectAttempts = 0;
  });
  
  // Handle connection close
  ws.addEventListener('close', (event) => {
    console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason || ''}`);
    stopHeartbeat(ws);
    
    // Attempt to reconnect if closure wasn't intentional
    if (event.code !== 1000 && event.code !== 1001) {
      attemptReconnect(ws, url, protocols);
    }
  });
  
  // Handle errors
  ws.addEventListener('error', (event) => {
    console.error('[WebSocket] Connection error:', event);
    stopHeartbeat(ws);
  });
  
  return ws;
}

/**
 * Start the heartbeat for a WebSocket connection
 */
function startHeartbeat(ws: WebSocketWithHeartbeat): void {
  // Clear any existing heartbeat
  stopHeartbeat(ws);
  
  if (!ws.heartbeatEnabled) return;
  
  // Set up periodic heartbeat
  ws.heartbeatInterval = window.setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Sending heartbeat ping');
      
      // Send a ping message
      try {
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        
        // Set a timeout to detect if we don't get a response
        if (ws.heartbeatTimeout) {
          clearTimeout(ws.heartbeatTimeout);
        }
        
        ws.heartbeatTimeout = window.setTimeout(() => {
          console.warn('[WebSocket] No heartbeat response received, closing connection');
          ws.close(4000, 'Heartbeat timeout');
        }, 10000);
      } catch (error) {
        console.error('[WebSocket] Error sending heartbeat:', error);
        stopHeartbeat(ws);
        ws.close(4000, 'Heartbeat error');
      }
    } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      stopHeartbeat(ws);
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * Stop the heartbeat for a WebSocket connection
 */
function stopHeartbeat(ws: WebSocketWithHeartbeat): void {
  if (ws.heartbeatInterval) {
    clearInterval(ws.heartbeatInterval);
    ws.heartbeatInterval = null;
  }
  
  if (ws.heartbeatTimeout) {
    clearTimeout(ws.heartbeatTimeout);
    ws.heartbeatTimeout = null;
  }
}

/**
 * Attempt to reconnect a WebSocket connection
 */
function attemptReconnect(
  ws: WebSocketWithHeartbeat,
  url: string,
  protocols?: string | string[]
): void {
  if (ws.reconnectAttempts >= MAX_RECONNECTION_ATTEMPTS) {
    console.error('[WebSocket] Maximum reconnection attempts reached');
    return;
  }
  
  ws.reconnectAttempts++;
  const delay = RECONNECTION_DELAY * Math.min(2, ws.reconnectAttempts);
  
  console.log(`[WebSocket] Attempting to reconnect (${ws.reconnectAttempts}/${MAX_RECONNECTION_ATTEMPTS}) in ${delay}ms`);
  
  setTimeout(() => {
    // Check if we're already reconnected
    if (ws.readyState === WebSocket.OPEN) return;
    
    // Create a new connection
    const newWs = createWebSocketWithHeartbeat(url, protocols);
    
    // Transfer properties from old connection
    newWs.userId = ws.userId;
    newWs.roomId = ws.roomId;
    newWs.reconnectAttempts = ws.reconnectAttempts;
    newWs.onReconnect = ws.onReconnect;
    
    // Add event listener to handle registration after reconnection
    newWs.addEventListener('open', () => {
      // Re-register user if we have a user ID
      if (newWs.userId) {
        console.log(`[WebSocket] Re-registering user ${newWs.userId} after reconnection`);
        try {
          newWs.send(JSON.stringify({
            type: 'register',
            userId: newWs.userId
          }));
        } catch (error) {
          console.error('[WebSocket] Error re-registering user:', error);
        }
      }
      
      // Call the reconnect callback if available
      if (newWs.onReconnect) {
        newWs.onReconnect();
      }
    });
  }, delay);
}