import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { MatchingAlgorithm, canReceiveNewMatch, getMaxMatchesAllowed } from "./matching-algorithm";
import { setupSocketServer } from "./socket";
import { setupWebRTCSignaling } from "./webrtc-signaling";
import { setupBasicWebSocketServer } from "./basic-ws";
import { WebSocketManager } from "./websocket-manager";
import { setupCallSignalingServer } from "./call-signaling";
import { db } from "./db";
import { matches } from "@shared/schema";
import { and, eq } from "drizzle-orm";

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
  
  // Always use the unified WebSocketManager to avoid upgrade conflicts
  console.log('Using unified WebSocket manager for all platforms');
  const wsManager = new WebSocketManager(httpServer);
  
  // Set up call signaling server
  // const callSignalingWss = setupCallSignalingServer(httpServer);
  
  // No longer using separate WebSocket servers to avoid conflicts

  // Match endpoints
  
  // Generate matches for a user
  app.post("/api/generate-matches", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all users except current user - improved version with better logging
      const allUsers = [];
      const userProfiles = [];
      
      // Debug: Log all user IDs in the system
      console.log("Attempting to find all users in the system:");
      
      // Get any unmatched users - we'll use this to exclude them from potential matches
      const unmatchedMatches = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.unmatchedBy, userId),
            eq(matches.status, 'unmatched')
          )
        );
      
      // Extract user IDs that have been unmatched by the current user
      const unmatchedUserIds = unmatchedMatches.map(match => 
        match.userId1 === userId ? match.userId2 : match.userId1
      );
      
      console.log(`User ${userId} has unmatched ${unmatchedUserIds.length} users`);
      
      // Try to get users in a range rather than just incrementing IDs
      // This handles cases where user IDs might have gaps
      for (let currentId = 1; currentId < 100; currentId++) {
        try {
          const potentialUser = await storage.getUser(currentId);
          if (potentialUser) {
            console.log(`Found user ID ${currentId}: ${potentialUser.username} (${potentialUser.gender || 'No gender'}, interested in: ${potentialUser.interestedGenders ? JSON.stringify(potentialUser.interestedGenders) : 'Not specified'})`);
            
            // Only add if it's not the current user and not previously unmatched
            if (potentialUser.id !== userId && !unmatchedUserIds.includes(potentialUser.id)) {
              allUsers.push(potentialUser);
              
              // Keep a copy of user info for debugging
              const { password, ...userInfo } = potentialUser;
              userProfiles.push(userInfo);
            } else if (unmatchedUserIds.includes(potentialUser.id)) {
              console.log(`Skipping user ${potentialUser.username} (ID: ${potentialUser.id}) because they were previously unmatched`);
            }
          }
        } catch (error) {
          // Ignore errors from non-existent users
        }
      }
      
      // Alternative approach: Get users from specific IDs that we know should exist
      console.log("Specifically looking for users Tester and BonuolaK:");
      
      // Try to get Tester (expected ID around 1-5)
      for (let id = 1; id <= 5; id++) {
        try {
          const tester = await storage.getUserByUsername("Tester");
          if (tester) {
            console.log(`Found Tester with ID ${tester.id}, gender: ${tester.gender || 'Not set'}, interests: ${tester.interestedGenders ? JSON.stringify(tester.interestedGenders) : 'Not set'}`);
            
            // Make sure this user isn't already in our list
            if (tester.id !== userId && !allUsers.some(u => u.id === tester.id)) {
              allUsers.push(tester);
              const { password, ...userInfo } = tester;
              userProfiles.push(userInfo);
            }
            break;
          }
        } catch (error) {
          // Ignore errors
        }
      }
      
      // Try to get BonuolaK
      try {
        const bonuolak = await storage.getUserByUsername("BonuolaK");
        if (bonuolak) {
          console.log(`Found BonuolaK with ID ${bonuolak.id}, gender: ${bonuolak.gender || 'Not set'}, interests: ${bonuolak.interestedGenders ? JSON.stringify(bonuolak.interestedGenders) : 'Not set'}`);
          
          // Make sure this user isn't already in our list
          if (bonuolak.id !== userId && !allUsers.some(u => u.id === bonuolak.id)) {
            allUsers.push(bonuolak);
            const { password, ...userInfo } = bonuolak;
            userProfiles.push(userInfo);
          }
        }
      } catch (error) {
        // Ignore errors
      }
      
      console.log(`Found ${allUsers.length} potential matches for user ${userId}`);
      
      // Use matching algorithm to find compatible users
      const algorithm = new MatchingAlgorithm();
      const matchResults = algorithm.findMatches(user, allUsers);
      
      // Debug logs - inspect top potential matches and their scores
      console.log(`Match results for ${user.username}:`);
      matchResults.slice(0, 5).forEach((match) => {
        console.log(`- ${match.username}: ${match.matchScore}% compatible`);
        console.log(`  Gender: ${match.gender}, User's interest: ${user.interestedGenders}`);
        console.log(`  User's gender: ${user.gender}, Match's interest: ${match.interestedGenders}`);
        
        // Check components
        console.log(`  Personality: ${match.compatibilityBreakdown.personality}%`);
        console.log(`  Location: ${match.compatibilityBreakdown.location}%`);
        console.log(`  Age: ${match.compatibilityBreakdown.age}%`);
        
        // Check personality factors
        console.log(`  Communication Style - User: ${user.communicationStyle}, Match: ${match.communicationStyle}`);
        console.log(`  Values - User: ${user.values}, Match: ${match.values}`);
      });
      
      // Get existing matches to avoid duplicates
      const existingMatches = await storage.getMatchesByUserId(userId);
      const existingMatchUserIds = existingMatches.map(match => 
        match.userId1 === userId ? match.userId2 : match.userId1
      );
      
      // Get the maximum number of matches allowed for this user's subscription tier
      const maxMatches = getMaxMatchesAllowed(user);
      const remainingMatchSlots = maxMatches - existingMatches.length;
      console.log(`User ${user.username} has ${existingMatches.length} existing matches, allowed ${maxMatches} total (${remainingMatchSlots} remaining)`);
      
      // Skip if user has reached their match limit
      if (remainingMatchSlots <= 0) {
        console.log(`User ${user.username} has reached their match limit of ${maxMatches}. No new matches will be created.`);
        res.status(200).json({ 
          matchResults: matchResults.slice(0, 5),
          message: "Match limit reached for your subscription tier. Upgrade to receive more matches."
        });
        return;
      }
      
      // Get top matches that aren't already matched
      const topMatches = matchResults
        .filter(match => !existingMatchUserIds.includes(match.id))
        .filter(match => match.matchScore >= 40) // Lower threshold to ensure matches
        .slice(0, remainingMatchSlots); // Only create up to the remaining match slots
      
      // Create new matches
      const newMatches = [];
      if (topMatches.length > 0) {
        for (const match of topMatches) {
          const newMatch = await storage.createMatch({
            userId1: userId,
            userId2: match.id,
            compatibility: match.matchScore,
            callScheduled: false
          });
          newMatches.push(newMatch);
        }
        console.log(`Created ${newMatches.length} new matches for user ${user.username} (${existingMatches.length + newMatches.length}/${maxMatches} total)`);
      } else if (allUsers.length > 0 && existingMatches.length === 0) {
        // If no matches found by algorithm and user has no matches, create a single random match
        const compatibleUsers = allUsers.filter(candidate => {
          if (!user.interestedGenders || !candidate.interestedGenders) return true;
          
          // Check mutual gender interest
          const candidateInterestedInUser = candidate.interestedGenders.includes(user.gender || "");
          const userInterestedInCandidate = user.interestedGenders.includes(candidate.gender || "");
          
          return candidateInterestedInUser && userInterestedInCandidate;
        });
        
        if (compatibleUsers.length > 0) {
          const matchUser = compatibleUsers[Math.floor(Math.random() * compatibleUsers.length)];
          const randomCompatibility = 70 + Math.floor(Math.random() * 20); // 70-90%
          
          const newMatch = await storage.createMatch({
            userId1: userId,
            userId2: matchUser.id,
            compatibility: randomCompatibility,
            callScheduled: false
          });
          
          newMatches.push(newMatch);
          console.log(`Created a random match for user ${user.username} with ${matchUser.username}`);
        }
      }
      
      res.json({
        matchResults: matchResults.slice(0, 10),
        newMatches,
        userProfiles, // For debugging
        currentUser: {
          id: user.id,
          username: user.username,
          gender: user.gender,
          interestedGenders: user.interestedGenders
        }
      });
    } catch (error) {
      next(error);
    }
  });
  

  
  // Debug endpoint to directly test matching algorithm
  app.get("/api/debug/direct-match-test", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Import the direct match test
      const { testDirectMatch } = require('./direct-match-test');
      
      // Run the test
      await testDirectMatch();
      
      res.json({ message: "Direct match test complete. Check server logs for results." });
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
  
  // Unmatch with a user
  app.post("/api/matches/:id/unmatch", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.id, 10);
      
      // Get current user to check profile type
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only Premium and Elite users can unmatch
      if (user.profileType === 'basic') {
        return res.status(403).json({ 
          message: "Only Premium and Elite members can unmatch. Please upgrade your account.",
          requiresUpgrade: true
        });
      }
      
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Verify that the requesting user is part of the match
      if (match.userId1 !== userId && match.userId2 !== userId) {
        return res.status(403).json({ message: "Not authorized to unmatch this connection" });
      }
      
      // Delete the match by updating its status
      await storage.updateMatch(matchId, { 
        status: 'unmatched',
        unmatchedBy: userId,
        unmatchedDate: new Date()
      });
      
      res.json({ message: "Successfully unmatched", matchId });
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
      
      // Get call directly by ID using our new method
      const call = await storage.getCallLogById(callId);
      
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
  
  // Complete a call for a specific match (for rtctest implementation)
  app.patch("/api/calls/match/:matchId/complete", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const matchId = parseInt(req.params.matchId, 10);
      const { status } = req.body;
      const userId = req.user.id;
      
      // Get the most recent call for this match
      const callLogs = await storage.getCallLogsByMatchId(matchId);
      
      if (!callLogs || callLogs.length === 0) {
        return res.status(404).json({ message: "No calls found for this match" });
      }
      
      // Find the active call (sort by startTime in descending order and take the first one)
      const activeCalls = callLogs
        .filter(call => call.status === 'pending' || call.status === 'active' || call.status === 'connecting')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      if (activeCalls.length === 0) {
        return res.status(404).json({ message: "No active call found for this match" });
      }
      
      const activeCall = activeCalls[0];
      
      // Verify that the requesting user is part of the call
      if (activeCall.initiatorId !== userId && activeCall.receiverId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this call" });
      }
      
      // Update the call
      const updatedCall = await storage.updateCallLog(activeCall.id, {
        status: status || 'completed',
        endTime: new Date(),
        duration: Math.floor((Date.now() - new Date(activeCall.startTime).getTime()) / 1000) // Duration in seconds
      });
      
      // If the call is completed, also update the match
      if ((status === 'completed' || !status) && activeCall.matchId) {
        const match = await storage.getMatchById(activeCall.matchId);
        if (match) {
          const updates: any = { 
            callCount: match.callCount + 1,
            lastCallDate: new Date(),
            callScheduled: false
          };
          
          // Unlock chat after 2 calls
          if (activeCall.callDay >= 2 && !match.isChatUnlocked) {
            updates.isChatUnlocked = true;
          }
          
          // Reveal photos after 3 calls
          if (activeCall.callDay >= 3 && !match.arePhotosRevealed) {
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
  
  // Update a call's status
  app.patch("/api/calls/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const callId = parseInt(req.params.id, 10);
      const { status, endTime, duration } = req.body;
      
      // Get call directly by ID
      const call = await storage.getCallLogById(callId);
      
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