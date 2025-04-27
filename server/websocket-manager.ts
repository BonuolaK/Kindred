import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server as HttpServer } from 'http';
import { URL } from 'url';
import { Socket } from 'net';

// Store WebSocket connections
interface ConnectionMap {
  ws: Map<number, WebSocket>;
  rtc: Map<number, WebSocket>;
  basic: Map<number, WebSocket>;
  rtctest: Map<number, WebSocket>;
}

// WebSocket types
type WebSocketType = 'ws' | 'rtc' | 'basic'| 'rtctest';

// Type guard for userId
function isValidUserId(userId: number | null): userId is number {
  return userId !== null;
}

// Helper to safely convert userId to a valid Map key
function ensureNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && !isNaN(parseInt(value))) {
    return parseInt(value);
  }
  // Default to a placeholder ID when we can't get a valid number
  console.warn(`Invalid userId value: ${value}, using placeholder ID instead`);
  return 999999; // Unlikely to conflict with real user IDs
}

export class WebSocketManager {
  private wss: {
    ws: WebSocketServer;
    rtc: WebSocketServer;
    basic: WebSocketServer;
    rtctest: WebSocketServer;
  };
  
  private connections: ConnectionMap = {
    ws: new Map(),
    rtc: new Map(),
    basic: new Map(),
    rtctest: new Map()
  };
  
  private httpServer: HttpServer;
  
  constructor(httpServer: HttpServer) {
    this.httpServer = httpServer;
    
    // Create WebSocket servers with noServer option
    this.wss = {
      ws: new WebSocketServer({ noServer: true }),
      rtc: new WebSocketServer({ noServer: true }),
      basic: new WebSocketServer({ noServer: true }),
      rtctest: new WebSocketServer({ noServer: true })
    };
    
    // Set up event handlers for each WebSocket server
    this.setupGeneralWSHandlers();
    this.setupRTCHandlers();
    this.setupBasicWSHandlers();
    this.setUpRTCTestHandlers();
    
    // Set up HTTP server upgrade handler
    this.setupUpgradeHandler();
    
    console.log('WebSocket Manager initialized with handlers for /ws, /rtc, and /basic-ws');
  }
  
