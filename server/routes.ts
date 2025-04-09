import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { MatchingAlgorithm, canReceiveNewMatch } from "./matching-algorithm";

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
  
  // Subscription endpoint
  app.post("/api/subscription", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const { profileType } = req.body;
      
      if (!profileType || !['basic', 'premium', 'elite'].includes(profileType)) {
        return res.status(400).json({ message: "Invalid subscription type. Must be one of: basic, premium, elite" });
      }
      
      // Get the current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // In a real app, you would process payment here based on the subscription type
      
      // Update the user's profile type
      const updatedUser = await storage.updateUser(userId, { profileType });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update subscription" });
      }
      
      res.json({
        message: `Subscription updated to ${profileType}`,
        user: updatedUser
      });
    } catch (error) {
      next(error);
    }
  });

  // HTTP server creation
  const httpServer = createServer(app);
  
  // WebSocket server for audio calls
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Connected users map: userId -> WebSocket connection
  const connectedUsers = new Map<number, WebSocket>();
  
  // WebSocket connection handler
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    // Handle incoming messages
    ws.addEventListener('message', (event) => {
      try {
        const message = event.data.toString();
        const data = JSON.parse(message);
        console.log('WebSocket message received:', data.type);
        
        // Handle different message types
        switch (data.type) {
          case 'register':
            // Register user with their ID
            if (data.userId) {
              connectedUsers.set(data.userId, ws);
              console.log(`User ${data.userId} registered`);
            }
            break;
            
          case 'call-initiate':
          case 'call-accept':
          case 'call-reject':
          case 'call-end':
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            // Forward signaling messages to the target user
            if (data.toUserId && connectedUsers.has(data.toUserId)) {
              const targetWs = connectedUsers.get(data.toUserId);
              if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(message);
              }
            }
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.addEventListener('close', () => {
      console.log('WebSocket client disconnected');
      // Remove user from connected users map
      const userEntries = Array.from(connectedUsers.entries());
      for (const [userId, userWs] of userEntries) {
        if (userWs === ws) {
          connectedUsers.delete(userId);
          console.log(`User ${userId} unregistered`);
          break;
        }
      }
    });
  });
  
  // Match endpoints
  app.post("/api/generate-matches", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user already has matches
      const existingMatches = await storage.getMatchesByUserId(userId);
      
      // Check if user can receive new matches based on their profile type
      const canReceiveMore = canReceiveNewMatch(user, existingMatches.length);
      if (!canReceiveMore) {
        return res.status(403).json({
          message: `You've reached the maximum number of matches for your ${user.profileType} account. Upgrade to receive more matches.`,
          matchesCreated: 0,
          matches: existingMatches
        });
      }
      
      // Get all users except current user
      // In a production app, you would implement pagination and filtering
      const allUsers = [];
      let currentId = 1;
      let potentialUser: any = null;
      
      // Simple approach to get all users
      while ((potentialUser = await storage.getUser(currentId))) {
        if (potentialUser.id !== userId) {
          // Skip users that are already matched
          const isAlreadyMatched = existingMatches.some(
            match => match.userId1 === potentialUser.id || match.userId2 === potentialUser.id
          );
          
          if (!isAlreadyMatched) {
            allUsers.push(potentialUser);
          }
        }
        currentId++;
      }
      
      if (allUsers.length === 0 && existingMatches.length === 0) {
        return res.status(404).json({ 
          message: "No potential matches found and no existing matches",
          matchesCreated: 0,
          matches: []
        });
      }
      
      // Use matching algorithm to find compatible users
      const algorithm = new MatchingAlgorithm();
      const matchResults = algorithm.findMatches(user, allUsers);
      
      // Get the top matches (limit to 10 for example)
      const topMatches = matchResults
        .filter(match => match.matchScore >= 40) // Lower threshold to 40% to find more matches
        .slice(0, 10);
      
      // Create matches in database for each top match
      let createdMatches = [];
      
      if (topMatches.length > 0) {
        createdMatches = await Promise.all(
          topMatches.map(match => 
            storage.createMatch({
              userId1: userId,
              userId2: match.id,
              compatibility: match.matchScore,
              callScheduled: false
            })
          )
        );
      } else if (existingMatches.length === 0 && allUsers.length > 0) {
        // If no algorithmic matches and user has no existing matches, create at least one random match
        const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
        const randomCompatibility = 70 + Math.floor(Math.random() * 20); // 70-90%
        
        const randomMatch = await storage.createMatch({
          userId1: userId,
          userId2: randomUser.id,
          compatibility: randomCompatibility,
          callScheduled: false
        });
        
        createdMatches = [randomMatch];
      }
      
      // Combine existing and new matches for response
      const allUserMatches = await storage.getMatchesByUserId(userId);
      
      // Get matched users for display
      const matchedUserIds = allUserMatches.map(match => 
        match.userId1 === userId ? match.userId2 : match.userId1
      );
      
      const matchedUsers = await Promise.all(
        matchedUserIds.map(id => storage.getUser(id))
      );
      
      // Combine match data with user info
      const fullMatchData = allUserMatches.map((match, index) => {
        return {
          ...match,
          otherUser: matchedUsers[index] ? {
            id: matchedUsers[index].id,
            name: matchedUsers[index].name,
            location: matchedUsers[index].location,
            photoUrl: match.arePhotosRevealed ? matchedUsers[index].photoUrl : null,
          } : null
        };
      });
      
      res.status(201).json({
        matchesCreated: createdMatches.length,
        matches: fullMatchData
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
            username: otherUser.username,
            name: otherUser.name,
            location: otherUser.location,
            photoUrl: match.arePhotosRevealed ? otherUser.photoUrl : null,
            avatar: otherUser.avatar || null,
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
          username: otherUser.username,
          name: otherUser.name,
          location: otherUser.location,
          photoUrl: match.arePhotosRevealed ? otherUser.photoUrl : null,
          avatar: otherUser.avatar || null,
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
      
      // Update match with call scheduled flag - this helps prevent duplicate calls
      await storage.updateMatch(matchId, {
        callScheduled: true,
        scheduledCallTime: new Date()
      });
      
      // Get the other user's information
      const otherUserId = match.userId1 === userId ? match.userId2 : match.userId1;
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
