// server/socket.ts
import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// Store active users and their socket IDs
const users = new Map<number, WebSocket>();

// Store active calls
const activeCalls = new Map<string, {
  initiator: number;
  receiver: number;
  matchId: number;
  callId?: number;
  callDay: number;
  startTime: number;
  status: 'pending' | 'connecting' | 'active' | 'completed' | 'missed' | 'rejected';
}>();

// Store signal offers for call setup
const pendingOffers = new Map<string, any>();

// Debug variables to help with troubleshooting
let connectionCount = 0;
let messageCount = 0;

// Keep track of client heartbeats
const clientHeartbeats = new Map<WebSocket, number>();

// Set up heartbeat interval (ms)
const HEARTBEAT_INTERVAL = 20000; // 20 seconds
const CLIENT_TIMEOUT = 60000; // 60 seconds without heartbeat = disconnect

export function setupSocketServer(httpServer: HttpServer) {
  // Create WebSocket server with more resilient settings for Replit environment
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',  // Match the path used in the client
    // Increase timeouts for more stability in Replit
    clientTracking: true,
    perMessageDeflate: false // Disable compression for reliability
  });
  console.log('WebSocket server initialized on path: /ws');
  
  // Set up server heartbeat to detect and clean up dead connections
  setInterval(() => {
    const now = Date.now();
    
    wss.clients.forEach((ws: WebSocket) => {
      // Check if client has been responsive
      const lastHeartbeat = clientHeartbeats.get(ws);
      
      if (lastHeartbeat && now - lastHeartbeat > CLIENT_TIMEOUT) {
        console.log('Client timed out - terminating connection');
        cleanupDeadConnection(ws);
        return;
      }
      
      // Send ping to check if client is still alive
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (err) {
          console.log('Error sending ping, terminating connection', err);
          cleanupDeadConnection(ws);
        }
      }
    });
  }, HEARTBEAT_INTERVAL);

  // Connected users map: userId -> WebSocket connection
  wss.on('connection', (ws: WebSocket) => {
    connectionCount++;
    console.log(`Client connected to WebSocket (total connections: ${connectionCount})`);
    let userId: number | null = null;
    
    // Initialize heartbeat
    clientHeartbeats.set(ws, Date.now());
    
    // Handle pong responses (client responds to ping)
    ws.on('pong', () => {
      clientHeartbeats.set(ws, Date.now());
    });
    
    // Handle heartbeat messages from client
    ws.on('ping', () => {
      try {
        ws.pong();
      } catch (error) {
        console.error('Error sending pong:', error);
      }
    });
    
    ws.on('message', (message) => {
      messageCount++;
      try {
        const data = JSON.parse(message.toString());
        console.log(`Received socket message (${messageCount}):`, data);
        
        // Handle different message types
        switch (data.type) {
          case 'register':
            // Register user connection
            userId = parseInt(data.userId, 10);
            if (!isNaN(userId)) {
              users.set(userId, ws);
              console.log(`User ${userId} registered with WebSocket (active users: ${users.size})`);
            } else {
              console.error(`Invalid userId received: ${data.userId}`);
            }
            break;
            
          case 'call:offer':
            if (!userId) break;
            
            const { offer: callOffer, to: callTo, matchId: callMatchId, callDay } = data;
            console.log(`Call offer from ${userId} to ${callTo} for match ${callMatchId}`);
            
            const toUserId = parseInt(callTo.toString(), 10);
            const targetWs = users.get(toUserId);
            
            if (!targetWs) {
              sendToClient(ws, {
                type: 'call:error',
                message: "User is offline"
              });
              return;
            }
            
            // Store the offer for later retrieval
            pendingOffers.set(`${callMatchId}-${userId}-${toUserId}`, callOffer);
            
            // Send the offer to the target user
            sendToClient(targetWs, {
              type: 'call:offer',
              offer: callOffer,
              from: userId,
              matchId: callMatchId,
              callDay
            });
            
            // Track the call
            activeCalls.set(`${callMatchId}-${userId}-${toUserId}`, {
              initiator: userId,
              receiver: toUserId,
              matchId: callMatchId,
              callDay,
              startTime: Date.now(),
              status: 'pending'
            });
            break;
            
          case 'call:getOffer':
            if (!userId) break;
            
            const offerMatchId = data.matchId;
            const offerFrom = data.from;
            const storedOffer = pendingOffers.get(`${offerMatchId}-${offerFrom}-${userId}`);
            
            if (storedOffer) {
              sendToClient(ws, {
                type: 'call:offerResponse',
                offer: storedOffer
              });
            } else {
              sendToClient(ws, {
                type: 'call:error',
                message: "No offer found"
              });
            }
            break;
            
          case 'call:answer':
            if (!userId) break;
            
            const { answer, to: answerTo, matchId: answerMatchId } = data;
            console.log(`Call answered by ${userId} to ${answerTo} for match ${answerMatchId}`);
            
            const answerTargetWs = users.get(answerTo.toString());
            
            if (!answerTargetWs) {
              sendToClient(ws, {
                type: 'call:error',
                message: "User is offline"
              });
              return;
            }
            
            // Send the answer to the initiator
            sendToClient(answerTargetWs, {
              type: 'call:answer',
              answer,
              from: userId
            });
            
            // Clean up the stored offer
            pendingOffers.delete(`${answerMatchId}-${answerTo}-${userId}`);
            break;
            
          case 'call:iceCandidate':
            if (!userId) break;
            
            const { candidate, to: iceTo, matchId: iceMatchId } = data;
            
            const iceTargetWs = users.get(iceTo.toString());
            
            if (iceTargetWs) {
              sendToClient(iceTargetWs, {
                type: 'call:iceCandidate',
                candidate,
                from: userId
              });
            }
            break;
            
          case 'call:reject':
            if (!userId) break;
            
            const { to: rejectTo, matchId: rejectMatchId } = data;
            console.log(`Call rejected by ${userId} for match ${rejectMatchId}`);
            
            const rejectTargetWs = users.get(rejectTo.toString());
            
            if (rejectTargetWs) {
              sendToClient(rejectTargetWs, {
                type: 'call:rejected',
                from: userId
              });
            }
            
            // Clean up
            pendingOffers.delete(`${rejectMatchId}-${rejectTo}-${userId}`);
            activeCalls.delete(`${rejectMatchId}-${rejectTo}-${userId}`);
            break;
            
          case 'call:end':
            if (!userId) break;
            
            const { to: endTo, matchId: endMatchId } = data;
            console.log(`Call ended by ${userId} for match ${endMatchId}`);
            
            const endTargetWs = users.get(endTo.toString());
            
            if (endTargetWs) {
              sendToClient(endTargetWs, {
                type: 'call:ended',
                from: userId
              });
            }
            
            // Clean up
            activeCalls.delete(`${endMatchId}-${userId}-${endTo}`);
            activeCalls.delete(`${endMatchId}-${endTo}-${userId}`);
            break;
            
          case 'call:status':
            if (!userId) break;
            
            const { matchId: statusMatchId, status, callId } = data;
            console.log(`Call status update: ${status} for call ${callId} in match ${statusMatchId}`);
            
            // Find the call in our active calls map
            let callKey = '';
            let callData = null;
            
            // Try both potential key formats
            if (userId) {
              // Look for calls where this user is the initiator
              // Use forEach to avoid TypeScript issues with for...of and Map.entries()
              activeCalls.forEach((call, key) => {
                if (call.matchId.toString() === statusMatchId.toString() && 
                    (call.initiator === userId || call.receiver === userId)) {
                  callKey = key;
                  callData = call;
                }
              });
            }
            
            if (callData) {
              // Update the call status
              callData.status = status;
              if (callId) callData.callId = callId;
              activeCalls.set(callKey, callData);
              
              // Notify the other party about the status change
              const otherUserId = callData.initiator === userId ? callData.receiver : callData.initiator;
              const otherUserWs = users.get(otherUserId);
              
              if (otherUserWs) {
                sendToClient(otherUserWs, {
                  type: 'call:statusUpdate',
                  status,
                  callId,
                  matchId: statusMatchId,
                  from: userId
                });
              }
              
              // If the call is completed or missed/rejected, clean up
              if (['completed', 'missed', 'rejected'].includes(status)) {
                setTimeout(() => {
                  activeCalls.delete(callKey);
                }, 5000); // Keep it around briefly for final messaging
              }
            }
            break;
            
          default:
            console.log(`Unknown socket message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error processing socket message:', error);
      }
    });
    
    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${userId ? `(User ${userId})` : ''}:`, error);
    });

    ws.on('close', (code, reason) => {
      console.log(`Client disconnected from advanced WebSocket ${userId ? `(User ${userId})` : ''} with code ${code} reason: ${reason || 'none'}`);
      
      if (userId) {
        users.delete(userId);
        
        // End any active calls involving this user
        // Manually iterate to avoid downlevelIteration issues
        activeCalls.forEach((call, key) => {
          if (call.initiator === userId || call.receiver === userId) {
            const otherUserId = call.initiator === userId ? call.receiver : call.initiator;
            const otherUserWs = users.get(otherUserId);
            
            if (otherUserWs) {
              sendToClient(otherUserWs, {
                type: 'call:ended',
                from: userId
              });
            }
            
            activeCalls.delete(key);
          }
        });
      }
      
      // Remove from heartbeat tracking
      clientHeartbeats.delete(ws);
    });
  });

  return wss;
}

// Helper function to clean up a dead connection
function cleanupDeadConnection(ws: WebSocket) {
  try {
    // Find the user ID for this connection
    let userIdToRemove: number | null = null;
    
    // Use forEach to avoid TypeScript issues with for...of and Map.entries()
    users.forEach((socket, id) => {
      if (socket === ws && userIdToRemove === null) {
        userIdToRemove = id;
      }
    });
    
    // Clean up user registration
    if (userIdToRemove !== null) {
      users.delete(userIdToRemove);
      console.log(`Cleaned up registration for user ${userIdToRemove}`);
      
      // End any active calls involving this user
      for (const [key, call] of activeCalls.entries()) {
        if (call.initiator === userIdToRemove || call.receiver === userIdToRemove) {
          const otherUserId = call.initiator === userIdToRemove ? call.receiver : call.initiator;
          const otherUserWs = users.get(otherUserId);
          
          if (otherUserWs) {
            sendToClient(otherUserWs, {
              type: 'call:ended',
              from: userIdToRemove
            });
          }
          
          activeCalls.delete(key);
          console.log(`Cleaned up call ${key} for disconnected user ${userIdToRemove}`);
        }
      }
    }
    
    // Remove heartbeat tracking
    clientHeartbeats.delete(ws);
    
    // Terminate the connection
    ws.terminate();
    
    connectionCount = Math.max(0, connectionCount - 1);
    console.log(`Cleaned up dead connection (remaining connections: ${connectionCount})`);
  } catch (error) {
    console.error('Error cleaning up dead connection:', error);
  }
}

// Helper function to send messages to WebSocket clients
function sendToClient(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('Error sending message to client:', error);
      cleanupDeadConnection(ws);
    }
  }
}