import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { MatchingAlgorithm } from "./matching-algorithm";

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
  
  // WebSocket server for audio calls
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Match endpoints
  app.post("/api/generate-matches", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all users except current user
      // In a production app, you would implement pagination and filtering
      const allUsers = [];
      let currentId = 1;
      let potentialUser = null;
      
      // Simple approach to get all users
      while ((potentialUser = await storage.getUser(currentId))) {
        if (potentialUser.id !== userId) {
          allUsers.push(potentialUser);
        }
        currentId++;
      }
      
      // Use matching algorithm to find compatible users
      const algorithm = new MatchingAlgorithm();
      const matchResults = algorithm.findMatches(user, allUsers);
      
      // Get the top matches (limit to 10 for example)
      const topMatches = matchResults
        .filter(match => match.matchScore >= 50) // Only consider 50%+ compatible
        .slice(0, 10);
      
      // Create matches in database for each top match
      const createdMatches = await Promise.all(
        topMatches.map(match => 
          storage.createMatch({
            userId1: userId,
            userId2: match.id,
            compatibility: match.matchScore,
            callScheduled: false
          })
        )
      );
      
      res.status(201).json({
        matchesCreated: createdMatches.length,
        matches: createdMatches
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/matches", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matches = await storage.getMatchesByUserId(userId);
      
      // Get all matched users
      const matchedUserIds = matches.flatMap(match => [
        match.userId1 === userId ? match.userId2 : match.userId1
      ]);
      
      const matchedUsers = await Promise.all(
        matchedUserIds.map(id => storage.getUser(id))
      );
      
      const matchData = matches.map((match, index) => {
        const otherUserId = match.userId1 === userId ? match.userId2 : match.userId1;
        const otherUser = matchedUsers[index];
        
        return {
          ...match,
          otherUser: otherUser ? {
            id: otherUser.id,
            name: otherUser.name,
            location: otherUser.location,
            photoUrl: match.arePhotosRevealed ? otherUser.photoUrl : null,
            // Include other non-sensitive properties as needed
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
          name: otherUser.name,
          location: otherUser.location,
          photoUrl: match.arePhotosRevealed ? otherUser.photoUrl : null,
          // Include other non-sensitive information as needed
        }
      });
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
      
      // TODO: Notify other user via WebSocket if implemented
    } catch (error) {
      next(error);
    }
  });
  
  // Call endpoints
  app.post("/api/matches/:id/schedule", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.id, 10);
      const { date, time } = req.body;
      
      if (!date || !time) {
        return res.status(400).json({ message: "Date and time are required" });
      }
      
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Verify that the requesting user is part of the match
      if (match.userId1 !== userId && match.userId2 !== userId) {
        return res.status(403).json({ message: "Not authorized to schedule calls in this match" });
      }
      
      // Format the scheduled time
      const scheduledTime = new Date(`${date}T${time}`);
      
      // Update match with scheduled call information
      const updatedMatch = await storage.updateMatch(matchId, {
        callScheduled: true,
        scheduledCallTime: scheduledTime
      });
      
      res.json(updatedMatch);
    } catch (error) {
      next(error);
    }
  });
  
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
      
      // Create new call log
      const callLog = await storage.createCallLog({
        matchId,
        callDay
      });
      
      // Update match with call scheduled flag
      await storage.updateMatch(matchId, {
        callScheduled: true,
        scheduledCallTime: new Date()
      });
      
      res.status(201).json(callLog);
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
  
  // Note endpoints
  app.get("/api/matches/:id/notes", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.id, 10);
      
      const notes = await storage.getNotesByMatchId(matchId, userId);
      res.json(notes);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/matches/:id/notes", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.id, 10);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Note content is required" });
      }
      
      const note = await storage.createNote({
        userId,
        matchId,
        content
      });
      
      res.status(201).json(note);
    } catch (error) {
      next(error);
    }
  });
  
  // WebSocket connection for real-time features
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Handle different message types (call initiation, chat, etc.)
        // Implementation to be expanded based on real-time requirements
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  return httpServer;
}
