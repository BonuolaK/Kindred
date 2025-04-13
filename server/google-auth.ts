import { Express, Request } from "express";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

// Add needsOnboarding to Session type
declare module "express-session" {
  interface Session {
    needsOnboarding?: boolean;
  }
}

const scryptAsync = promisify(scrypt);

export class GoogleAuthStrategy {
  constructor(
    private options: {
      clientID: string;
      clientSecret: string;
      callbackURL: string;
    },
    private callback: (
      req: Request,
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: any) => void
    ) => void
  ) {}

  async authenticate(req: Request, options: any = {}) {
    const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.options.clientID}` +
      `&redirect_uri=${encodeURIComponent(this.options.callbackURL)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('profile email')}` +
      `&access_type=offline` +
      `&prompt=consent`;

    if (req.query.code) {
      try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: req.query.code as string,
            client_id: this.options.clientID,
            client_secret: this.options.clientSecret,
            redirect_uri: this.options.callbackURL,
            grant_type: 'authorization_code'
          })
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          throw new Error(`Failed to get tokens: ${error}`);
        }

        const tokens = await tokenResponse.json();
        
        // Get user profile
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        });

        if (!profileResponse.ok) {
          const error = await profileResponse.text();
          throw new Error(`Failed to get profile: ${error}`);
        }

        const profile = await profileResponse.json();

        // Call the verify callback
        this.callback(req, tokens.access_token, tokens.refresh_token, profile, 
          (error, user) => {
            if (error) {
              return req.res?.redirect('/auth?error=Authentication failed');
            }
            if (!user) {
              return req.res?.redirect('/auth?error=Could not create or find user');
            }
            
            // Login the user
            req.login(user, (err) => {
              if (err) {
                return req.res?.redirect('/auth?error=Login failed');
              }
              req.res?.redirect('/');
            });
          }
        );
      } catch (error) {
        console.error('Google authentication error:', error);
        req.res?.redirect('/auth?error=Authentication failed');
      }
    } else {
      // Start the authentication flow
      req.res?.redirect(redirectUrl);
    }
  }
}

export function setupGoogleAuth(app: Express) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!googleClientId || !googleClientSecret) {
    console.warn('Google OAuth is not configured. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required.');
    return;
  }

  // Use the current hostname from the request
  const currentHost = process.env.REPLIT_DOMAINS ? 
    process.env.REPLIT_DOMAINS.split(',')[0] :
    (process.env.NODE_ENV === 'production' ? 'kindred-dating.replit.app' : 'localhost:5000');
  
  // Determine protocol based on environment
  const protocol = process.env.NODE_ENV === 'production' || currentHost.includes('replit') ? 'https' : 'http';
  
  // Construct the full callback URL
  const callbackUrl = `${protocol}://${currentHost}/api/auth/google/callback`;

  // Create the Google authentication strategy
  const googleStrategy = new GoogleAuthStrategy(
    {
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: callbackUrl,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if we already have a user with this Google ID
        let user = await storage.getUserByEmail(profile.email);
        
        if (!user) {
          // Create a new user with Google profile data
          const newUser = {
            username: profile.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000),
            name: profile.name || (profile.given_name + ' ' + profile.family_name),
            email: profile.email,
            password: await generateRandomPassword(), // Generate a random password
            profileType: 'basic',
            bio: '',
            avatar: '👤',
            photoUrl: profile.picture || '',
            location: '',
            age: 25, // Default age, will be updated in onboarding
            gender: '',
            interestedGenders: [],
          };
          
          user = await storage.createUser(newUser);
          
          // Set a session flag to indicate this is a new user and needs onboarding
          if (req.session) {
            req.session.needsOnboarding = true;
          }
        }
        
        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  );

  // Set up the routes for Google authentication
  app.get('/api/auth/google', (req, res) => {
    googleStrategy.authenticate(req);
  });

  app.get('/api/auth/google/callback', (req, res) => {
    googleStrategy.authenticate(req);
  });
}

// Helper function to generate a random secure password
async function generateRandomPassword() {
  const password = randomBytes(16).toString('hex');
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}