  private setupUpgradeHandler() {
    this.httpServer.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      // Parse the URL to determine which WebSocket server should handle this request
      const url = new URL(request.url || '/', `http://${request.headers.host}`);
      const pathname = url.pathname;
      
      console.log(`Received upgrade request for: ${pathname}`);
      
      // Route to the correct WebSocket server based on path
      if (pathname === '/ws') {
        this.wss.ws.handleUpgrade(request, socket, head, (ws) => {
          this.wss.ws.emit('connection', ws, request);
        });
      } else if (pathname === '/rtc') {
        this.wss.rtc.handleUpgrade(request, socket, head, (ws) => {
          this.wss.rtc.emit('connection', ws, request);
        });
      } else if (pathname === '/basic-ws') {
        this.wss.basic.handleUpgrade(request, socket, head, (ws) => {
          this.wss.basic.emit('connection', ws, request);
        });
      } else if (pathname === '/rtctest') {
        this.wss.basic.handleUpgrade(request, socket, head, (ws) => {
          this.wss.rtctest.emit('connection', ws, request);
        });
      } 
      
      else {
        // If no matching WebSocket path, close the connection
        socket.destroy();
      }
    });
  }
  
  private setupGeneralWSHandlers() {
    // General WebSocket server for online status and messaging
    this.wss.ws.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('[WS] Client connected to general WebSocket server');
      let userId: number | null = null;
      
      // Extract userId from URL query parameters
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const queryUserId = url.searchParams.get('uid');
      if (queryUserId && !isNaN(parseInt(queryUserId))) {
        userId = parseInt(queryUserId);
        // Type assertion to ensure it's treated as a number for storage
        const userIdNum: number = userId;
        this.connections.ws.set(userIdNum, ws);
        console.log(`[WS] User ${userId} connected to general WebSocket server`);
        
        // Send confirmation to client
        this.sendToClient(ws, {
          type: 'connected',
          message: 'Successfully connected to WebSocket server'
        });
        
        // Broadcast user's online status to all other connections
        if (userId !== null) {
          this.broadcastStatus(ensureNumber(userId), true);
        }
      }
      
      // Handle messages
      ws.on('message', (message: Buffer | string) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle registration
          if (data.type === 'register' && data.userId) {
            userId = data.userId;
            // Use our helper to ensure a valid number for the Map key
            this.connections.ws.set(ensureNumber(userId), ws);
            console.log(`[WS] User ${userId} registered with general WebSocket server`);
            
            // Broadcast online status
            if (userId !== null) {
              this.broadcastStatus(ensureNumber(userId), true);
            }
          }
          
          // Handle heartbeat
          if (data.type === 'heartbeat') {
            this.sendToClient(ws, {
              type: 'heartbeat_ack',
              timestamp: Date.now()
            });
          }
          
          // Handle status updates
          if (data.type === 'status' && userId) {
            this.broadcastStatus(ensureNumber(userId), data.online);
          }
          
          // Handle call status updates
          if (data.type === 'call:status' && data.matchId && data.callId) {
            // Forward call status updates to relevant users
            this.broadcastToMatch(data);
          }
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        if (userId) {
          console.log(`[WS] User ${userId} disconnected from general WebSocket server`);
          this.connections.ws.delete(ensureNumber(userId));
          
          // Broadcast offline status
          this.broadcastStatus(ensureNumber(userId), false);
        }
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('[WS] WebSocket error:', error);
        if (userId) {
          this.connections.ws.delete(ensureNumber(userId));
        }
      });
    });
  }
  
  private setupRTCHandlers() {
    // WebRTC signaling server
    this.wss.rtc.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('[RTC] Client connected to WebRTC signaling server');
      let userId: number | null = null;
      let roomId: string | null = null;
      
      // Handle messages
      ws.on('message', (message: Buffer | string) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle registration
          if (data.type === 'register' && data.userId) {
            userId = data.userId;
            // Use our helper to ensure a valid number for the Map key
            this.connections.rtc.set(ensureNumber(userId), ws);
            console.log(`[RTC] User ${userId} registered with WebRTC signaling server`);
          }
          
          // Handle room joining
          if (data.type === 'join_room' && userId && data.roomId) {
            roomId = data.roomId;
            console.log(`[RTC] User ${userId} joined room ${roomId}`);
            
            // Notify the user they've joined the room
            this.sendToClient(ws, {
              type: 'room_joined',
              roomId: roomId,
              participants: [] // In a real implementation, you'd include current participants
            });
          }
          
          // Handle WebRTC signaling messages - expanded to handle all signaling message types
          if (userId && (
              data.type === 'offer' || 
              data.type === 'answer' || 
              data.type === 'ice_candidate' ||
              data.type === 'call_request' ||
              data.type === 'call_response'
            )) {
              
            // If this is a targeted message, send to the specific user
            if (data.targetUserId) {
              const targetWs = this.connections.rtc.get(ensureNumber(data.targetUserId));
              if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                data.fromUserId = userId; // Add sender info
                this.sendToClient(targetWs, data);
                console.log(`[RTC] Forwarded ${data.type} message from ${userId} to ${data.targetUserId}`);
              } else {
                // Send failure response back to sender
                this.sendToClient(ws, {
                  type: 'error',
                  error: 'target_not_available',
                  originalType: data.type,
                  message: `User ${data.targetUserId} is not connected or unavailable`
                });
                console.log(`[RTC] Failed to forward message: target user ${data.targetUserId} not available`);
              }
            }
          }
        } catch (error) {
          console.error('[RTC] Error parsing message:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        if (userId) {
          console.log(`[RTC] User ${userId} disconnected from WebRTC signaling server`);
          this.connections.rtc.delete(ensureNumber(userId));
          
          // Notify room participants if needed
          if (roomId) {
            // Implementation depends on your room management logic
          }
        }
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('[RTC] WebSocket error:', error);
        if (userId) {
          this.connections.rtc.delete(ensureNumber(userId));
        }
      });
    });
  }

  private setUpRTCTestHandlers() {
    this.wss.rtctest.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('[RTC-TEST] Client connected to RTC Test signaling server');
      let userId: number | null = null;
  
      // Track last message time for basic rate limiting
      let lastMessageTimestamp = Date.now();
  
      ws.on('message', (message: Buffer | string) => {
        try {
          const now = Date.now();
          if (now - lastMessageTimestamp < 100) { // Example: limit to 10 messages/second
            console.warn('[RTC-TEST] Rate limit triggered, ignoring message');
            return;
          }
          lastMessageTimestamp = now;
  
          const data = JSON.parse(message.toString());
  
          if (data.type === 'register' && data.userId) {
            const validatedUserId = ensureNumber(data.userId);
  
            if (!validatedUserId) {
              this.sendToClient(ws, {
                type: 'error',
                error: 'invalid_user_id',
                message: 'User ID must be a number',
              });
              return;
            }
  
            // Optional: Authentication check can go here (e.g., token verification)
  
            // Handle duplicate connections (overwrite old connection if exists)
            const existingConnection = this.connections.rtctest.get(validatedUserId);
            if (existingConnection) {
              console.warn(`[RTC-TEST] Duplicate registration for user ${validatedUserId}. Overwriting old connection.`);
              existingConnection.close();
              this.connections.rtctest.delete(validatedUserId);
            }
  
            userId = validatedUserId;
            this.connections.rtctest.set(validatedUserId, ws);
  
            console.log(`[RTC-TEST] User ${userId} registered successfully`);
  
            this.sendToClient(ws, {
              type: 'registered',
              userId: validatedUserId,
            });
          }
  
          else if (data.type === 'rtc-signal' && data.targetUserId) {
            if (!userId) {
              console.warn('[RTC-TEST] Unregistered user trying to send rtc-signal');
              this.sendToClient(ws, {
                type: 'error',
                error: 'unauthorized',
                message: 'You must register before sending rtc-signal',
              });
              return;
            }
  
            const targetUserId = ensureNumber(data.targetUserId);
            const targetWs = this.connections.rtctest.get(targetUserId);
  
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              const forwardPayload = {
                type: 'rtc-signal',
                fromUserId: userId,
                signalData: data.signalData,
              };
              this.sendToClient(targetWs, forwardPayload);
              console.log(`[RTC-TEST] Forwarded rtc-signal from ${userId} to ${targetUserId}`);
            } else {
              console.warn(`[RTC-TEST] Target user ${targetUserId} not available`);
  
              this.sendToClient(ws, {
                type: 'error',
                error: 'target_unavailable',
                message: `Target user ${targetUserId} is not connected`,
              });
            }
          }
  
          else {
            console.warn('[RTC-TEST] Unknown message type received:', data.type);
          }
        } catch (error) {
          console.error('[RTC-TEST] Error parsing message:', error);
          this.sendToClient(ws, {
            type: 'error',
            error: 'invalid_message_format',
            message: 'Message could not be parsed or was invalid',
          });
        }
      });
  
      ws.on('close', () => {
        if (userId !== null) {
          console.log(`[RTC-TEST] User ${userId} disconnected from RTC Test server`);
          this.connections.rtctest.delete(userId);
        }
      });
  
      ws.on('error', (error) => {
        console.error('[RTC-TEST] WebSocket error:', error);
        if (userId !== null) {
          this.connections.rtctest.delete(userId);
        }
      });
    });
  }
  
  
  private setupBasicWSHandlers() {
    // Basic WebSocket server (fallback for status)
    this.wss.basic.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('[BASIC] Client connected to basic WebSocket server');
      let userId: number | null = null;
      
      // Extract userId from URL query parameters
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const queryUserId = url.searchParams.get('uid');
      if (queryUserId && !isNaN(parseInt(queryUserId))) {
        userId = parseInt(queryUserId);
        // Use our helper function to ensure valid number
        this.connections.basic.set(ensureNumber(userId), ws);
        console.log(`[BASIC] User ${userId} connected to basic WebSocket server`);
        
        // Send simple "ok" response to confirm connection
        ws.send('ok');
      }
      
      // Handle messages
      ws.on('message', (message: Buffer | string) => {
        try {
          // For basic WebSocket, just echo back the message
          ws.send('ok');
          
          // Try to parse as JSON for heartbeats
          try {
            const data = JSON.parse(message.toString());
            
            // Handle heartbeat/ping messages for connection stability
            if (data.type === 'heartbeat' || data.type === 'ping') {
              this.sendToClient(ws, {
                type: 'pong',
                timestamp: Date.now(),
                original: data.timestamp || Date.now()
              });
              
              // Update last activity timestamp
              // This is an internal property we're adding to the WebSocket object
              (ws as any).lastActivity = Date.now();
            }
            
            // Handle registration
            if (data.type === 'register' && data.userId) {
              userId = data.userId;
              // Use our helper function to ensure valid number
              this.connections.basic.set(ensureNumber(userId), ws);
              console.log(`[BASIC] User ${userId} registered with basic WebSocket server`);
            }
          } catch (jsonError) {
            // Not JSON, just continue
          }
        } catch (error) {
          console.error('[BASIC] Error handling message:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        if (userId) {
          console.log(`[BASIC] User ${userId} disconnected from basic WebSocket server`);
          this.connections.basic.delete(ensureNumber(userId));
        }
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('[BASIC] WebSocket error:', error);
        if (userId) {
          this.connections.basic.delete(ensureNumber(userId));
        }
      });
    });
  }
  
  // Helper methods
  
  private sendToClient(ws: WebSocket, data: any): void {
    // Use direct value 1 for OPEN state for maximum compatibility
    if (ws.readyState === 1) { // 1 = WebSocket.OPEN
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    } else {
      console.warn(`Cannot send message, socket not in OPEN state (state: ${ws.readyState})`);
    }
  }
  
  private broadcastStatus(userId: number, online: boolean): void {
    const statusMessage = {
      type: 'status',
      userId: userId,
      online: online
    };
    
    console.log(`Broadcasting status: User ${userId} is ${online ? 'online' : 'offline'}`);
    
    // Broadcast to all general WebSocket clients
    this.wss.ws.clients.forEach((client: WebSocket) => {
      if (client.readyState === 1) { // 1 = WebSocket.OPEN
        this.sendToClient(client, statusMessage);
      }
    });
  }
  
  private broadcastToMatch(data: any): void {
    if (!data.matchId) return;
    
    // This is a simplified implementation
    // In a real app, you'd determine which users are part of the match
    this.wss.ws.clients.forEach((client: WebSocket) => {
      if (client.readyState === 1) { // 1 = WebSocket.OPEN
        this.sendToClient(client, data);
      }
    });
  }
}