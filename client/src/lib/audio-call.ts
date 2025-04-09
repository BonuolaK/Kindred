/**
 * Audio Call Service using WebRTC and WebSockets
 */
import { queryClient } from './queryClient';

// Types for WebRTC connections
type RTCPeerData = {
  userId: number;
  connection: RTCPeerConnection;
  stream?: MediaStream;
};

// Call state
export type CallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended';

// Default time limits per day (in seconds)
export const TIME_LIMITS: Record<number, number> = {
  1: 300,  // Day 1: 5 minutes
  2: 600,  // Day 2: 10 minutes
  3: 1200, // Day 3: 20 minutes
  4: 1800, // Day 4+: 30 minutes (default)
};

class AudioCallService {
  private socket: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private callState: CallState = 'idle';
  private callListeners: ((state: CallState) => void)[] = [];
  private timerInterval: number | null = null;
  private callStartTime: number | null = null;
  private timeLimit: number = 300; // Default to 5 minutes in seconds
  private matchId: number | null = null;
  private userId: number | null = null;
  private otherUserId: number | null = null;
  private callDay: number = 1;
  
  // Initialize WebSocket connection
  initialize(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Initializing audio call service for user ${userId}`);
        this.userId = userId;
        
        // Set up WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log(`Connecting to WebSocket at ${wsUrl}`);

        // Test to see if server is accessible before trying to connect
        fetch('/api/user', { credentials: 'same-origin' })
          .then(response => {
            console.log('API connectivity check result:', response.status);
            if (!response.ok) {
              console.warn('API connectivity check failed, server might not be accessible');
            }
          })
          .catch(e => console.error('API connectivity check failed:', e));
        
        // Close existing socket if any
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
          console.log('Closing existing WebSocket connection');
          this.socket.close();
        }
        
        this.socket = new WebSocket(wsUrl);
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection timeout');
            this.socket.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 seconds timeout
        
        this.socket.onopen = () => {
          console.log(`[WS] Connection established successfully for user ${userId}`);
          clearTimeout(connectionTimeout);
          
          // Register user with WebSocket server
          this.sendSocketMessage({
            type: 'register',
            userId: this.userId
          });
          console.log(`[WS] User ${userId} registered with WebSocket server`);
          resolve();
        };
        
        this.socket.onclose = (event) => {
          console.log(`[WS] Connection closed: code=${event.code}, reason="${event.reason}", clean=${event.wasClean}`);
          clearTimeout(connectionTimeout);
          
          // Attempt to reconnect if not a clean close and we have a user ID
          if (!event.wasClean && this.userId) {
            console.log(`[WS] Connection closed unexpectedly, will retry in 5 seconds`);
            setTimeout(() => {
              console.log(`[WS] Attempting reconnection for user ${this.userId}`);
              if (this.userId) {
                this.initialize(this.userId).catch(err => {
                  console.error('[WS] Reconnection failed:', err);
                });
              }
            }, 5000);
          } else {
            // Just end the call on a clean close
            this.endCall();
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('[WS] Error occurred:', error);
          clearTimeout(connectionTimeout);
          reject(error);
        };
        
        this.socket.onmessage = (event) => {
          // Truncate the log to avoid flooding the console
          const dataPreview = event.data.substring(0, 100) + (event.data.length > 100 ? '...' : '');
          console.log(`[WS] Message received: ${dataPreview}`);
          this.handleSocketMessage(event);
        };
      } catch (error) {
        console.error('Error initializing audio call service:', error);
        reject(error);
      }
    });
  }
  
  // Close connections and clean up
  cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this.callState = 'idle';
    this.callStartTime = null;
    this.matchId = null;
    this.otherUserId = null;
    this.callDay = 1;
    this.updateCallState('idle');
  }
  
  // Start a call with another user
  async startCall(matchId: number, otherUserId: number, callDay: number): Promise<void> {
    try {
      console.log(`Starting call - Match ID: ${matchId}, User ID: ${otherUserId}, Call Day: ${callDay}`);
      
      if (this.callState !== 'idle') {
        throw new Error('Cannot start a call when one is already in progress');
      }
      
      // Make sure we have valid data before proceeding
      if (!matchId || !otherUserId || isNaN(matchId) || isNaN(otherUserId)) {
        throw new Error(`Invalid parameters: matchId=${matchId}, otherUserId=${otherUserId}`);
      }
      
      // Make sure WebSocket is connected
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected, attempting to reconnect...');
        if (this.userId) {
          await this.initialize(this.userId);
        } else {
          throw new Error('User ID not set, cannot initialize WebSocket');
        }
      }
      
      this.matchId = matchId;
      this.otherUserId = otherUserId;
      this.callDay = callDay || 1; // Default to first call day if not provided
      
      // Set time limit based on call day
      this.timeLimit = TIME_LIMITS[this.callDay] || TIME_LIMITS[4]; // Default to day 4+ if beyond
      
      // Update UI to show connecting state
      this.updateCallState('connecting');
      
      // Create call log on the server
      try {
        console.log(`Creating call log for match ID: ${matchId}`);
        const response = await fetch(`/api/matches/${matchId}/calls`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ matchId }), // Include match ID in body too
          credentials: 'same-origin' // Include cookies for authentication
        });
        
        if (!response.ok) {
          console.error('Error creating call log, status:', response.status);
          try {
            const error = await response.json();
            console.error('Error details:', error);
          } catch (e) {
            console.error('Could not parse error response');
          }
          // Continue even if API call fails
        } else {
          console.log('Call log created successfully');
        }
      } catch (error) {
        console.error('Error creating call log:', error);
        // Continue even if API call fails
      }
      
      try {
        // Get local audio stream
        console.log('Requesting microphone access...');
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('Microphone access granted');
        
        // Set up peer connection
        this.setupPeerConnection();
        
        // Send call offer to the other user
        console.log(`Sending call initiation to user ${otherUserId}`);
        this.sendSocketMessage({
          type: 'call-initiate',
          matchId: this.matchId,
          fromUserId: this.userId,
          toUserId: this.otherUserId,
          callDay: this.callDay
        });
        
        // Update state to show call is ringing
        this.updateCallState('ringing');
      } catch (mediaError) {
        console.error('Error accessing media devices:', mediaError);
        throw new Error('Could not access microphone. Please check your permissions and try again.');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      this.endCall();
      throw error;
    }
  }
  
  // Answer an incoming call
  async answerCall(matchId: number, fromUserId: number, callDay: number): Promise<void> {
    try {
      if (this.callState !== 'ringing') {
        throw new Error('No incoming call to answer');
      }
      
      this.matchId = matchId;
      this.otherUserId = fromUserId;
      this.callDay = callDay;
      
      // Set time limit based on call day
      this.timeLimit = TIME_LIMITS[callDay] || TIME_LIMITS[4]; // Default to day 4+ if beyond
      
      // Get local audio stream if not already acquired
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      
      // Set up peer connection if not already set up
      if (!this.peerConnection) {
        this.setupPeerConnection();
      }
      
      // Send answer to the caller
      this.sendSocketMessage({
        type: 'call-accept',
        matchId: this.matchId,
        fromUserId: this.userId,
        toUserId: this.otherUserId
      });
    } catch (error) {
      console.error('Error answering call:', error);
      this.endCall();
      throw error;
    }
  }
  
  // Reject an incoming call
  rejectCall(matchId: number, fromUserId: number): void {
    if (this.callState !== 'ringing') {
      return;
    }
    
    this.sendSocketMessage({
      type: 'call-reject',
      matchId: matchId,
      fromUserId: this.userId,
      toUserId: fromUserId
    });
    
    this.cleanup();
  }
  
  // End an ongoing call
  async endCall(): Promise<void> {
    if (this.callState === 'idle') {
      return;
    }
    
    // If call was connected, record the duration
    if (this.callState === 'connected' && this.callStartTime && this.matchId) {
      const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
      
      try {
        // Call API to record call end
        console.log(`Ending call for match ID: ${this.matchId}, duration: ${duration}s`);
        const response = await fetch(`/api/calls/${this.matchId}/end`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ duration }),
          credentials: 'same-origin' // Include cookies for authentication
        });
        
        if (!response.ok) {
          console.error('Error recording call end, status:', response.status);
          try {
            const error = await response.json();
            console.error('Error details:', error);
          } catch (e) {
            console.error('Could not parse error response');
          }
        } else {
          console.log('Call ended successfully');
        }
        
        // Invalidate match queries to update UI with new call status
        queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      } catch (error) {
        console.error('Error recording call end:', error);
      }
    }
    
    // Notify the other user that the call is ending
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.otherUserId) {
      this.sendSocketMessage({
        type: 'call-end',
        matchId: this.matchId,
        fromUserId: this.userId,
        toUserId: this.otherUserId
      });
    }
    
    // Update state and clean up resources
    this.updateCallState('ended');
    this.cleanup();
  }
  
  // Subscribe to call state changes
  onCallStateChange(callback: (state: CallState) => void): () => void {
    this.callListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.callListeners = this.callListeners.filter(cb => cb !== callback);
    };
  }
  
  // Get the current call state
  getCallState(): CallState {
    return this.callState;
  }
  
  // Get time remaining in the call (in seconds)
  getTimeRemaining(): number {
    if (this.callState !== 'connected' || !this.callStartTime) {
      return this.timeLimit;
    }
    
    const elapsedTime = Math.floor((Date.now() - this.callStartTime) / 1000);
    return Math.max(0, this.timeLimit - elapsedTime);
  }
  
  // Get the remote audio stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
  
  // Get the local audio stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
  
  // Get the current call day (1, 2, 3, etc.)
  getCallDay(): number {
    return this.callDay;
  }
  
  // Private methods
  
  // Set up WebRTC peer connection
  private setupPeerConnection(): void {
    // Create a new RTCPeerConnection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    
    // Add local stream to the peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }
    
    // Set up event handlers
    this.peerConnection.onicecandidate = this.handleIceCandidate.bind(this);
    this.peerConnection.ontrack = this.handleTrackEvent.bind(this);
    this.peerConnection.onconnectionstatechange = this.handleConnectionStateChange.bind(this);
  }
  
  // Handle ICE candidate events
  private handleIceCandidate(event: RTCPeerConnectionIceEvent): void {
    if (event.candidate && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSocketMessage({
        type: 'ice-candidate',
        candidate: event.candidate,
        matchId: this.matchId,
        fromUserId: this.userId,
        toUserId: this.otherUserId
      });
    }
  }
  
  // Handle track events (receiving remote audio)
  private handleTrackEvent(event: RTCTrackEvent): void {
    this.remoteStream = event.streams[0];
    
    // Notify listeners that we have remote audio
    if (this.callState === 'ringing' || this.callState === 'connecting') {
      this.callStartTime = Date.now();
      this.updateCallState('connected');
      
      // Start the call timer
      this.startCallTimer();
    }
  }
  
  // Handle connection state changes
  private handleConnectionStateChange(): void {
    if (!this.peerConnection) return;
    
    console.log('Connection state:', this.peerConnection.connectionState);
    
    if (this.peerConnection.connectionState === 'failed' || 
        this.peerConnection.connectionState === 'closed' ||
        this.peerConnection.connectionState === 'disconnected') {
      this.endCall();
    }
  }
  
  // Start the call timer
  private startCallTimer(): void {
    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
    }
    
    // Check time remaining every second
    this.timerInterval = window.setInterval(() => {
      const timeRemaining = this.getTimeRemaining();
      
      // End call when time is up
      if (timeRemaining <= 0) {
        this.endCall();
      }
    }, 1000);
  }
  
  // Handle incoming WebSocket messages
  private handleSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'call-initiate':
          if (message.toUserId === this.userId) {
            this.matchId = message.matchId;
            this.otherUserId = message.fromUserId;
            this.callDay = message.callDay;
            this.timeLimit = TIME_LIMITS[message.callDay] || TIME_LIMITS[4];
            this.updateCallState('ringing');
          }
          break;
          
        case 'call-accept':
          if (message.toUserId === this.userId && this.callState === 'ringing') {
            this.createAndSendOffer();
          }
          break;
          
        case 'call-reject':
          if (message.toUserId === this.userId) {
            this.updateCallState('ended');
            this.cleanup();
          }
          break;
          
        case 'call-end':
          if (message.toUserId === this.userId) {
            this.updateCallState('ended');
            this.cleanup();
          }
          break;
          
        case 'offer':
          if (message.toUserId === this.userId) {
            this.handleOffer(message.offer);
          }
          break;
          
        case 'answer':
          if (message.toUserId === this.userId) {
            this.handleAnswer(message.answer);
          }
          break;
          
        case 'ice-candidate':
          if (message.toUserId === this.userId) {
            this.handleRemoteIceCandidate(message.candidate);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  // Create and send WebRTC offer
  private async createAndSendOffer(): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSocketMessage({
        type: 'offer',
        offer: this.peerConnection.localDescription,
        matchId: this.matchId,
        fromUserId: this.userId,
        toUserId: this.otherUserId
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      this.endCall();
    }
  }
  
  // Handle incoming WebRTC offer
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      await this.setupPeerConnection();
    }
    
    try {
      await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection?.createAnswer();
      await this.peerConnection?.setLocalDescription(answer);
      
      this.sendSocketMessage({
        type: 'answer',
        answer: this.peerConnection?.localDescription,
        matchId: this.matchId,
        fromUserId: this.userId,
        toUserId: this.otherUserId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      this.endCall();
    }
  }
  
  // Handle incoming WebRTC answer
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
      this.endCall();
    }
  }
  
  // Handle remote ICE candidate
  private async handleRemoteIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }
  
  // Send a message through the WebSocket
  private sendSocketMessage(message: any): void {
    // Make sure user IDs are numbers not strings
    if (message.userId && typeof message.userId === 'string') {
      message.userId = parseInt(message.userId, 10);
    }
    if (message.fromUserId && typeof message.fromUserId === 'string') {
      message.fromUserId = parseInt(message.fromUserId, 10);
    }
    if (message.toUserId && typeof message.toUserId === 'string') {
      message.toUserId = parseInt(message.toUserId, 10);
    }
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        console.log(`[WS] Sending message: ${messageStr.substring(0, 100)}${messageStr.length > 100 ? '...' : ''}`);
        this.socket.send(messageStr);
      } catch (error) {
        console.error('[WS] Error sending message:', error);
        
        // Try to reconnect if there was an error sending the message
        if (this.userId) {
          console.log('[WS] Attempting to reconnect after send error');
          this.initialize(this.userId).catch(e => {
            console.error('[WS] Failed to reconnect after send error:', e);
          });
        }
      }
    } else {
      const state = this.socket ? 
        ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.socket.readyState] : 
        'socket is null';
      
      console.warn(`[WS] Cannot send message, socket state: ${state}`);
      
      // Try to reconnect if the socket is not open
      if (this.userId && (!this.socket || this.socket.readyState !== WebSocket.CONNECTING)) {
        console.log('[WS] Attempting to reconnect for message sending');
        this.initialize(this.userId).catch(e => {
          console.error('[WS] Failed to reconnect for message sending:', e);
        });
      }
    }
  }
  
  // Update call state and notify listeners
  private updateCallState(state: CallState): void {
    this.callState = state;
    this.callListeners.forEach(listener => listener(state));
  }
}

// Export singleton instance
export const audioCallService = new AudioCallService();

// Initialize during app startup with the current user ID
export const initializeAudioService = (userId: number): Promise<void> => {
  return audioCallService.initialize(userId);
};