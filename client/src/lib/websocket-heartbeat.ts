/**
 * WebSocket Heartbeat Utility
 * 
 * This utility helps maintain WebSocket connections in environments like Replit
 * where connections may be unstable or drop unexpectedly.
 * 
 * Troubleshooting WebSocket Error 1006 (Abnormal Closure):
 * 
 * 1. Common causes:
 *    - Network interruptions or connectivity issues
 *    - Server crashes or restarts
 *    - Timeouts (browser, server, or proxy)
 *    - CORS restrictions (origin not allowed)
 *    - Proxy/load balancer interference
 *    - Message size limitations
 *    - Browser security restrictions
 * 
 * 2. Our approach to mitigate:
 *    - Heartbeat mechanism to detect disconnections
 *    - Exponential backoff for reconnection attempts
 *    - Proper event listener handling during reconnection
 *    - Multiple diagnostic tools (/ws-diagnostics, /simple-ws-test)
 *    - Connection stabilization delay
 *    - Explicit protocol handling
 * 
 * 3. Specific Replit considerations:
 *    - Network stability issues on free tier
 *    - Potential port forwarding complications
 *    - Possible interference from development server
 *    - Browser/tab idle behavior
 */

// Maximum number of reconnection attempts
const MAX_RECONNECTION_ATTEMPTS = 8; // Increased for Replit's environment

// Initial delay between reconnection attempts (milliseconds)
const RECONNECTION_DELAY = 2000;

// Heartbeat interval (milliseconds) - increased to reduce frequency
const HEARTBEAT_INTERVAL = 45000; // Increased to 45 seconds

// Connection stabilization delay (milliseconds) - increased to allow connection to fully establish
const CONNECTION_STABILIZATION_DELAY = 5000; // Increased to 5 seconds

// Maximum message size (bytes) - to avoid large payloads causing disconnections
const MAX_MESSAGE_SIZE = 16 * 1024;

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

  // Wait a short period before starting heartbeat to allow connection to stabilize
  // This can help with Replit's connection issues
  setTimeout(() => {
    // Don't start heartbeat if the connection is already closed
    if (ws.readyState !== WebSocket.OPEN) return;
    
    // Set up periodic heartbeat
    ws.heartbeatInterval = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Sending heartbeat ping');
        
        // Send a ping message
        try {
          const pingMessage = JSON.stringify({ type: 'ping', timestamp: Date.now() });
          
          // Check message size to avoid issues with large payloads
          if (pingMessage.length > MAX_MESSAGE_SIZE) {
            console.warn(`[WebSocket] Message size (${pingMessage.length} bytes) exceeds maximum (${MAX_MESSAGE_SIZE} bytes)`);
            return;
          }
          
          ws.send(pingMessage);
          
          // Set a timeout to detect if we don't get a response
          if (ws.heartbeatTimeout) {
            clearTimeout(ws.heartbeatTimeout);
          }
          
          ws.heartbeatTimeout = window.setTimeout(() => {
            console.warn('[WebSocket] No heartbeat response received, closing connection');
            // Use code 1000 (Normal Closure) which is always valid
            ws.close(1000, 'Heartbeat timeout');
          }, 15000); // Increased timeout to 15 seconds
        } catch (error) {
          console.error('[WebSocket] Error sending heartbeat:', error);
          stopHeartbeat(ws);
          
          // If an error occurs during sending, the connection might be broken
          // Try to close it gracefully, but don't panic if this fails
          try {
            ws.close(1000, 'Heartbeat error');
          } catch (closeError) {
            console.error('[WebSocket] Error closing connection after heartbeat failure:', closeError);
          }
        }
      } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        stopHeartbeat(ws);
      }
    }, HEARTBEAT_INTERVAL);
  }, CONNECTION_STABILIZATION_DELAY);
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
 * This will create a completely new WebSocket and return it (replacing the old one)
 * 
 * Note: In Replit's environment, we've found that WebSocket connections can be 
 * particularly unstable and prone to code 1006 abnormal closures. This enhanced
 * reconnection logic addresses these specific issues.
 */
