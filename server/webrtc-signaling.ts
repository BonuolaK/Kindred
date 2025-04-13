// server/webrtc-signaling.ts
import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

type SignalingData = {
  type: string;
  [key: string]: any;
};

// Connected clients by user ID
const connectedClients = new Map<number, WebSocket>();

// Rooms for multi-user calls (roomId -> set of userIds)
const rooms = new Map<string, Set<number>>();

// Map to track which room each user is in
const userRooms = new Map<number, string>();

// Debug logging function
const log = (message: string, data?: any) => {
  console.log(`[WebRTC Signaling] ${message}`, data ? data : '');
};

export function setupWebRTCSignaling(httpServer: HttpServer) {
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/rtc'  // Use /rtc specifically for WebRTC signaling
  });

  log('WebRTC signaling server initialized on path: /rtc');

  wss.on('connection', (ws: WebSocket) => {
    let userId: number | null = null;
    log('Client connected to WebRTC signaling server');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString()) as SignalingData;
        
        // Skip logging for ICE candidates to prevent log flooding
        if (data.type !== 'ice-candidate') {
          log('Received message:', data);
        }

        switch (data.type) {
          case 'register':
            handleRegister(ws, data);
            userId = data.userId;
            break;

          case 'join-room':
            if (!userId) {
              sendErrorToClient(ws, 'Not registered');
              break;
            }
            handleJoinRoom(userId, ws, data);
            break;

          case 'leave-room':
            if (!userId) {
              sendErrorToClient(ws, 'Not registered');
              break;
            }
            handleLeaveRoom(userId);
            break;

          case 'offer':
            if (!userId) {
              sendErrorToClient(ws, 'Not registered');
              break;
            }
            handleOffer(userId, data);
            break;

          case 'answer':
            if (!userId) {
              sendErrorToClient(ws, 'Not registered');
              break;
            }
            handleAnswer(userId, data);
            break;

          case 'ice-candidate':
            if (!userId) {
              sendErrorToClient(ws, 'Not registered');
              break;
            }
            handleIceCandidate(userId, data);
            break;

          default:
            log(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        log('Error processing message:', error);
        sendErrorToClient(ws, 'Invalid message format');
      }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      log(`WebSocket error for client ${userId ? `userId=${userId}` : 'unregistered'}:`, error);
    });

    ws.on('close', (code, reason) => {
      if (userId) {
        log(`Client disconnected: userId=${userId} with code ${code} reason: ${reason || 'none'}`);
        
        // Remove user from their room
        handleLeaveRoom(userId);
        
        // Remove client from connected clients
        connectedClients.delete(userId);
      } else {
        log(`Unregistered client disconnected with code ${code} reason: ${reason || 'none'}`);
      }
    });

    // Send a welcome message
    ws.send(JSON.stringify({ 
      type: 'welcome',
      message: 'Connected to WebRTC signaling server'
    }));
  });

  return wss;
}

// Handle user registration
function handleRegister(ws: WebSocket, data: SignalingData) {
  const userId = parseInt(data.userId.toString(), 10);
  
  if (isNaN(userId)) {
    sendErrorToClient(ws, 'Invalid user ID');
    return;
  }

  // Store the connection
  connectedClients.set(userId, ws);
  log(`Registered user ${userId}, total connected: ${connectedClients.size}`);
}

// Handle joining a room
function handleJoinRoom(userId: number, ws: WebSocket, data: SignalingData) {
  const roomId = data.roomId.toString();
  const metadata = data.metadata || {};
  
  // Check if user is already in a room
  const currentRoomId = userRooms.get(userId);
  if (currentRoomId) {
    // Leave the current room first
    handleLeaveRoom(userId);
  }
  
  // Get or create the room
  let room = rooms.get(roomId);
  if (!room) {
    room = new Set<number>();
    rooms.set(roomId, room);
    log(`Created new room: ${roomId}`);
  }
  
  // Add user to the room
  room.add(userId);
  userRooms.set(userId, roomId);
  
  log(`User ${userId} joined room ${roomId}, participants: ${room.size}`);
  
  // Get all other participants
  const participants = Array.from(room).filter(id => id !== userId);
  
  // Notify the new participant about existing participants
  sendToClient(ws, {
    type: 'room-joined',
    roomId,
    participants,
    metadata
  });
  
  // Notify other participants about the new participant
  participants.forEach(participantId => {
    const participantWs = connectedClients.get(participantId);
    if (participantWs) {
      sendToClient(participantWs, {
        type: 'participant-joined',
        roomId,
        userId,
        metadata
      });
    }
  });
}

// Handle leaving a room
function handleLeaveRoom(userId: number) {
  const roomId = userRooms.get(userId);
  if (!roomId) return;
  
  const room = rooms.get(roomId);
  if (room) {
    // Remove user from the room
    room.delete(userId);
    
    log(`User ${userId} left room ${roomId}, remaining participants: ${room.size}`);
    
    // If room is empty, delete it
    if (room.size === 0) {
      rooms.delete(roomId);
      log(`Room ${roomId} deleted (empty)`);
    } else {
      // Notify other participants
      room.forEach(participantId => {
        const participantWs = connectedClients.get(participantId);
        if (participantWs) {
          sendToClient(participantWs, {
            type: 'participant-left',
            roomId,
            userId
          });
        }
      });
    }
  }
  
  // Remove from user rooms tracking
  userRooms.delete(userId);
}

// Handle WebRTC offer
function handleOffer(fromUserId: number, data: SignalingData) {
  const { offer, matchId, toUserId } = data;
  const targetWs = connectedClients.get(toUserId);
  
  if (!targetWs) {
    const fromWs = connectedClients.get(fromUserId);
    if (fromWs) {
      sendErrorToClient(fromWs, 'Target user not connected');
    }
    return;
  }
  
  sendToClient(targetWs, {
    type: 'offer',
    offer,
    matchId,
    fromUserId,
    toUserId
  });
}

// Handle WebRTC answer
function handleAnswer(fromUserId: number, data: SignalingData) {
  const { answer, toUserId } = data;
  const targetWs = connectedClients.get(toUserId);
  
  if (!targetWs) {
    const fromWs = connectedClients.get(fromUserId);
    if (fromWs) {
      sendErrorToClient(fromWs, 'Target user not connected');
    }
    return;
  }
  
  sendToClient(targetWs, {
    type: 'answer',
    answer,
    fromUserId,
    toUserId
  });
}

// Handle ICE candidate
function handleIceCandidate(fromUserId: number, data: SignalingData) {
  const { candidate, toUserId } = data;
  const targetWs = connectedClients.get(toUserId);
  
  if (!targetWs) return;
  
  sendToClient(targetWs, {
    type: 'ice-candidate',
    candidate,
    fromUserId,
    toUserId
  });
}

// Send error message to client
function sendErrorToClient(ws: WebSocket, message: string) {
  sendToClient(ws, {
    type: 'error',
    message
  });
}

// Send message to client
function sendToClient(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}