/**
 * WebRTC Service
 * 
 * Manages WebRTC connections with proper configuration, error handling,
 * and reconnection logic. Handles media stream acquisition, ICE candidate
 * exchange, and SDP negotiation.
 * 
 * Troubleshooting Notes:
 * 
 * 1. WebSocket Connection Issues:
 *    - WebSocket error 1006 often indicates an abnormal closure without proper termination
 *    - Common causes include: network interruptions, server crashes, timeouts, CORS issues, or proxy/load balancer problems
 *    - Our heartbeat mechanism detects disconnections and automatically attempts reconnection
 *    - Connection stability issues can be diagnosed using WebSocket Diagnostics (/ws-diagnostics)
 * 
 * 2. WebRTC Connection Failures:
 *    - ICE connectivity failures are often related to network restrictions or firewall settings
 *    - Our implementation uses multiple STUN servers and falls back to relay servers if direct connection fails
 *    - Detailed connection state is logged in the console and can be monitored in the browser
 * 
 * 3. Media Stream Issues:
 *    - Access to camera/microphone requires proper permissions
 *    - Mobile browser compatibility varies, we handle fallbacks for audio-only mode
 * 
 * 4. Debugging Tools:
 *    - WebRTC stats are collected and can be inspected for detailed metrics
 *    - ConnectionState tracking provides visibility into the connectivity process
 *    - ICE candidate gathering timeouts help prevent stalled connections
 */

import { queryClient } from './queryClient';
import { createWebSocketWithHeartbeat, WebSocketWithHeartbeat } from './websocket-heartbeat';

// STUN and TURN server configuration
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Add your TURN servers here - critical for production!
  /*
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'username',
    credential: 'password'
  }
  */
];

// Configuration for RTCPeerConnection
const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all', // Can be set to 'relay' to force TURN
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// WebRTC constraints for getUserMedia
const DEFAULT_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: false
};

// Timeouts for various operations (in milliseconds)
const ICE_GATHERING_TIMEOUT = 5000; // How long to wait for ICE gathering
const CONNECTION_TIMEOUT = 30000; // How long to wait for connection establishment
const RECONNECTION_ATTEMPTS = 3; // Maximum number of reconnection attempts
const RECONNECTION_DELAY = 2000; // Delay between reconnection attempts

// Events emitted by the service
export type WebRTCEvent = 
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'disconnected', reason?: string }
  | { type: 'error', error: Error }
  | { type: 'localStream', stream: MediaStream }
  | { type: 'remoteStream', stream: MediaStream }
  | { type: 'roomJoined', roomId: string, participants: number[] }
  | { type: 'participantJoined', userId: number }
  | { type: 'participantLeft', userId: number }
  | { type: 'reconnecting', attempt: number }
  | { type: 'iceStateChange', state: RTCIceConnectionState }
  | { type: 'connectionStateChange', state: RTCPeerConnectionState }
  | { type: 'signalStateChange', state: RTCSignalingState }
  | { type: 'statReport', report: RTCStatsReport };

// Connection states
export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

/**
 * WebRTC Service class
 */
export class WebRTCService {
  // Core WebRTC and signaling
  private socket: WebSocketWithHeartbeat | null = null;
  private peerConnections: Map<number, RTCPeerConnection> = new Map();
  
  // Media streams
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<number, MediaStream> = new Map();
  
  // State tracking
  private userId: number | null = null;
  private sessionId: string | null = null;
  private roomId: string | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private iceCandidateQueue: Map<number, RTCIceCandidate[]> = new Map();
  private mediaConstraints: MediaStreamConstraints = DEFAULT_MEDIA_CONSTRAINTS;
  
  // Callbacks and timers
  private eventListeners: ((event: WebRTCEvent) => void)[] = [];
  private heartbeatInterval: number | null = null;
  private reconnectionAttempts = 0;
  private iceCandidateTimeout: Map<number, number> = new Map();
  private connectionTimeout: Map<number, number> = new Map();
  
  // Statistics and diagnostics
  private stats: Map<number, any> = new Map();
  private statsInterval: number | null = null;
  
  /**
   * Initialize the WebRTC service
   */
  /**
   * Get the current WebSocket instance for direct messaging
   */
  getWebSocketInstance(): WebSocketWithHeartbeat | null {
    return this.socket;
  }
  
