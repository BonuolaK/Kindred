// server/socket.ts
import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// Store active users and their socket IDs
const users = new Map<string, WebSocket>();

// Store active calls
const activeCalls = new Map<string, {
  initiator: string;
  receiver: string;
  matchId: string;
  callDay: number;
  startTime: number;
}>();

// Store signal offers for call setup
const pendingOffers = new Map<string, any>();

export function setupSocketServer(httpServer: HttpServer) {
  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/socket.io'  // Different path than the original WebSocket
  });

  // Connected users map: userId -> WebSocket connection
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to advanced WebSocket');
    let userId: string | null = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received socket message:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'register':
            // Register user connection
            userId = data.userId?.toString();
            if (userId) {
              users.set(userId, ws);
              console.log(`User ${userId} registered with advanced WebSocket`);
            }
            break;
            
          case 'call:offer':
            if (!userId) break;
            
            const { offer: callOffer, to: callTo, matchId: callMatchId, callDay } = data;
            console.log(`Call offer from ${userId} to ${callTo} for match ${callMatchId}`);
            
            const targetWs = users.get(callTo.toString());
            
            if (!targetWs) {
              sendToClient(ws, {
                type: 'call:error',
                message: "User is offline"
              });
              return;
            }
            
            // Store the offer for later retrieval
            pendingOffers.set(`${callMatchId}-${userId}-${callTo}`, callOffer);
            
            // Send the offer to the target user
            sendToClient(targetWs, {
              type: 'call:offer',
              offer: callOffer,
              from: userId,
              matchId: callMatchId,
              callDay
            });
            
            // Track the call
            activeCalls.set(`${callMatchId}-${userId}-${callTo}`, {
              initiator: userId.toString(),
              receiver: callTo.toString(),
              matchId: callMatchId,
              callDay,
              startTime: Date.now()
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
            
          default:
            console.log(`Unknown socket message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error processing socket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log(`Client disconnected from advanced WebSocket ${userId ? `(User ${userId})` : ''}`);
      
      if (userId) {
        users.delete(userId);
        
        // End any active calls involving this user
        for (const [key, call] of activeCalls.entries()) {
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
        }
      }
    });
  });

  return wss;
}

// Helper function to send messages to WebSocket clients
function sendToClient(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}