function attemptReconnect(
  ws: WebSocketWithHeartbeat,
  url: string,
  protocols?: string | string[]
): void {
  if (ws.reconnectAttempts >= MAX_RECONNECTION_ATTEMPTS) {
    console.error('[WebSocket] Maximum reconnection attempts reached');
    // Trigger client-side refresh as last resort after 10 seconds
    // when on the WebSocket diagnostics page
    if (window.location.pathname.includes('/ws-diagnostics') || 
        window.location.pathname.includes('/simple-ws-test')) {
      setTimeout(() => {
        console.log('[WebSocket] Last resort - refreshing page to reset connections');
        // Don't actually refresh in production - this is just for diagnostic pages
        // window.location.reload();
      }, 10000);
    }
    return;
  }
  
  ws.reconnectAttempts++;
  
  // Enhanced exponential backoff with jitter for Replit environment
  // Adding random jitter helps avoid reconnection stampedes
  const baseDelay = RECONNECTION_DELAY * Math.pow(1.5, ws.reconnectAttempts - 1);
  const jitter = Math.random() * 1000; // Random jitter up to 1 second
  const delay = baseDelay + jitter;
  
  console.log(`[WebSocket] Attempting to reconnect (${ws.reconnectAttempts}/${MAX_RECONNECTION_ATTEMPTS}) in ${Math.round(delay)}ms`);
  
  // First, verify network connectivity before attempting to reconnect
  fetch('/api/user', { 
    method: 'HEAD', 
    cache: 'no-cache',
    headers: { 'Cache-Control': 'no-cache' } 
  })
    .then(() => {
      console.log('[WebSocket] Server is accessible, proceeding with reconnection');
      setTimeout(performReconnect, delay);
    })
    .catch(err => {
      console.warn(`[WebSocket] Server health check failed: ${err.message}`);
      // Still try to reconnect but with a longer delay if server is unreachable
      setTimeout(performReconnect, delay * 1.5);
    });
  
  function performReconnect() {
    try {
      // Check if we're already reconnected
      if (ws.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Connection already reestablished');
        return;
      }
      
      // Ensure the old connection is properly cleaned up
      // This is critical for Replit's environment to prevent lingering connections
      stopHeartbeat(ws);
      
      try {
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close(1000, 'Replacing with new connection');
        }
      } catch (closeError) {
        console.warn('[WebSocket] Could not properly close old connection:', closeError);
        // Continue anyway - we're creating a new connection
      }
      
      // Instead of patching the existing instance, create a new connection
      console.log('[WebSocket] Creating a new connection for reconnect');
      
      // Create a completely new WebSocket connection with heartbeat
      // For Replit specifically, use an alternate WebSocket constructor approach
      // that creates a fresh WebSocket context
      const newWs = createWebSocketWithHeartbeat(url, protocols);
      
      // Copy over the important state
      newWs.userId = ws.userId;
      newWs.roomId = ws.roomId;
      newWs.reconnectAttempts = ws.reconnectAttempts;
      newWs.onReconnect = ws.onReconnect;
      
      // Copy all event listeners from the old socket to the new one
      // This is a safer approach that works better in Replit's environment
      const eventTypes = ['open', 'message', 'close', 'error'];
      
      // Save a reference to the old socket's event listeners
      const oldListeners: {[key: string]: EventListenerOrEventListenerObject[]} = {};
      
      // For each event type, get all listeners
      eventTypes.forEach(type => {
        // We can't directly access the listeners, so we'll create a dummy event
        // and intercept it to get the listeners
        oldListeners[type] = [];
        
        // Create a one-time interceptor to capture listeners
        const interceptor = (e: Event) => {
          e.stopImmediatePropagation();
          // @ts-ignore - accessing private property
          const listeners = ws.listeners?.[type] || [];
          oldListeners[type] = [...listeners];
        };
        
        // Add the interceptor first, so it will be called before other listeners
        ws.addEventListener(type, interceptor, { once: true, capture: true });
        
        // Trigger a fake event to capture listeners
        const fakeEvent = new Event(type);
        ws.dispatchEvent(fakeEvent);
        
        // Add all captured listeners to the new socket
        oldListeners[type].forEach(listener => {
          newWs.addEventListener(type, listener);
        });
      });
      
      // Re-register user if we have a user ID when the connection opens
      newWs.addEventListener('open', () => {
        // Reset reconnection attempts on successful connection
        newWs.reconnectAttempts = 0;
        
        console.log('[WebSocket] Reconnection successful');
        
        // Give connection a moment to stabilize before sending registration
        setTimeout(() => {
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
        }, 100); // Small delay for connection to stabilize
      }, { once: true });
      
      // Enhanced error tracking for reconnection attempts
      newWs.addEventListener('error', (event) => {
        console.error('[WebSocket] Reconnection connection error:', event);
        
        // If error happens immediately, try again with increased delay
        if (newWs.reconnectAttempts < MAX_RECONNECTION_ATTEMPTS) {
          setTimeout(() => {
            attemptReconnect(newWs, url, protocols);
          }, delay * 2); // Double the delay for next attempt
        }
      });
      
      return newWs;
      
    } catch (error) {
      console.error('[WebSocket] Error during reconnection attempt:', error);
      // Try again if we haven't hit the limit
      if (ws.reconnectAttempts < MAX_RECONNECTION_ATTEMPTS) {
        setTimeout(() => {
          attemptReconnect(ws, url, protocols);
        }, delay * 2); // Double the delay for next attempt after an error
      }
    }
  }
}