// server/basic-ws.ts
import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

/**
 * A basic WebSocket server with minimal functionality for testing
 */
export function setupBasicWebSocketServer(httpServer: HttpServer) {
  // Initialize a simple WebSocket server with minimal options
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/basic-ws',
    // Use minimal options to avoid potential issues
    clientTracking: true,
    perMessageDeflate: false // Disable compression for better reliability
  });
  
  console.log("Basic WebSocket server initialized on path: /basic-ws");

  // Simple connection tracking
  let connectionCount = 0;
  
  // Handle connection events
  wss.on('connection', (ws: WebSocket) => {
    connectionCount++;
    console.log(`[Basic WS] Client connected (total: ${connectionCount})`);
    
    // Skip sending a welcome message initially
    
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