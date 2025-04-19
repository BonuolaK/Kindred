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
}

// WebSocket types
type WebSocketType = 'ws' | 'rtc' | 'basic';

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
  };
  
  private connections: ConnectionMap = {
    ws: new Map(),
    rtc: new Map(),
    basic: new Map()
  };
  
  private httpServer: HttpServer;
  
  constructor(httpServer: HttpServer) {
    this.httpServer = httpServer;
    
    // Create WebSocket servers with noServer option
    this.wss = {
      ws: new WebSocketServer({ noServer: true }),
      rtc: new WebSocketServer({ noServer: true }),
      basic: new WebSocketServer({ noServer: true })
    };
    
    // Set up event handlers for each WebSocket server
    this.setupGeneralWSHandlers();
    this.setupRTCHandlers();
    this.setupBasicWSHandlers();
    
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
      } else {
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
            this.broadcastStatus(userId, data.online);
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
          this.connections.ws.delete(userId);
          
          // Broadcast offline status
          this.broadcastStatus(userId, false);
        }
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('[WS] WebSocket error:', error);
        if (userId) {
          this.connections.ws.delete(userId);
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
            // Type assertion to ensure it's treated as a number
            const userIdNum: number = userId;
            this.connections.rtc.set(userIdNum, ws);
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
          
          // Handle WebRTC signaling messages
          if ((data.type === 'offer' || data.type === 'answer' || data.type === 'ice_candidate') 
              && userId && data.targetUserId) {
            // Forward WebRTC signaling messages to the target user
            const targetWs = this.connections.rtc.get(data.targetUserId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              data.fromUserId = userId; // Add sender info
              this.sendToClient(targetWs, data);
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
          this.connections.rtc.delete(userId);
          
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
          this.connections.rtc.delete(userId);
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
        // Type assertion to ensure it's treated as a number
        const userIdNum: number = userId;
        this.connections.basic.set(userIdNum, ws);
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
            if (data.type === 'heartbeat') {
              this.sendToClient(ws, {
                type: 'ping',
                timestamp: Date.now()
              });
            }
            
            // Handle registration
            if (data.type === 'register' && data.userId) {
              userId = data.userId;
              // Type assertion to ensure it's treated as a number
              const userIdNum: number = userId as number;
              this.connections.basic.set(userIdNum, ws);
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
          this.connections.basic.delete(userId);
        }
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('[BASIC] WebSocket error:', error);
        if (userId) {
          this.connections.basic.delete(userId);
        }
      });
    });
  }
  
  // Helper methods
  
  private sendToClient(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
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
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, statusMessage);
      }
    });
  }
  
  private broadcastToMatch(data: any): void {
    if (!data.matchId) return;
    
    // This is a simplified implementation
    // In a real app, you'd determine which users are part of the match
    this.wss.ws.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, data);
      }
    });
  }
}