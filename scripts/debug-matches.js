import { db } from '../server/db.js';
import { matches, users } from '../shared/schema.js';
import { eq, or, and, ne } from 'drizzle-orm';
import { MatchingAlgorithm } from '../server/matching-algorithm.js';

async function debugMatches() {
  try {
    // Get Tester99 user
    const [tester99] = await db.select()
      .from(users)
      .where(eq(users.username, 'Tester99'));
    
    if (!tester99) {
      console.log('Tester99 user not found');
      return;
    }
    
    console.log('Found Tester99:', tester99);
    
    // Get matches for Tester99
    const tester99Matches = await db.select()
      .from(matches)
      .where(
        or(
          eq(matches.userId1, tester99.id),
          eq(matches.userId2, tester99.id)
        )
      );
    
    console.log(`Found ${tester99Matches.length} matches for Tester99:`);
    console.log(JSON.stringify(tester99Matches, null, 2));
    
    // Check if we need to generate more matches for Tester99
    // Basic plan should have 3 matches
    const maxMatches = 3;
    const remainingMatches = maxMatches - tester99Matches.length;
    
    if (remainingMatches <= 0) {
      console.log('Tester99 already has their maximum number of matches.');
      return;
    }
    
    console.log(`Tester99 needs ${remainingMatches} more matches. Generating them now...`);
    
    // Get all users except Tester99 and those already matched
    const existingMatchUserIds = tester99Matches.map(match => 
      match.userId1 === tester99.id ? match.userId2 : match.userId1
    );
    
    const allUsers = await db.select()
      .from(users)
      .where(
        and(
          ne(users.id, tester99.id),
          // Only select users who aren't already matched
          ...existingMatchUserIds.map(id => ne(users.id, id))
        )
      );
    
    console.log(`Found ${allUsers.length} potential match candidates:`);
    allUsers.forEach(user => {
      console.log(`- ${user.username} (ID: ${user.id}, Gender: ${user.gender || 'Not set'}, Interested in: ${user.interestedGenders ? JSON.stringify(user.interestedGenders) : 'Not set'})`);
    });
    
    // Use matching algorithm to find compatible users
    const algorithm = new MatchingAlgorithm();
    let matchResults = algorithm.findMatches(tester99, allUsers);
    
    // Debug logs - inspect top potential matches and their scores
    console.log(`Match results for ${tester99.username}:`);
    matchResults.slice(0, 5).forEach((match) => {
      console.log(`- ${match.username}: ${match.matchScore}% compatible`);
      console.log(`  Gender: ${match.gender}, User's interest: ${tester99.interestedGenders}`);
      console.log(`  User's gender: ${tester99.gender}, Match's interest: ${match.interestedGenders}`);
    });
    
    // Get top matches to create
    const topMatches = matchResults
      .filter(match => match.matchScore >= 40) // Lower threshold to ensure matches
      .slice(0, remainingMatches);
    
    // Create new matches
    if (topMatches.length > 0) {
      for (const match of topMatches) {
        const newMatch = await db.insert(matches)
          .values({
            userId1: tester99.id,
            userId2: match.id,
            compatibility: match.matchScore,
            callScheduled: false,
            matchDate: new Date(),
            callCount: 0,
            isChatUnlocked: false,
            arePhotosRevealed: false,
            status: 'active'
          })
          .returning();
        
        console.log(`Created new match between Tester99 and ${match.username} with ${match.matchScore}% compatibility`);
      }
      console.log(`Created ${topMatches.length} new matches for Tester99`);
    } else {
      console.log('No suitable matches found for Tester99');
    }
    
    // Verify the matches again after creation
    const updatedMatches = await db.select()
      .from(matches)
      .where(
        or(
          eq(matches.userId1, tester99.id),
          eq(matches.userId2, tester99.id)
        )
      );
    
    console.log(`Tester99 now has ${updatedMatches.length} matches:`);
    console.log(JSON.stringify(updatedMatches, null, 2));
    
  } catch (error) {
    console.error('Error debugging matches:', error);
  } finally {
    process.exit(0);
  }
}

debugMatches();