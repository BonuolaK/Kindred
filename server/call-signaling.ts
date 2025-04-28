// server/call-signaling.ts
import { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";

// Store active users and their socket IDs for call signaling
const signalUsers = new Map<number, WebSocket>();

/**
 * This is a specialized WebSocket server for handling call signaling
 * between users without relying on the existing socket.ts implementation
 */
export function setupCallSignalingServer(httpServer: HttpServer) {
  // Create WebSocket server with dedicated path for call signaling
  const callSignalingWss = new WebSocketServer({ 
    server: httpServer, 
    path: '/call-signaling'
  });
  console.log('Call Signaling WebSocket server initialized on path: /call-signaling');
  
  callSignalingWss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log(`[CALL-SIGNAL] Client connected to Call Signaling server`);
    let userId: number | null = null;
    
    // Handle messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`[CALL-SIGNAL] Received message:`, data);
        
        switch (data.type) {
          case 'register':
            // Register user connection
            userId = parseInt(data.userId, 10);
            if (!isNaN(userId)) {
              signalUsers.set(userId, ws);
              console.log(`[CALL-SIGNAL] User ${userId} registered with Call Signaling server (active users: ${signalUsers.size})`);
              
              // Send registration confirmation
              sendToClient(ws, {
                type: 'registered',
                userId: userId
              });
            } else {
              console.error(`[CALL-SIGNAL] Invalid userId received: ${data.userId}`);
              sendToClient(ws, {
                type: 'error',
                error: 'invalid_user_id',
                message: 'User ID must be a number'
              });
            }
            break;
            
          case 'call:request':
          case 'call:accept':
          case 'call:reject':
          case 'call:end':
          case 'call:missed':
            if (!userId) {
              sendToClient(ws, {
                type: 'error',
                error: 'unauthorized',
                message: 'You must register before sending call signals'
              });
              return;
            }
            
            // Forward call signaling messages to the target user
            const { callData } = data;
            
            if (!callData) {
              sendToClient(ws, {
                type: 'error',
                error: 'missing_data',
                message: 'Call data is required for call signaling'
              });
              return;
            }
            
            // Determine target user based on call data
            let targetUserId: number;
            if (userId === callData.initiatorId) {
              targetUserId = callData.receiverId;
            } else if (userId === callData.receiverId) {
              targetUserId = callData.initiatorId;
            } else {
              sendToClient(ws, {
                type: 'error',
                error: 'invalid_user',
                message: 'User is not part of this call'
              });
              return;
            }
            
            const targetWs = signalUsers.get(targetUserId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              console.log(`[CALL-SIGNAL] Forwarded ${data.type} from ${userId} to ${targetUserId}`);
              sendToClient(targetWs, data);
            } else {
              console.warn(`[CALL-SIGNAL] Target user ${targetUserId} not available`);
  
              sendToClient(ws, {
                type: 'error',
                error: 'target_unavailable',
                message: `Target user ${targetUserId} is not connected`
              });
            }
            break;
            
          default:
            console.warn(`[CALL-SIGNAL] Unknown message type: ${data.type}`);
            sendToClient(ws, {
              type: 'error',
              error: 'unknown_message_type',
              message: `Unknown message type: ${data.type}`
            });
        }
      } catch (error) {
        console.error('[CALL-SIGNAL] Error processing message:', error);
      }
    });
    
    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error(`[CALL-SIGNAL] WebSocket error for client ${userId ? `(User ${userId})` : ''}:`, error);
    });

    ws.on('close', () => {
      console.log(`[CALL-SIGNAL] Client disconnected ${userId ? `(User ${userId})` : ''}`);
      
      if (userId) {
        signalUsers.delete(userId);
      }
    });
  });
  
  return callSignalingWss;
}

function sendToClient(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('[CALL-SIGNAL] Error sending message:', error);
    }
  }
}