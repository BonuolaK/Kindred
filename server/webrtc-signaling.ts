/**
 * WebRTC Signaling Server
 * 
 * Handles WebRTC signaling for establishing peer connections.
 * Includes room management, message relay, and connection state tracking.
 */

import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";

// Types for our signaling protocol
interface SignalingMessage {
  type: string;
  roomId?: string;
  userId?: number;
  targetUserId?: number;
  sessionId?: string;
  data?: any;
}

// Track active rooms and users
interface Room {
  id: string;
  participants: Map<number, Participant>;
  createdAt: number;
  metadata?: any;
}

interface Participant {
  userId: number;
  socket: WebSocket;
  sessionId: string;
  joinedAt: number;
  metadata?: any; // Can include display name, etc.
}

// Timeouts and limits
const ROOM_CLEANUP_INTERVAL = 60 * 1000; // 60 seconds
const ROOM_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
const ICE_GATHERING_TIMEOUT = 30 * 1000; // 30 seconds 

// Main state storage
const rooms = new Map<string, Room>();
const userSessions = new Map<number, Set<string>>(); // userId -> Set of sessionIds
const sessions = new Map<string, { userId: number, roomId: string | null }>();

/**
 * Setup WebRTC signaling server
 */
export function setupSignalingServer(httpServer: HttpServer) {
  // Create WebSocket server with specific path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/rtc'
  });
  
  console.log('WebRTC signaling server initialized on path: /rtc');

  // Setup cleanup intervals
  setInterval(cleanupStaleRooms, ROOM_CLEANUP_INTERVAL);
  
  // Handle new connections
  wss.on('connection', (socket: WebSocket) => {
    const sessionId = randomUUID();
    let userId: number | null = null;
    let currentRoomId: string | null = null;
    
    console.log(`New signaling connection established: ${sessionId}`);
    
    // Send initial session information
    sendToSocket(socket, {
      type: 'session_created',
      sessionId
    });
    
    socket.on('message', (rawMessage: string) => {
      try {
        const message: SignalingMessage = JSON.parse(rawMessage);
        
        // Add detailed logging 
        console.log(`Signaling message received [${message.type}] from session ${sessionId}`);
        
        switch (message.type) {
          // User registration with the signaling server
          case 'register':
            if (!message.userId || typeof message.userId !== 'number') {
              return sendError(socket, 'Invalid user ID');
            }
            
            userId = message.userId;
            sessions.set(sessionId, { userId, roomId: null });
            
            // Track this session for the user
            if (!userSessions.has(userId)) {
              userSessions.set(userId, new Set());
            }
            userSessions.get(userId)?.add(sessionId);
            
            console.log(`User ${userId} registered with signaling server (session: ${sessionId})`);
            
            // Acknowledge registration
            sendToSocket(socket, { 
              type: 'registered',
              userId,
              sessionId 
            });
            break;
          
          // Room creation request
          case 'create_room':
            if (!userId) {
              return sendError(socket, 'Must register before creating a room');
            }
            
            const newRoomId = message.roomId || randomUUID();
            
            // Check if the room exists, if so just join it
            if (rooms.has(newRoomId)) {
              handleJoinRoom(socket, userId, sessionId, newRoomId, message.data);
              break;
            }
            
            // Create new room
            const newRoom: Room = {
              id: newRoomId,
              participants: new Map(),
              createdAt: Date.now(),
              metadata: message.data
            };
            
            rooms.set(newRoomId, newRoom);
            
            // Join the newly created room
            handleJoinRoom(socket, userId, sessionId, newRoomId, message.data);
            break;
          
          // User requests to join an existing room
          case 'join_room':
            if (!userId) {
              return sendError(socket, 'Must register before joining a room');
            }
            
            if (!message.roomId) {
              return sendError(socket, 'Room ID is required');
            }
            
            if (!rooms.has(message.roomId)) {
              return sendError(socket, 'Room does not exist');
            }
            
            handleJoinRoom(socket, userId, sessionId, message.roomId, message.data);
            break;
          
          // Leave the current room
          case 'leave_room':
            const userSessionData = sessions.get(sessionId);
            if (userSessionData?.roomId) {
              handleLeaveRoom(socket, userId, sessionId, userSessionData.roomId);
            }
            break;
          
          // WebRTC signaling messages 
          case 'offer':
          case 'answer':
          case 'ice_candidate':
          case 'ice_candidates_complete':
            // These messages need to be forwarded to the target peer
            const signalRoomId = sessions.get(sessionId)?.roomId;
            if (!userId || !signalRoomId || !message.targetUserId) {
              return sendError(socket, 'Invalid signaling parameters');
            }
            
            // Forward to the target user with added metadata
            forwardSignalingMessage(
              userId, 
              message.targetUserId, 
              signalRoomId, 
              message.type,
              message.data
            );
            break;
          
          // Message to notify candidates that gathering is complete
          case 'ice_complete':
            const iceRoomId = sessions.get(sessionId)?.roomId;
            if (!userId || !iceRoomId || !message.targetUserId) {
              return sendError(socket, 'Invalid signaling parameters');
            }
            
            forwardSignalingMessage(
              userId, 
              message.targetUserId, 
              iceRoomId, 
              'ice_complete',
              {}
            );
            break;
          
          // Connection issues reported by clients
          case 'connection_error':
            console.error(`WebRTC connection error reported by user ${userId}: ${message.data?.message || 'Unknown error'}`);
            
            // Notify affected peers if in a room
            const errorRoomId = sessions.get(sessionId)?.roomId;
            if (errorRoomId && userId && message.targetUserId) {
              forwardSignalingMessage(
                userId, 
                message.targetUserId, 
                errorRoomId, 
                'peer_connection_error',
                message.data
              );
            }
            break;
            
          // Client sends heartbeat to keep connection alive
          case 'heartbeat':
            sendToSocket(socket, { type: 'heartbeat_ack' });
            break;
          
          default:
            console.warn(`Unknown signaling message type: ${message.type}`);
        }
      } catch (error) {
        console.error('Error processing signaling message:', error);
        sendError(socket, 'Invalid message format');
      }
    });
    
    socket.on('close', () => {
      console.log(`Signaling connection closed: session ${sessionId}, user ${userId || 'unknown'}`);
      
      // Clean up any rooms this user was in
      const userSessionData = sessions.get(sessionId);
      if (userSessionData?.roomId) {
        handleLeaveRoom(socket, userId, sessionId, userSessionData.roomId);
      }
      
      // Remove from session tracking
      if (userId) {
        const userSessionSet = userSessions.get(userId);
        if (userSessionSet) {
          userSessionSet.delete(sessionId);
          if (userSessionSet.size === 0) {
            userSessions.delete(userId);
          }
        }
      }
      
      // Clean up session
      sessions.delete(sessionId);
    });
    
    socket.on('error', (error) => {
      console.error(`WebSocket error in session ${sessionId}:`, error);
    });
  });
  
  return wss;
  
  // Helper functions
  
  /**
   * Handle a user joining a room
   */
  function handleJoinRoom(
    socket: WebSocket, 
    userId: number, 
    sessionId: string, 
    roomId: string,
    metadata?: any
  ) {
    const room = rooms.get(roomId);
    if (!room) {
      return sendError(socket, 'Room not found');
    }
    
    // Store reference to currentRoomId for this context
    const userRoomId = sessions.get(sessionId)?.roomId || null;
    
    // If user is already in another room, leave it first
    if (userRoomId && userRoomId !== roomId) {
      handleLeaveRoom(socket, userId, sessionId, userRoomId);
    }
    
    // Add user to the room
    const participant: Participant = {
      userId,
      socket,
      sessionId,
      joinedAt: Date.now(),
      metadata
    };
    
    room.participants.set(userId, participant);
    
    // Update session tracking
    sessions.set(sessionId, { userId, roomId });
    
    console.log(`User ${userId} joined room ${roomId} (total participants: ${room.participants.size})`);
    
    // Send success response to the user
    sendToSocket(socket, {
      type: 'room_joined',
      roomId,
      sessionId,
      participants: Array.from(room.participants.keys()).filter(id => id !== userId)
    });
    
    // Notify other participants about the new user
    notifyRoom(roomId, userId, 'participant_joined', { 
      userId,
      metadata: participant.metadata
    });
  }
  
  /**
   * Handle a user leaving a room
   */
  function handleLeaveRoom(
    socket: WebSocket, 
    userId: number | null, 
    sessionId: string, 
    roomId: string
  ) {
    const room = rooms.get(roomId);
    if (!room || !userId) return;
    
    // Remove user from the room
    room.participants.delete(userId);
    
    // We don't need to update a currentRoomId variable here since we're tracking rooms 
    // in the sessions map instead
    
    // Update session tracking
    sessions.set(sessionId, { userId, roomId: null });
    
    console.log(`User ${userId} left room ${roomId} (remaining participants: ${room.participants.size})`);
    
    // Notify user that they've left the room
    sendToSocket(socket, {
      type: 'room_left',
      roomId
    });
    
    // Notify remaining participants
    notifyRoom(roomId, userId, 'participant_left', { userId });
    
    // Clean up empty room
    if (room.participants.size === 0) {
      console.log(`Room ${roomId} is now empty, removing`);
      rooms.delete(roomId);
    }
  }
  
  /**
   * Notify all participants in a room except the sender
   */
  function notifyRoom(
    roomId: string, 
    senderId: number, 
    type: string, 
    data: any
  ) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.participants.forEach((participant, userId) => {
      // Don't send to the original sender
      if (userId !== senderId) {
        sendToSocket(participant.socket, {
          type,
          roomId,
          userId: senderId,
          data
        });
      }
    });
  }
  
  /**
   * Forward a signaling message to a specific user
   */
  function forwardSignalingMessage(
    fromUserId: number,
    toUserId: number,
    roomId: string,
    type: string,
    data: any
  ) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const targetParticipant = room.participants.get(toUserId);
    if (!targetParticipant) {
      console.warn(`Cannot forward ${type} to user ${toUserId}, not in room ${roomId}`);
      return;
    }
    
    sendToSocket(targetParticipant.socket, {
      type,
      roomId,
      userId: fromUserId,
      data
    });
  }
  
  /**
   * Send an error message to a client
   */
  function sendError(socket: WebSocket, message: string) {
    sendToSocket(socket, {
      type: 'error',
      data: { message }
    });
  }
  
  /**
   * Send a message to a WebSocket
   */
  function sendToSocket(socket: WebSocket, data: any) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }
  
  /**
   * Remove stale rooms that have existed too long
   */
  function cleanupStaleRooms() {
    const now = Date.now();
    let cleanedRooms = 0;
    
    rooms.forEach((room, roomId) => {
      // Check if room is older than the max age
      if (now - room.createdAt > ROOM_MAX_AGE) {
        // Notify all participants
        room.participants.forEach((participant) => {
          sendToSocket(participant.socket, {
            type: 'room_expired',
            roomId
          });
        });
        
        // Remove the room
        rooms.delete(roomId);
        cleanedRooms++;
      }
    });
    
    if (cleanedRooms > 0) {
      console.log(`Cleaned up ${cleanedRooms} stale rooms (total remaining: ${rooms.size})`);
    }
  }
}