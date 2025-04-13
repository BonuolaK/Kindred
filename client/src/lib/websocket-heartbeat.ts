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
  const delay = RECONNECTION_DELAY * Math.pow(1.5, ws.reconnectAttempts - 1); // Exponential backoff
  
  console.log(`[WebSocket] Attempting to reconnect (${ws.reconnectAttempts}/${MAX_RECONNECTION_ATTEMPTS}) in ${delay}ms`);
  
  setTimeout(() => {
    try {
      // Check if we're already reconnected
      if (ws.readyState === WebSocket.OPEN) return;
      
      // Instead of creating a recursive chain of websockets, use the same instance
      // but create a new underlying connection
      const oldUserId = ws.userId;
      const oldRoomId = ws.roomId;
      const oldReconnectAttempts = ws.reconnectAttempts;
      const oldOnReconnect = ws.onReconnect;
      
      // Create and initialize a new WebSocket connection
      const rawWs = new WebSocket(url, protocols);
      
      // Copy the raw WebSocket properties to our existing wrapper
      Object.getOwnPropertyNames(rawWs).forEach(prop => {
        if (prop !== 'addEventListener' && prop !== 'removeEventListener') {
          try {
            // @ts-ignore - dynamically copying properties
            ws[prop] = rawWs[prop];
          } catch (e) {
            // Some properties might be read-only
          }
        }
      });
      
      // Restore our tracking properties
      ws.userId = oldUserId;
      ws.roomId = oldRoomId;
      ws.reconnectAttempts = oldReconnectAttempts;
      ws.onReconnect = oldOnReconnect;
      ws.heartbeatEnabled = true;
      ws.heartbeatInterval = null;
      ws.heartbeatTimeout = null;
      
      // Add listeners to the new raw websocket but have them call our wrapper's listeners
      rawWs.onopen = (event) => {
        console.log('[WebSocket] Reconnection successful');
        startHeartbeat(ws);
        
        // Re-register user if we have a user ID
        if (ws.userId) {
          console.log(`[WebSocket] Re-registering user ${ws.userId} after reconnection`);
          try {
            ws.send(JSON.stringify({
              type: 'register',
              userId: ws.userId
            }));
          } catch (error) {
            console.error('[WebSocket] Error re-registering user:', error);
          }
        }
        
        // Call the reconnect callback if available
        if (ws.onReconnect) {
          ws.onReconnect();
        }
        
        // Forward the event to any listeners on our wrapper
        const openEvent = new Event('open');
        ws.dispatchEvent(openEvent);
      };
      
      rawWs.onmessage = (event) => {
        // Create a simpler message event to avoid TypeScript readonly array issues
        const messageEvent = new MessageEvent('message', {
          data: event.data,
          origin: event.origin || '',
          lastEventId: event.lastEventId || ''
        });
        ws.dispatchEvent(messageEvent);
      };
      
      rawWs.onclose = (event) => {
        const closeEvent = new CloseEvent('close', {
          wasClean: event.wasClean,
          code: event.code,
          reason: event.reason
        });
        stopHeartbeat(ws);
        // Don't trigger reconnection from here, as it would be recursive
        ws.dispatchEvent(closeEvent);
        
        // If still not at max attempts, try again only for abnormal closures
        if (event.code !== 1000 && event.code !== 1001 && 
            ws.reconnectAttempts < MAX_RECONNECTION_ATTEMPTS) {
          attemptReconnect(ws, url, protocols);
        }
      };
      
      rawWs.onerror = (event) => {
        const errorEvent = new Event('error');
        ws.dispatchEvent(errorEvent);
      };
      
    } catch (error) {
      console.error('[WebSocket] Error during reconnection attempt:', error);
      // Try again if we haven't hit the limit
      if (ws.reconnectAttempts < MAX_RECONNECTION_ATTEMPTS) {
        setTimeout(() => {
          attemptReconnect(ws, url, protocols);
        }, delay);
      }
    }
  }, delay);
}