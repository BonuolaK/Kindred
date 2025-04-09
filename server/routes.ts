import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { MatchingAlgorithm, canReceiveNewMatch } from "./matching-algorithm";
import { setupSocketServer } from "./socket";
import { setupWebRTCSignaling } from "./webrtc-signaling";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up auth routes
  setupAuth(app);
  
  // User endpoints
  app.get("/api/users/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Filter out sensitive information
      const { password, ...userInfo } = user;
      
      res.json(userInfo);
    } catch (error) {
      next(error);
    }
  });
  
  // HTTP server creation
  const httpServer = createServer(app);
  
  // Setup general WebSocket server
  const wss = setupSocketServer(httpServer);
  
  // Setup WebRTC signaling server
  const rtcWss = setupWebRTCSignaling(httpServer);
  
  // Debug log to confirm setup
  console.log('WebSocket servers initialized: general (/ws) and WebRTC signaling (/rtc)');

  // Match endpoints
  app.get("/api/matches", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matches = await storage.getMatchesByUserId(userId);
      
      // Get all matched users
      const matchedUserIds = matches.map(match => 
        match.userId1 === userId ? match.userId2 : match.userId1
      );
      
      const matchedUsers = await Promise.all(
        matchedUserIds.map(id => storage.getUser(id))
      );
      
      const matchData = matches.map((match, index) => {
        const otherUser = matchedUsers[index];
        
        return {
          ...match,
          otherUser: otherUser ? {
            id: otherUser.id,
            username: otherUser.username,
            name: otherUser.name,
            location: otherUser.location,
            photoUrl: match.arePhotosRevealed ? otherUser.photoUrl : null,
            avatar: otherUser.avatar || null,
            // Include other non-sensitive properties
            bio: otherUser.bio,
            communicationStyle: otherUser.communicationStyle,
            age: otherUser.age
          } : null
        };
      });
      
      res.json(matchData);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/matches/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.id, 10);
      
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Verify that the requesting user is part of the match
      if (match.userId1 !== userId && match.userId2 !== userId) {
        return res.status(403).json({ message: "Not authorized to view this match" });
      }
      
      const otherUserId = match.userId1 === userId ? match.userId2 : match.userId1;
      const otherUser = await storage.getUser(otherUserId);
      
      if (!otherUser) {
        return res.status(404).json({ message: "Matched user not found" });
      }
      
      res.json({
        ...match,
        otherUser: {
          id: otherUser.id,
          username: otherUser.username,
          name: otherUser.name,
          location: otherUser.location,
          photoUrl: match.arePhotosRevealed ? otherUser.photoUrl : null,
          avatar: otherUser.avatar || null,
          bio: otherUser.bio,
          communicationStyle: otherUser.communicationStyle,
          age: otherUser.age
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Call endpoints
  
  // Create a new call
  app.post("/api/calls", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { matchId, initiatorId, receiverId, callDay } = req.body;
      
      // Verify that the requesting user is the initiator
      if (initiatorId !== req.user.id) {
        return res.status(403).json({ message: "Only the initiator can create a call" });
      }
      
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Verify that the users in the request are actually part of the match
      const isPartOfMatch = 
        (match.userId1 === initiatorId && match.userId2 === receiverId) ||
        (match.userId1 === receiverId && match.userId2 === initiatorId);
        
      if (!isPartOfMatch) {
        return res.status(403).json({ message: "Users are not part of this match" });
      }
      
      // Create the call record
      // Create call without explicit startTime (it will be set by default)
      const callData = await storage.createCallLog({
        matchId,
        initiatorId,
        receiverId,
        callDay,
        status: 'pending'
      });
      
      res.status(201).json(callData);
    } catch (error) {
      next(error);
    }
  });
  
  // Get active call for a match
  app.get("/api/calls/match/:matchId/active", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const matchId = parseInt(req.params.matchId, 10);
      const callLogs = await storage.getCallLogsByMatchId(matchId);
      
      if (!callLogs || callLogs.length === 0) {
        return res.status(404).json({ message: "No calls found for this match" });
      }
      
      // Find the active or pending call
      const activeCall = callLogs.find(call => 
        call.status === 'pending' || call.status === 'active' || call.status === 'connecting'
      );
      
      if (!activeCall) {
        return res.status(404).json({ message: "No active call found for this match" });
      }
      
      res.status(200).json(activeCall);
    } catch (error) {
      next(error);
    }
  });
  
  // Get a specific call
  app.get("/api/calls/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const callId = parseInt(req.params.id, 10);
      const callLogs = await storage.getCallLogsByMatchId(callId);
      
      if (!callLogs || callLogs.length === 0) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      // Find the specific call
      const call = callLogs.find(log => log.id === callId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      // Verify that the requesting user is part of the call
      if (call.initiatorId !== req.user.id && call.receiverId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this call" });
      }
      
      res.json(call);
    } catch (error) {
      next(error);
    }
  });
  
  // Update a call's status
  app.patch("/api/calls/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const callId = parseInt(req.params.id, 10);
      const { status, endTime, duration } = req.body;
      
      const callLogs = await storage.getCallLogsByMatchId(callId);
      if (!callLogs || callLogs.length === 0) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      // Find the specific call
      const call = callLogs.find(log => log.id === callId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      // Verify that the requesting user is part of the call
      if (call.initiatorId !== req.user.id && call.receiverId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this call" });
      }
      
      // Update the call
      const updatedCall = await storage.updateCallLog(callId, {
        status,
        endTime: endTime ? new Date(endTime) : undefined,
        duration
      });
      
      // If the call is completed, also update the match
      if (status === 'completed' && call.matchId) {
        const match = await storage.getMatchById(call.matchId);
        if (match) {
          const updates: any = { 
            callCount: match.callCount + 1,
            lastCallDate: new Date(),
            callScheduled: false
          };
          
          // Unlock chat after 2 calls
          if (call.callDay >= 2 && !match.isChatUnlocked) {
            updates.isChatUnlocked = true;
          }
          
          // Reveal photos after 3 calls
          if (call.callDay >= 3 && !match.arePhotosRevealed) {
            updates.arePhotosRevealed = true;
          }
          
          await storage.updateMatch(match.id, updates);
        }
      }
      
      res.json(updatedCall);
    } catch (error) {
      next(error);
    }
  });
  
  // Legacy endpoint - redirect to new API
  app.post("/api/matches/:id/calls", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.id, 10);
      
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Verify that the requesting user is part of the match
      if (match.userId1 !== userId && match.userId2 !== userId) {
        return res.status(403).json({ message: "Not authorized to initiate calls in this match" });
      }
      
      // Determine call day based on previous calls
      const callLogs = await storage.getCallLogsByMatchId(matchId);
      const callDay = callLogs.length + 1;
      
      // Get the other user's information
      const otherUserId = match.userId1 === userId ? match.userId2 : match.userId1;
      
      // Create new call log
      const callLog = await storage.createCallLog({
        matchId,
        callDay,
        initiatorId: userId,
        receiverId: otherUserId,
        status: 'pending'
      });
      
      // Update match with call scheduled flag - this helps prevent duplicate calls
      await storage.updateMatch(matchId, {
        callScheduled: true,
        scheduledCallTime: new Date()
      });
      
      // Fetch the other user's details
      const otherUser = await storage.getUser(otherUserId);
      
      // Return the call log and the other user's information
      res.status(201).json({
        ...callLog,
        otherUser: otherUser ? {
          id: otherUser.id,
          username: otherUser.username,
          name: otherUser.name,
          avatar: otherUser.avatar
        } : null
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/calls/:id/end", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const callId = parseInt(req.params.id, 10);
      const callLog = await storage.updateCallLog(callId, {
        endTime: new Date(),
        duration: req.body.duration || 0
      });
      
      if (!callLog) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      // Update match with call count and unlock features based on call day
      const match = await storage.getMatchById(callLog.matchId);
      if (match) {
        const updates: any = { 
          callCount: match.callCount + 1,
          lastCallDate: new Date(),
          callScheduled: false
        };
        
        // Unlock chat after 2 calls
        if (callLog.callDay >= 2 && !match.isChatUnlocked) {
          updates.isChatUnlocked = true;
        }
        
        // Reveal photos after 3 calls
        if (callLog.callDay >= 3 && !match.arePhotosRevealed) {
          updates.arePhotosRevealed = true;
        }
        
        await storage.updateMatch(match.id, updates);
      }
      
      res.json(callLog);
    } catch (error) {
      next(error);
    }
  });
  
  // Message endpoints
  app.get("/api/matches/:id/messages", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.id, 10);
      
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Verify that the requesting user is part of the match
      if (match.userId1 !== userId && match.userId2 !== userId) {
        return res.status(403).json({ message: "Not authorized to view these messages" });
      }
      
      // Check if chat is unlocked for this match
      if (!match.isChatUnlocked) {
        return res.status(403).json({ message: "Chat not yet unlocked for this match" });
      }
      
      const messages = await storage.getMessagesByMatchId(matchId);
      
      // Mark all messages as read
      await storage.markMessagesAsRead(matchId, userId);
      
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/matches/:id/messages", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.id, 10);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Verify that the requesting user is part of the match
      if (match.userId1 !== userId && match.userId2 !== userId) {
        return res.status(403).json({ message: "Not authorized to send messages in this match" });
      }
      
      // Check if chat is unlocked for this match
      if (!match.isChatUnlocked) {
        return res.status(403).json({ message: "Chat not yet unlocked for this match" });
      }
      
      const message = await storage.createMessage({
        matchId,
        senderId: userId,
        content
      });
      
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  });
  
  return httpServer;
}