  /**
   * Initialize the WebRTC service with user information
   */
  async initialize(userId: number, videoEnabled = false): Promise<void> {
    if (this.userId === userId && this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('[WebRTC] Already initialized');
      return;
    }
    
    try {
      this.userId = userId;
      
      // Update media constraints if video is enabled
      if (videoEnabled) {
        this.mediaConstraints = {
          ...DEFAULT_MEDIA_CONSTRAINTS,
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: 'user'
          }
        };
      } else {
        this.mediaConstraints = { ...DEFAULT_MEDIA_CONSTRAINTS };
      }
      
      // Setup WebSocket connection
      await this.setupSignaling();
      
      console.log('[WebRTC] Service initialized for user', userId);
    } catch (error) {
      console.error('[WebRTC] Initialization error:', error);
      this.emitEvent({ type: 'error', error: error instanceof Error ? error : new Error(String(error)) });
      throw error;
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    // Leave current room if in one
    if (this.roomId) {
      this.leaveRoom();
    }
    
    // Close all peer connections
    this.peerConnections.forEach((pc, peerId) => {
      this.closePeerConnection(peerId);
    });
    
    // Close local media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clear remote streams
    this.remoteStreams.clear();
    
    // Clear signaling connection
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    this.socket = null;
    
    // Clear timers
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.statsInterval) {
      window.clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    this.iceCandidateTimeout.forEach((timeout) => window.clearTimeout(timeout));
    this.connectionTimeout.forEach((timeout) => window.clearTimeout(timeout));
    
    this.iceCandidateTimeout.clear();
    this.connectionTimeout.clear();
    
    // Reset state
    this.sessionId = null;
    this.roomId = null;
    this.connectionState = 'disconnected';
    this.userId = null;
    this.reconnectionAttempts = 0;
    
    console.log('[WebRTC] Service cleaned up');
  }
  
