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

async function ensureBasicPlanMatches() {
  try {
    // Get all basic plan users
    const basicPlanUsers = await db.select()
      .from(users)
      .where(eq(users.profileType, 'basic'));
    
    console.log(`Found ${basicPlanUsers.length} basic plan users`);
    
    for (const user of basicPlanUsers) {
      console.log(`\nProcessing user: ${user.username} (ID: ${user.id})`);
      
      // Get current matches for this user
      const userMatches = await db.select()
        .from(matches)
        .where(
          or(
            eq(matches.userId1, user.id),
            eq(matches.userId2, user.id)
          )
        );
      
      console.log(`  User has ${userMatches.length} existing matches`);
      
      // Maximum matches for basic plan is 3
      const maxMatches = 3;
      const remainingMatches = maxMatches - userMatches.length;
      
      if (remainingMatches <= 0) {
        console.log(`  User already has their maximum number of matches`);
        continue;
      }
      
      console.log(`  User needs ${remainingMatches} more matches. Generating them now...`);
      
      // Get all existing match user IDs
      const existingMatchUserIds = userMatches.map(match => 
        match.userId1 === user.id ? match.userId2 : match.userId1
      );
      
      // Get all potential match candidates
      const matchCandidates = await db.select()
        .from(users)
        .where(
          and(
            ne(users.id, user.id),
            ...existingMatchUserIds.map(id => ne(users.id, id))
          )
        );
      
      console.log(`  Found ${matchCandidates.length} potential match candidates`);
      
      // Manual gender preference matching
      const manualMatchResults = matchCandidates.map(candidate => {
        // Check gender compatibility
        const userGender = normalizeGender(user.gender);
        const candidateGender = normalizeGender(candidate.gender);
        
        // Convert interest arrays to normalized values
        const userInterests = (user.interestedGenders || []).map(g => normalizeGender(g));
        const candidateInterests = (candidate.interestedGenders || []).map(g => normalizeGender(g));
        
        // Check mutual interest
        const userInterestedInCandidate = candidateGender && userInterests.some(g => g === candidateGender);
        const candidateInterestedInUser = userGender && candidateInterests.some(g => g === userGender);
        
        // Calculate a simple compatibility score
        let compatibilityScore = 0;
        if (userInterestedInCandidate && candidateInterestedInUser) {
          // If mutual interest, assign a high compatibility score to ensure matching
          compatibilityScore = 80;
        }
        
        return {
          ...candidate,
          matchScore: compatibilityScore,
          userInterestedInCandidate,
          candidateInterestedInUser
        };
      });
      
      // Also use the full matching algorithm as fallback
      const algorithm = new MatchingAlgorithm();
      const algorithmResults = algorithm.findMatches(user, matchCandidates);
      
      // Get top matches to create - use manual results first, then algorithm results as fallback
      const manualTopMatches = manualMatchResults
        .filter(match => match.matchScore >= 60) // Matches with mutual interest
        .slice(0, remainingMatches);
      
      // If we don't have enough high-quality matches, add some from algorithm results
      const topMatches = manualTopMatches.length >= remainingMatches 
        ? manualTopMatches 
        : [...manualTopMatches, ...algorithmResults
            .filter(match => match.matchScore >= 40 && !manualTopMatches.some(m => m.id === match.id))
            .slice(0, remainingMatches - manualTopMatches.length)];
      
      // Create new matches
      if (topMatches.length > 0) {
        for (const match of topMatches) {
          const newMatch = await db.insert(matches)
            .values({
              userId1: user.id,
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
          
          console.log(`  Created new match between ${user.username} and ${match.username} with ${match.matchScore}% compatibility`);
        }
        console.log(`  Created ${topMatches.length} new matches for ${user.username}`);
      } else {
        console.log(`  No suitable matches found for ${user.username}`);
      }
    }
    
    console.log('\nMatch generation process completed successfully');
  } catch (error) {
    console.error('Error ensuring basic plan matches:', error);
  } finally {
    process.exit(0);
  }
}

ensureBasicPlanMatches();