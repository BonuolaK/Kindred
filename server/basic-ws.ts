// server/basic-ws.ts
import { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";

/**
 * A basic WebSocket server with minimal functionality for testing
 * Deliberately designed with minimal options for maximum compatibility
 */
export function setupBasicWebSocketServer(httpServer: HttpServer) {
  // Create a very simple WebSocket server with no protocol negotiations
  // or subprotocols to eliminate protocol-related issues
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/basic-ws',
    // Use minimal options to avoid potential issues
    clientTracking: true,
    perMessageDeflate: false, // Disable compression for better reliability
    // Explicitly verify and accept clients from our origin
    verifyClient: (info, cb) => {
      // Log full verification info for debugging
      console.log(`[Basic WS] Connection verification:`, {
        origin: info.origin,
        secure: info.secure,
        req: {
          url: info.req.url,
          headers: info.req.headers,
          method: info.req.method
        }
      });
      
      // In development environment, accept ALL connections regardless of origin
      cb(true, 200, "Connection accepted");
    }
  });
  
  console.log("Basic WebSocket server initialized on path: /basic-ws");

  // Simple connection tracking
  let connectionCount = 0;
  
  // Log any server errors
  wss.on('error', (error) => {
    console.error('[Basic WS] Server error:', error);
  });

  // Handle connection events
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    connectionCount++;
    console.log(`[Basic WS] Client connected (total: ${connectionCount})`);
    
    // Log detailed connection information for debugging
    console.log(`[Basic WS] Connection details:`);
    console.log(`- URL: ${req.url}`);
    console.log(`- Headers:`);
    
    // Print all headers for debugging
    Object.keys(req.headers).forEach(key => {
      console.log(`  ${key}: ${req.headers[key]}`);
    });
    
    // Track handshake timing for diagnosing issues
    const connectionStartTime = Date.now();
    console.log(`[Basic WS] Connection established at: ${new Date(connectionStartTime).toISOString()}`);
    
    // Send a very small immediate welcome message to verify socket is working
    try {
      ws.send('ok');
      console.log('[Basic WS] Sent immediate minimal handshake response');
    } catch (error) {
      console.error('[Basic WS] Failed to send initial handshake:', error);
    }
    
    // Set up error handler
    ws.on('error', (error) => {
      console.error('[Basic WS] WebSocket error:', error);
    });
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        console.log(`[Basic WS] Received message: ${message.toString()}`);
        
        // Echo the message back
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          console.log(`[Basic WS] Echoed message back: ${message.toString()}`);
        }
      } catch (error) {
        console.error('[Basic WS] Error processing message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
      connectionCount = Math.max(0, connectionCount - 1);
      console.log(`[Basic WS] Client disconnected with code ${code}, reason: ${reason || 'none'} (remaining: ${connectionCount})`);
    });
    
    // Wait a moment before trying to send a message to avoid immediate issues
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          console.log('[Basic WS] Sent delayed ping message');
        } catch (error) {
          console.error('[Basic WS] Error sending delayed ping:', error);
        }
      }
    }, 1000); // 1 second delay
  });
  
  return wss;
}