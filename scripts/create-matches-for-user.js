// Script to manually create matches for bonu.kenny_741 (ID: 23)
import { db } from '../server/db.js';
import { users, matches } from '../shared/schema.js';
import { eq, and, or, ne } from 'drizzle-orm';
import { MatchingAlgorithm } from '../server/matching-algorithm.js';

async function createMatchesForUser() {
  try {
    // User ID for bonu.kenny_741
    const userId = 23;
    
    // Get user info
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      console.error(`User with ID ${userId} not found`);
      process.exit(1);
    }
    
    console.log(`Creating matches for user: ${user.username} (ID: ${userId})`);
    
    // Get existing matches to avoid duplicates
    const existingMatches = await db.select().from(matches).where(
      or(
        eq(matches.user_id_1, userId),
        eq(matches.user_id_2, userId)
      )
    );
    
    // Get IDs of users that are already matched
    const existingMatchedUserIds = existingMatches.map(match => 
      match.user_id_1 === userId ? match.user_id_2 : match.user_id_1
    );
    
    console.log(`User has ${existingMatches.length} existing matches`);
    
    // Get any unmatched users
    const unmatchedMatches = await db.select().from(matches).where(
      and(
        eq(matches.unmatched_by, userId),
        eq(matches.status, 'unmatched')
      )
    );
    
    // Get IDs of users that have been unmatched
    const unmatchedUserIds = unmatchedMatches.map(match => 
      match.user_id_1 === userId ? match.user_id_2 : match.user_id_1
    );
    
    console.log(`User has unmatched ${unmatchedUserIds.length} users`);
    
    // Get all excluded user IDs (existing matches, unmatched, and self)
    const excludedUserIds = [...new Set([...existingMatchedUserIds, ...unmatchedUserIds, userId])];
    
    // Find female users who are interested in men and not already matched/unmatched
    const potentialMatches = await db.select().from(users).where(
      and(
        ...excludedUserIds.map(id => ne(users.id, id)),
        or(
          eq(users.gender, 'Woman'),
          eq(users.gender, 'woman'),
          eq(users.gender, 'Female'),
          eq(users.gender, 'female')
        )
      )
    );
    
    console.log(`Found ${potentialMatches.length} potential female matches`);
    
    // Filter to only those interested in men
    const compatibleMatches = potentialMatches.filter(candidate => {
      if (!candidate.interested_genders) return false;
      
      const interests = candidate.interested_genders.map(g => g.toLowerCase());
      return interests.some(interest => 
        interest === 'man' || interest === 'men' || interest === 'male'
      );
    });
    
    console.log(`Found ${compatibleMatches.length} women who are interested in men`);
    
    if (compatibleMatches.length === 0) {
      console.log("No compatible matches found");
      process.exit(0);
    }
    
    // Create matches (up to 3 for basic plan)
    const maxMatches = user.profile_type === 'premium' ? 5 : 
                     user.profile_type === 'unlimited' ? 10 : 3; // Default to basic (3)
    
    const remainingMatches = maxMatches - existingMatches.length;
    
    if (remainingMatches <= 0) {
      console.log(`User has already reached their match limit of ${maxMatches}`);
      process.exit(0);
    }
    
    console.log(`Creating up to ${remainingMatches} new matches`);
    
    // Use matching algorithm to find compatible users
    const algorithm = new MatchingAlgorithm();
    const matchResults = algorithm.findMatches(user, compatibleMatches);
    
    // Take top X matches based on remaining quota
    const newMatches = matchResults.slice(0, remainingMatches);
    
    // Create the matches in the database
    for (const match of newMatches) {
      const insertedMatch = await db.insert(matches).values({
        user_id_1: userId,
        user_id_2: match.id,
        compatibility: match.matchScore,
        match_date: new Date(),
        call_count: 0,
        call_scheduled: false,
        is_chat_unlocked: false,
        are_photos_revealed: false,
        status: 'active'
      }).returning();
      
      console.log(`Created match with ${match.username} (${match.matchScore}% compatibility)`);
    }
    
    console.log(`Successfully created ${newMatches.length} matches for ${user.username}`);
    
  } catch (error) {
    console.error('Error creating matches:', error);
  } finally {
    console.log('Done');
    process.exit(0);
  }
}

createMatchesForUser();