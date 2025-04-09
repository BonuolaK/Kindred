import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { setupGoogleAuth } from "./google-auth";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Session {
      needsOnboarding?: boolean;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.AUTH_SECRET || process.env.SESSION_SECRET || "kindred-secret-key-development";
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, name } = req.body;
      
      // Validate required fields
      if (!username || !password || !email || !name) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(password),
      });

      // Create at least one match for the new user
      try {
        // Import the matching algorithm
        const { MatchingAlgorithm } = require('./matching-algorithm');
        
        // Get all users except current user
        const allUsers = [];
        let currentId = 1;
        let potentialUser = null;
        
        // Simple approach to get all users
        while ((potentialUser = await storage.getUser(currentId))) {
          if (potentialUser.id !== user.id) {
            allUsers.push(potentialUser);
          }
          currentId++;
        }
        
        // Use matching algorithm to find compatible users
        const algorithm = new MatchingAlgorithm();
        const matchResults = algorithm.findMatches(user, allUsers);
        
        // Get the top matches (limit to 3 for example)
        const topMatches = matchResults
          .filter((match: { matchScore: number }) => match.matchScore >= 40) // Lower threshold to ensure at least one match
          .slice(0, 3);
        
        // Create matches in database for each top match
        if (topMatches.length > 0) {
          await Promise.all(
            topMatches.map((match: { id: number, matchScore: number }) => 
              storage.createMatch({
                userId1: user.id,
                userId2: match.id,
                compatibility: match.matchScore,
                callScheduled: false
              })
            )
          );
          console.log(`Created ${topMatches.length} matches for new user ${user.username}`);
        } else {
          // If no matches found by algorithm, create at least one random match
          if (allUsers.length > 0) {
            // Find a user with compatible gender preferences if possible
            const compatibleUsers = allUsers.filter(candidate => {
              if (!user.interestedGenders || !candidate.interestedGenders) return true;
              
              // Check mutual gender interest
              const candidateInterestedInUser = candidate.interestedGenders.includes(user.gender || "");
              const userInterestedInCandidate = user.interestedGenders.includes(candidate.gender || "");
              
              return candidateInterestedInUser && userInterestedInCandidate;
            });
            
            const matchUser = compatibleUsers.length > 0 
              ? compatibleUsers[Math.floor(Math.random() * compatibleUsers.length)]
              : allUsers[Math.floor(Math.random() * allUsers.length)];
            
            const randomCompatibility = 70 + Math.floor(Math.random() * 20); // 70-90%
            
            await storage.createMatch({
              userId1: user.id,
              userId2: matchUser.id,
              compatibility: randomCompatibility,
              callScheduled: false
            });
            
            console.log(`Created a random match for new user ${user.username} with ${matchUser.username}`);
          }
        }
      } catch (error) {
        console.error("Error creating initial matches for new user:", error);
        // Continue with login even if match creation fails
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Check if the user needs onboarding and include that in the response
    const needsOnboarding = req.session?.needsOnboarding === true;
    
    res.json({
      ...req.user,
      needsOnboarding
    });
  });
  
  // Update profile endpoint
  app.put("/api/profile", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const updatedUser = await storage.updateUser(userId, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If this was an onboarding completion, clear the onboarding flag
      if (req.session?.needsOnboarding) {
        req.session.needsOnboarding = false;
      }
      
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });
  
  // Set up Google Authentication
  setupGoogleAuth(app);
}
