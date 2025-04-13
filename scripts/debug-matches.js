import { db } from '../server/db.js';
import { matches, users } from '../shared/schema.js';
import { eq, or, and, ne } from 'drizzle-orm';
import { MatchingAlgorithm } from '../server/matching-algorithm.js';

// Helper function to normalize gender text
function normalizeGender(gender) {
  if (!gender) return null;
  
  const genderText = typeof gender === 'string' ? gender.toLowerCase() : null;
  
  if (genderText === 'woman' || genderText === 'women' || genderText === 'female') {
    return 'female';
  } else if (genderText === 'man' || genderText === 'men' || genderText === 'male') {
    return 'male';
  }
  
  return genderText;
}

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
    
    // Create a manual check for gender preference matching
    const manualMatchResults = allUsers.map(user => {
      // Check gender compatibility
      const userGender = normalizeGender(tester99.gender);
      const candidateGender = normalizeGender(user.gender);
      
      // Convert interest arrays to normalized values
      const userInterests = (tester99.interestedGenders || []).map(g => normalizeGender(g));
      const candidateInterests = (user.interestedGenders || []).map(g => normalizeGender(g));
      
      // Check mutual interest
      const userInterestedInCandidate = candidateGender && userInterests.some(g => g === candidateGender);
      const candidateInterestedInUser = userGender && candidateInterests.some(g => g === userGender);
      
      // Calculate a simple compatibility score (replacing with actual algorithm if needed)
      let compatibilityScore = 0;
      if (userInterestedInCandidate && candidateInterestedInUser) {
        // If mutual interest, assign a high compatibility score to ensure matching
        compatibilityScore = 80;
      }
      
      return {
        ...user,
        matchScore: compatibilityScore,
        userInterestedInCandidate,
        candidateInterestedInUser
      };
    });
    
    console.log("Manual match results:");
    manualMatchResults
      .filter(match => match.matchScore > 0)
      .slice(0, 5)
      .forEach(match => {
        console.log(`- ${match.username}: ${match.matchScore}% compatible`);
        console.log(`  User interested in candidate: ${match.userInterestedInCandidate}`);
        console.log(`  Candidate interested in user: ${match.candidateInterestedInUser}`);
      });
    
    // Get top matches to create - use manual results first, then algorithm results as fallback
    const manualTopMatches = manualMatchResults
      .filter(match => match.matchScore >= 60) // Matches with mutual interest
      .slice(0, remainingMatches);
    
    // If we didn't get enough matches from manual checking, also use the algorithm results
    const topMatches = manualTopMatches.length >= remainingMatches 
      ? manualTopMatches 
      : [...manualTopMatches, ...matchResults
          .filter(match => match.matchScore >= 40 && !manualTopMatches.some(m => m.id === match.id))
          .slice(0, remainingMatches - manualTopMatches.length)];
    
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