  /**
   * Create or join a room
   */
  async joinRoom(roomId: string, metadata?: any): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Signaling connection not established');
    }
    
    if (!this.userId) {
      throw new Error('User ID not set');
    }
    
    // Leave current room if in one
    if (this.roomId) {
      await this.leaveRoom();
    }
    
    console.log(`[WebRTC] Joining room ${roomId}`);
    this.updateConnectionState('connecting');
    
    // Ensure we have media permissions before joining
    if (!this.localStream) {
      try {
        await this.getLocalStream();
      } catch (error) {
        console.error('[WebRTC] Failed to get local media stream:', error);
        throw new Error('Failed to access microphone or camera');
      }
    }
    
    // Join the room
    this.sendSignalingMessage({
      type: 'join_room',
      roomId,
      data: metadata
    });
    
    // Return a promise that resolves when we receive the room_joined event
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting to join room'));
      }, 10000);
      
      const onEvent = (event: WebRTCEvent) => {
        if (event.type === 'roomJoined' && event.roomId === roomId) {
          clearTimeout(timeout);
          this.removeEventListener(onEvent);
          resolve();
        } else if (event.type === 'error') {
          clearTimeout(timeout);
          this.removeEventListener(onEvent);
          reject(event.error);
        }
      };
      
      this.addEventListener(onEvent);
    });
  }
  
  /**
   * Leave the current room
   */
  async leaveRoom(): Promise<void> {
    if (!this.roomId) {
      return;
    }
    
    console.log(`[WebRTC] Leaving room ${this.roomId}`);
    
    // Close all peer connections
    this.peerConnections.forEach((_, peerId) => {
      this.closePeerConnection(peerId);
    });
    
    // Clear remote streams
    this.remoteStreams.clear();
    
    // Send leave message
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSignalingMessage({
        type: 'leave_room'
      });
    }
    
    // Update state
    const oldRoomId = this.roomId;
    this.roomId = null;
    this.updateConnectionState('disconnected');
    
    console.log(`[WebRTC] Left room ${oldRoomId}`);
  }
  
  /**
   * Get the local media stream
   */
  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }
    
    try {
      console.log('[WebRTC] Requesting user media:', this.mediaConstraints);
      const stream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints);
      
      this.localStream = stream;
      this.emitEvent({ type: 'localStream', stream });
      
      // Add tracks to existing peer connections
      if (this.localStream) {
        this.peerConnections.forEach((pc, peerId) => {
          this.addTracksToConnection(pc, peerId);
        });
      }
      
      return stream;
    } catch (error) {
      console.error('[WebRTC] Error getting user media:', error);
      this.emitEvent({ 
        type: 'error', 
        error: new Error('Could not access camera or microphone') 
      });
      throw error;
    }
  }
  
  /**
   * Set audio mute status
   */
  setAudioEnabled(enabled: boolean): void {
    if (!this.localStream) return;
    
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
    
    console.log(`[WebRTC] Audio ${enabled ? 'enabled' : 'muted'}`);
  }
  
  /**
   * Set video enabled status
   */
  setVideoEnabled(enabled: boolean): void {
    if (!this.localStream) return;
    
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
    
    console.log(`[WebRTC] Video ${enabled ? 'enabled' : 'muted'}`);
  }
  
  /**
   * Get remote streams
   */
  getRemoteStreams(): Map<number, MediaStream> {
    return this.remoteStreams;
  }
  
  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  /**
   * Subscribe to events
   */
  addEventListener(callback: (event: WebRTCEvent) => void): () => void {
    this.eventListeners.push(callback);
    return () => this.removeEventListener(callback);
  }
  
  /**
   * Remove event listener
   */
  removeEventListener(callback: (event: WebRTCEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(cb => cb !== callback);
  }
  
  /**
   * Get connection stats for a specific peer
   */
  async getStats(peerId: number): Promise<RTCStatsReport | null> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return null;
    
    try {
      return await pc.getStats();
    } catch (error) {
      console.error('[WebRTC] Error getting stats:', error);
      return null;
    }
  }
  
  /**
   * Restart ICE connection for a specific peer
   */
  async restartIce(peerId: number): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.warn(`[WebRTC] Cannot restart ICE for unknown peer ${peerId}`);
      return;
    }
    
    try {
      console.log(`[WebRTC] Restarting ICE for peer ${peerId}`);
      await pc.restartIce();
    } catch (error) {
      console.error('[WebRTC] Error restarting ICE:', error);
      // Try recreating the connection
      this.handleConnectionFailure(peerId);
    }
  }
  
  /* Private methods */
  
  /**
   * Set up WebSocket signaling connection
   */
  private async setupSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
          this.socket.close();
        }
        
        // Create new WebSocket connection with better error handling for Replit
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        
        // Run a quick health check on the API to ensure the server is accessible
        fetch('/api/user', { method: 'HEAD', credentials: 'same-origin' })
          .then(() => {
            console.log(`[WebRTC] Server is accessible, proceeding with WebSocket connection`);
          })
          .catch(err => {
            console.warn(`[WebRTC] Server health check failed: ${err.message}`);
          });
        
        // Build the WebSocket URL with explicit host to handle Replit domains
        const wsUrl = `${protocol}//${host}/rtc`; // Use /rtc for WebRTC signaling
        
        console.log(`[WebRTC] Connecting to signaling server at ${wsUrl} with heartbeat`);
        this.socket = createWebSocketWithHeartbeat(wsUrl);
        
        // Store user ID for reconnection support
        if (this.userId) {
          this.socket.userId = this.userId;
        }
        
        // Set up connection timeout (extend to 15 seconds for Replit)
        const connectionTimeout = setTimeout(() => {
          console.error('[WebRTC] WebSocket connection timed out');
          reject(new Error('Signaling connection timeout'));
        }, 15000);
        
        // Use event listeners instead of direct property assignment for better compatibility
        this.socket.addEventListener('open', () => {
          console.log('[WebRTC] Signaling connection established');
          clearTimeout(connectionTimeout);
          
          // The heartbeat is now handled by the WebSocketWithHeartbeat implementation
          
          // If we have a user ID, register with the server
          if (this.userId) {
            this.sendSignalingMessage({
              type: 'register',
              userId: this.userId
            });
          }
          
          // Resolve the promise
          resolve();
        });
        
        this.socket.addEventListener('message', (event) => {
          this.handleSignalingMessage(event.data);
        });
        
        this.socket.addEventListener('close', (event) => {
          console.log(`[WebRTC] Signaling connection closed: ${event.code} ${event.reason}`);
          clearTimeout(connectionTimeout);
          
          // Our WebSocketWithHeartbeat implementation will handle reconnection
        });
        
        this.socket.addEventListener('error', (error) => {
          console.error('[WebRTC] Signaling error:', error);
          clearTimeout(connectionTimeout);
          
          // Only reject if we haven't resolved yet
          // This prevents errors during reconnection attempts from causing issues
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            reject(new Error('Signaling connection error'));
          }
        });
        
        // Set up reconnection callback
        this.socket.onReconnect = () => {
          console.log('[WebRTC] WebSocket reconnected, re-registering...');
          
          // Re-register user ID
          if (this.userId) {
            this.sendSignalingMessage({
              type: 'register',
              userId: this.userId
            });
          }
          
          // Re-join room if we were in one
          if (this.roomId) {
            console.log(`[WebRTC] Re-joining room ${this.roomId} after reconnection`);
            this.joinRoom(this.roomId)
              .then(() => console.log(`[WebRTC] Successfully re-joined room ${this.roomId}`))
              .catch(error => console.error(`[WebRTC] Failed to re-join room: ${error.message}`));
          }
        };
      } catch (error) {
        console.error('[WebRTC] Failed to set up signaling:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Set up heartbeat to keep WebSocket connection alive
   * Note: This is now handled by the WebSocketWithHeartbeat implementation
   */
  private setupHeartbeat(): void {
    // This method is now a no-op as heartbeats are handled by WebSocketWithHeartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Send a message through the signaling channel
   */
  private sendSignalingMessage(message: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebRTC] Cannot send message, signaling connection not open');
      return;
    }
    
    // Add user ID to message if available
    if (this.userId) {
      message.userId = this.userId;
    }
    
    // Add session ID if available
    if (this.sessionId) {
      message.sessionId = this.sessionId;
    }
    
    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('[WebRTC] Error sending signaling message:', error);
    }
  }
  
  /**
   * Handle incoming signaling messages
   */
  private handleSignalingMessage(data: string | Buffer | ArrayBuffer): void {
    // Check if the data is valid before attempting to parse
    if (!data) {
      console.error('[WebRTC] Received empty signaling message');
      return;
    }
    
    try {
      // Ensure we're parsing a string
      let dataStr: string;
      if (typeof data === 'string') {
        dataStr = data;
      } else if (data instanceof Buffer || data instanceof ArrayBuffer) {
        dataStr = Buffer.from(data).toString();
      } else {
        console.error('[WebRTC] Received message of unexpected type:', typeof data);
        return;
      }
      
      const message = JSON.parse(dataStr);
      console.log(`[WebRTC] Received signaling message: ${message.type}`);
      
      switch (message.type) {
        case 'session_created':
          this.sessionId = message.sessionId;
          
          // Register with the signaling server
          if (this.userId) {
            this.sendSignalingMessage({
              type: 'register',
              userId: this.userId
            });
          }
          break;
        
        case 'registered':
          console.log(`[WebRTC] Registered with signaling server, session ID: ${message.sessionId}`);
          break;
        
        case 'room_joined':
          this.roomId = message.roomId;
          console.log(`[WebRTC] Joined room ${this.roomId}, participants: ${message.participants?.length || 0}`);
          
          // Create peer connections for existing participants
          if (message.participants && message.participants.length > 0) {
            message.participants.forEach((peerId: number) => {
              this.createPeerConnection(peerId, true); // Create as offerer
            });
          }
          
          // Make sure we're using a string roomId
          const safeRoomId = this.roomId || '';
          this.emitEvent({ 
            type: 'roomJoined', 
            roomId: safeRoomId, 
            participants: message.participants || [] 
          });
          break;
        
        case 'room_left':
          const oldRoomId = this.roomId;
          this.roomId = null;
          console.log(`[WebRTC] Left room ${oldRoomId}`);
          break;
        
        case 'participant_joined':
          const newPeerId = message.userId;
          console.log(`[WebRTC] Participant joined: ${newPeerId}`);
          
          // Create peer connection for new participant
          this.createPeerConnection(newPeerId, true); // Create as offerer
          
          this.emitEvent({ type: 'participantJoined', userId: newPeerId });
          break;
        
        case 'participant_left':
          const departingPeerId = message.userId;
          console.log(`[WebRTC] Participant left: ${departingPeerId}`);
          
          // Clean up connection with departing peer
          this.closePeerConnection(departingPeerId);
          
          this.emitEvent({ type: 'participantLeft', userId: departingPeerId });
          break;
        
        case 'offer':
          this.handleRemoteOffer(message.userId, message.data);
          break;
        
        case 'answer':
          this.handleRemoteAnswer(message.userId, message.data);
          break;
        
        case 'ice_candidate':
          this.handleRemoteIceCandidate(message.userId, message.data);
          break;
        
        case 'ice_complete':
          console.log(`[WebRTC] Remote ICE candidates complete from peer ${message.userId}`);
          break;
        
        case 'peer_connection_error':
          console.warn(`[WebRTC] Peer ${message.userId} reported connection error:`, message.data);
          break;
        
        case 'error':
          console.error('[WebRTC] Signaling error:', message.data?.message);
          this.emitEvent({ 
            type: 'error', 
            error: new Error(`Signaling error: ${message.data?.message || 'unknown'}`) 
          });
          break;
        
        default:
          console.log(`[WebRTC] Unhandled signaling message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[WebRTC] Error handling signaling message:', error);
    }
  }
  
  /**
   * Create a new peer connection with a remote peer
   */
  private createPeerConnection(peerId: number, isOfferer: boolean): RTCPeerConnection {
    // Check if we already have a connection with this peer
    if (this.peerConnections.has(peerId)) {
      console.log(`[WebRTC] Using existing peer connection for ${peerId}`);
      return this.peerConnections.get(peerId)!;
    }
    
    console.log(`[WebRTC] Creating new peer connection for ${peerId}, as ${isOfferer ? 'offerer' : 'answerer'}`);
    
    // Create new connection with ICE servers config
    const pc = new RTCPeerConnection(RTC_CONFIG);
    
    // Store the connection
    this.peerConnections.set(peerId, pc);
    
    // Set up ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send the ICE candidate to the remote peer
        this.sendSignalingMessage({
          type: 'ice_candidate',
          targetUserId: peerId,
          data: event.candidate
        });
      } else {
        // ICE candidate gathering is complete
        this.sendSignalingMessage({
          type: 'ice_complete',
          targetUserId: peerId
        });
        
        // Clear any existing ICE gathering timeout
        if (this.iceCandidateTimeout.has(peerId)) {
          clearTimeout(this.iceCandidateTimeout.get(peerId));
          this.iceCandidateTimeout.delete(peerId);
        }
      }
    };
    
    // Handle state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state change for peer ${peerId}:`, pc.iceConnectionState);
      this.emitEvent({ type: 'iceStateChange', state: pc.iceConnectionState });
      
      switch (pc.iceConnectionState) {
        case 'checking':
          // Set connection timeout
          this.setConnectionTimeout(peerId);
          break;
        
        case 'connected':
        case 'completed':
          // Clear any connection timeout
          if (this.connectionTimeout.has(peerId)) {
            clearTimeout(this.connectionTimeout.get(peerId));
            this.connectionTimeout.delete(peerId);
          }
          
          this.updateConnectionState('connected');
          break;
        
        case 'failed':
          console.error(`[WebRTC] ICE connection failed for peer ${peerId}`);
          this.handleConnectionFailure(peerId);
          break;
        
        case 'disconnected':
          console.warn(`[WebRTC] ICE connection disconnected for peer ${peerId}`);
          // Give some time for the connection to recover before handling it as a failure
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              this.handleConnectionFailure(peerId);
            }
          }, 5000);
          break;
        
        case 'closed':
          this.closePeerConnection(peerId);
          break;
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state change for peer ${peerId}:`, pc.connectionState);
      this.emitEvent({ type: 'connectionStateChange', state: pc.connectionState });
      
      switch (pc.connectionState) {
        case 'connected':
          this.updateConnectionState('connected');
          break;
        
        case 'failed':
          console.error(`[WebRTC] Connection failed for peer ${peerId}`);
          this.handleConnectionFailure(peerId);
          break;
        
        case 'closed':
          this.closePeerConnection(peerId);
          break;
      }
    };
    
    pc.onsignalingstatechange = () => {
      console.log(`[WebRTC] Signaling state change for peer ${peerId}:`, pc.signalingState);
      this.emitEvent({ type: 'signalStateChange', state: pc.signalingState });
    };
    
    // Handle tracks received from remote peer
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Remote track received from peer ${peerId}:`, event.track.kind);
      
      const remoteStream = event.streams[0];
      if (remoteStream) {
        this.remoteStreams.set(peerId, remoteStream);
        this.emitEvent({ type: 'remoteStream', stream: remoteStream });
      }
    };
    
    // Add local tracks to the connection
    this.addTracksToConnection(pc, peerId);
    
    // Start connection process if we're the offerer
    if (isOfferer) {
      this.createAndSendOffer(peerId);
    }
    
    // Start collecting stats
    this.startStatsCollection(peerId, pc);
    
    return pc;
  }
  
  /**
   * Add local tracks to the peer connection
   */
  private addTracksToConnection(pc: RTCPeerConnection, peerId: number): void {
    if (!this.localStream) return;
    
    try {
      const senders = pc.getSenders();
      const existingTracks = senders.map(sender => sender.track?.id);
      
      this.localStream.getTracks().forEach(track => {
        // Only add tracks that aren't already in the connection
        if (!existingTracks.includes(track.id)) {
          console.log(`[WebRTC] Adding ${track.kind} track to connection with peer ${peerId}`);
          pc.addTrack(track, this.localStream!);
        }
      });
    } catch (error) {
      console.error(`[WebRTC] Error adding tracks to peer ${peerId}:`, error);
    }
  }
  
  /**
   * Close and clean up a peer connection
   */
  private closePeerConnection(peerId: number): void {
    console.log(`[WebRTC] Closing connection with peer ${peerId}`);
    
    // Get the connection
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;
    
    // Close the connection
    try {
      pc.close();
    } catch (error) {
      console.error(`[WebRTC] Error closing connection with peer ${peerId}:`, error);
    }
    
    // Clean up resources
    this.peerConnections.delete(peerId);
    this.remoteStreams.delete(peerId);
    
    // Clear any timers
    if (this.iceCandidateTimeout.has(peerId)) {
      clearTimeout(this.iceCandidateTimeout.get(peerId));
      this.iceCandidateTimeout.delete(peerId);
    }
    
    if (this.connectionTimeout.has(peerId)) {
      clearTimeout(this.connectionTimeout.get(peerId));
      this.connectionTimeout.delete(peerId);
    }
    
    console.log(`[WebRTC] Connection with peer ${peerId} closed`);
  }
  
  /**
   * Create and send an offer to a remote peer
   */
  private async createAndSendOffer(peerId: number): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.warn(`[WebRTC] Cannot create offer for unknown peer ${peerId}`);
      return;
    }
    
    try {
      console.log(`[WebRTC] Creating offer for peer ${peerId}`);
      
      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.mediaConstraints.video !== false,
        iceRestart: pc.iceConnectionState === 'failed'
      });
      
      // Set local description
      await pc.setLocalDescription(offer);
      
      // Send the offer to the remote peer through signaling
      this.sendSignalingMessage({
        type: 'offer',
        targetUserId: peerId,
        data: offer
      });
      
      // Set ICE gathering timeout
      this.setIceGatheringTimeout(peerId);
      
      console.log(`[WebRTC] Offer sent to peer ${peerId}`);
    } catch (error) {
      console.error(`[WebRTC] Error creating offer for peer ${peerId}:`, error);
      this.emitEvent({ 
        type: 'error', 
        error: new Error(`Failed to create offer: ${error}`) 
      });
    }
  }
  
  /**
   * Handle a remote offer from a peer
   */
  private async handleRemoteOffer(peerId: number, offer: RTCSessionDescriptionInit): Promise<void> {
    console.log(`[WebRTC] Received offer from peer ${peerId}`);
    
    // Validate the offer data
    if (!offer || !offer.sdp) {
      console.error(`[WebRTC] Invalid offer received from peer ${peerId}:`, offer);
      return;
    }
    
    // Create or get peer connection
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId, false); // Create as answerer
    }
    
    try {
      // Set remote description from the offer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any queued ICE candidates
      this.processIceCandidateQueue(peerId);
      
      // Create answer
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.mediaConstraints.video !== false
      });
      
      // Set local description
      await pc.setLocalDescription(answer);
      
      // Send the answer to the remote peer
      this.sendSignalingMessage({
        type: 'answer',
        targetUserId: peerId,
        data: answer
      });
      
      // Set ICE gathering timeout
      this.setIceGatheringTimeout(peerId);
      
      console.log(`[WebRTC] Answer sent to peer ${peerId}`);
    } catch (error) {
      console.error(`[WebRTC] Error handling offer from peer ${peerId}:`, error);
      this.emitEvent({ 
        type: 'error', 
        error: new Error(`Failed to handle offer: ${error}`) 
      });
    }
  }
  
  /**
   * Handle a remote answer from a peer
   */
  private async handleRemoteAnswer(peerId: number, answer: RTCSessionDescriptionInit): Promise<void> {
    console.log(`[WebRTC] Received answer from peer ${peerId}`);
    
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.warn(`[WebRTC] Received answer from unknown peer ${peerId}`);
      return;
    }
    
    try {
      // Set remote description from the answer
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      
      // Process any queued ICE candidates
      this.processIceCandidateQueue(peerId);
      
      console.log(`[WebRTC] Set remote description for peer ${peerId}`);
    } catch (error) {
      console.error(`[WebRTC] Error handling answer from peer ${peerId}:`, error);
      this.emitEvent({ 
        type: 'error', 
        error: new Error(`Failed to handle answer: ${error}`) 
      });
    }
  }
  
  /**
   * Handle a remote ICE candidate from a peer
   */
  private async handleRemoteIceCandidate(peerId: number, candidate: RTCIceCandidateInit): Promise<void> {
    console.log(`[WebRTC] Received ICE candidate from peer ${peerId}`);
    
    const pc = this.peerConnections.get(peerId);
    
    // If we don't have a connection or the connection is not ready, queue the candidate
    if (!pc || pc.remoteDescription === null) {
      // Initialize queue if needed
      if (!this.iceCandidateQueue.has(peerId)) {
        this.iceCandidateQueue.set(peerId, []);
      }
      
      // Add to queue
      this.iceCandidateQueue.get(peerId)!.push(new RTCIceCandidate(candidate));
      console.log(`[WebRTC] Queued ICE candidate for peer ${peerId}, remote description not set yet`);
      return;
    }
    
    try {
      // Add the ICE candidate to the connection
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`[WebRTC] Error adding ICE candidate from peer ${peerId}:`, error);
    }
  }
  
  /**
   * Process queued ICE candidates for a peer
   */
  private async processIceCandidateQueue(peerId: number): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    const queue = this.iceCandidateQueue.get(peerId);
    
    if (!pc || !queue || queue.length === 0) return;
    
    console.log(`[WebRTC] Processing ${queue.length} queued ICE candidates for peer ${peerId}`);
    
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error(`[WebRTC] Error adding queued ICE candidate:`, error);
      }
    }
    
    // Clear the queue
    this.iceCandidateQueue.set(peerId, []);
  }
  
  /**
   * Start collecting stats for a peer connection
   */
  private startStatsCollection(peerId: number, pc: RTCPeerConnection): void {
    const intervalId = window.setInterval(async () => {
      if (!this.peerConnections.has(peerId)) {
        clearInterval(intervalId);
        return;
      }
      
      try {
        const stats = await pc.getStats();
        this.stats.set(peerId, stats);
        this.emitEvent({ type: 'statReport', report: stats });
      } catch (error) {
        console.warn(`[WebRTC] Error collecting stats for peer ${peerId}:`, error);
      }
    }, 5000); // Collect stats every 5 seconds
  }
  
  /**
   * Set ICE gathering timeout for a peer
   */
  private setIceGatheringTimeout(peerId: number): void {
    // Clear any existing timeout
    if (this.iceCandidateTimeout.has(peerId)) {
      clearTimeout(this.iceCandidateTimeout.get(peerId));
    }
    
    // Set new timeout
    const timeoutId = window.setTimeout(() => {
      console.warn(`[WebRTC] ICE gathering timed out for peer ${peerId}`);
      const pc = this.peerConnections.get(peerId);
      
      if (pc && pc.iceGatheringState !== 'complete') {
        // Send the current candidates even if gathering is not complete
        this.sendSignalingMessage({
          type: 'ice_complete',
          targetUserId: peerId
        });
      }
    }, ICE_GATHERING_TIMEOUT);
    
    this.iceCandidateTimeout.set(peerId, timeoutId);
  }
  
  /**
   * Set connection timeout for a peer
   */
  private setConnectionTimeout(peerId: number): void {
    // Clear any existing timeout
    if (this.connectionTimeout.has(peerId)) {
      clearTimeout(this.connectionTimeout.get(peerId));
    }
    
    // Set new timeout
    const timeoutId = window.setTimeout(() => {
      console.warn(`[WebRTC] Connection timed out for peer ${peerId}`);
      this.handleConnectionFailure(peerId);
    }, CONNECTION_TIMEOUT);
    
    this.connectionTimeout.set(peerId, timeoutId);
  }
  
  /**
   * Handle a connection failure with a peer
   */
  private handleConnectionFailure(peerId: number): void {
    console.log(`[WebRTC] Handling connection failure for peer ${peerId}`);
    
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;
    
    // Notify remote peer about the error
    this.sendSignalingMessage({
      type: 'connection_error',
      targetUserId: peerId,
      data: { 
        message: 'Connection failed, attempting reconnection',
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState
      }
    });
    
    // Try to restart ICE if the connection exists
    if (pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
      console.log(`[WebRTC] Attempting to restart ICE for peer ${peerId}`);
      this.createAndSendOffer(peerId);
      return;
    }
    
    // If ICE restart doesn't work, recreate the connection
    console.log(`[WebRTC] Recreating connection for peer ${peerId}`);
    this.closePeerConnection(peerId);
    this.createPeerConnection(peerId, true);
  }
  
  /**
   * Attempt to reconnect to the signaling server with improved reliability
   */
  private attemptReconnect(): void {
    if (this.reconnectionAttempts >= RECONNECTION_ATTEMPTS) {
      console.error('[WebRTC] Max reconnection attempts reached, giving up');
      this.updateConnectionState('failed');
      this.emitEvent({ 
        type: 'error', 
        error: new Error('Failed to reconnect to signaling server after multiple attempts') 
      });
      return;
    }
    
    this.reconnectionAttempts++;
    this.updateConnectionState('reconnecting');
    
    console.log(`[WebRTC] Attempting to reconnect, attempt ${this.reconnectionAttempts}/${RECONNECTION_ATTEMPTS}`);
    this.emitEvent({ type: 'reconnecting', attempt: this.reconnectionAttempts });
    
    // Check the server health before attempting reconnection
    fetch('/api/user', { method: 'HEAD', credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) {
          console.warn('[WebRTC] Server health check before reconnection failed with status', response.status);
        } else {
          console.log('[WebRTC] Server health check passed, attempting WebSocket reconnection');
        }
      })
      .catch(error => {
        console.warn('[WebRTC] Server health check failed:', error.message);
      })
      .finally(() => {
        // Proceed with reconnection after server health check
        setTimeout(this.doReconnect.bind(this), RECONNECTION_DELAY);
      });
  }
  
  /**
   * Execute the actual reconnection logic
   */
  private async doReconnect(): Promise<void> {
    if (!this.userId) return;
    
    try {
      await this.setupSignaling();
      
      // Rejoin room if we were in one
      if (this.roomId) {
        await this.joinRoom(this.roomId);
      }
      
      // Reset reconnection attempts on success
      this.reconnectionAttempts = 0;
      console.log('[WebRTC] Reconnection successful');
      
    } catch (error) {
      console.error('[WebRTC] Reconnection attempt failed:', error);
      
      // Use increasing backoff for retries
      const backoffDelay = RECONNECTION_DELAY * Math.min(2, this.reconnectionAttempts);
      console.log(`[WebRTC] Will retry in ${backoffDelay/1000} seconds`);
      
      setTimeout(() => this.attemptReconnect(), backoffDelay);
    }
  }
  
  /**
   * Update the connection state
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    
    this.connectionState = state;
    
    switch (state) {
      case 'connecting':
        this.emitEvent({ type: 'connecting' });
        break;
      
      case 'connected':
        this.emitEvent({ type: 'connected' });
        break;
      
      case 'disconnected':
        this.emitEvent({ type: 'disconnected' });
        break;
      
      case 'failed':
        this.emitEvent({ 
          type: 'disconnected', 
          reason: 'Connection failed after multiple attempts' 
        });
        break;
    }
  }
  
  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: WebRTCEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[WebRTC] Error in event listener:', error);
      }
    });
  }
}

// Export singleton instance
export const webRTCService = new WebRTCService();

// Initialize the service
export const initializeWebRTC = (userId: number, videoEnabled = false): Promise<void> => {
  return webRTCService.initialize(userId, videoEnabled);
};