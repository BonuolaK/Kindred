// Script to debug matches for bonu.kenny_741
import { db } from '../server/db.js';
import { users, matches } from '../shared/schema.js';
import { eq, and, or, ne } from 'drizzle-orm';
import { MatchingAlgorithm } from '../server/matching-algorithm.js';

// Helper function to normalize gender
function normalizeGender(gender) {
  if (!gender) return null;
  
  const g = gender.toLowerCase();
  
  // Map different formats to standard values
  if (g === 'man' || g === 'male' || g === 'men') return 'male';
  if (g === 'woman' || g === 'female' || g === 'women') return 'female';
  if (g === 'non-binary' || g === 'nonbinary' || g === 'non binary') return 'non-binary';
  
  return g;
}

async function debugUserMatches() {
  try {
    // For bonu.kenny_741
    const username = 'bonu.kenny_741';
    
    console.log(`Debug matching for user: ${username}`);
    
    // Get user info
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, username));
    
    if (!user) {
      console.log(`User ${username} not found`);
      return;
    }
    
    console.log('User found:', {
      id: user.id,
      username: user.username,
      gender: user.gender, 
      interestedGenders: user.interestedGenders,
      age: user.age,
      agePreferences: `${user.agePreferenceMin || 'not set'} - ${user.agePreferenceMax || 'not set'}`,
      location: user.location,
      profileType: user.profileType
    });
    
    // Get existing matches for this user
    const userMatches = await db.select()
      .from(matches)
      .where(
        or(
          eq(matches.userId1, user.id),
          eq(matches.userId2, user.id)
        )
      );
    
    console.log(`Found ${userMatches.length} matches for ${username}`);
    for (const match of userMatches) {
      console.log(`- Match ID: ${match.id}, status: ${match.status}`);
    }
    
    // Check if user has reached their match limit
    const maxMatches = user.profileType === 'premium' ? 5 : 
                      user.profileType === 'unlimited' ? 10 : 3; // Default to 'basic' (3)
    
    console.log(`Match limit for ${username}: ${maxMatches}, current matches: ${userMatches.length}`);
    
    if (userMatches.length >= maxMatches) {
      console.log(`User has reached their match limit of ${maxMatches}`);
    }
    
    // Get any unmatched users
    const unmatchedMatches = await db.select()
      .from(matches)
      .where(
        and(
          eq(matches.unmatchedBy, user.id),
          eq(matches.status, 'unmatched')
        )
      );
    
    // Extract user IDs that have been unmatched by the current user
    const unmatchedUserIds = unmatchedMatches.map(match => 
      match.userId1 === user.id ? match.userId2 : match.userId1
    );
    
    console.log(`User ${user.id} has unmatched ${unmatchedUserIds.length} users`);
    
    // Get potential matches - all users except the current user and those already matched or unmatched
    const existingMatchUserIds = userMatches.map(match => 
      match.userId1 === user.id ? match.userId2 : match.userId1
    );
    
    // Combine existing matches and unmatched users
    const excludedUserIds = [...new Set([...existingMatchUserIds, ...unmatchedUserIds, user.id])];
    
    // Find all potential candidates
    const potentialMatches = await db.select()
      .from(users)
      .where(
        and(
          ...excludedUserIds.map(id => ne(users.id, id))
        )
      );
    
    console.log(`Found ${potentialMatches.length} potential candidates (not matched and not unmatched):`);
    for (const candidate of potentialMatches) {
      console.log(`- ${candidate.username} (ID: ${candidate.id}, Gender: ${candidate.gender || 'Not set'}, Interested in: ${candidate.interestedGenders ? JSON.stringify(candidate.interestedGenders) : 'Not set'})`);
    }
    
    // Use matching algorithm to find compatible candidates
    const algorithm = new MatchingAlgorithm();
    const matchResults = algorithm.findMatches(user, potentialMatches);
    
    console.log(`\nAlgorithm match results for ${username}:`);
    if (matchResults.length === 0) {
      console.log('No matches found by algorithm');
    } else {
      matchResults.slice(0, 10).forEach((match, index) => {
        console.log(`${index + 1}. ${match.username}: ${match.matchScore}% compatible`);
        console.log(`   Gender: ${match.gender}, User interested in: ${user.interestedGenders ? JSON.stringify(user.interestedGenders) : 'Not set'}`);
        console.log(`   Match's gender: ${match.gender}, interested in: ${match.interestedGenders ? JSON.stringify(match.interestedGenders) : 'Not set'}`);
        console.log(`   Breakdown - Personality: ${match.compatibilityBreakdown.personality}%, Location: ${match.compatibilityBreakdown.location}%, Age: ${match.compatibilityBreakdown.age}%`);
      });
    }
    
    // Manual check for gender compatibility
    console.log('\nManual gender compatibility check:');
    const manualCompatible = potentialMatches.filter(candidate => {
      if (!user.gender || !candidate.gender || !user.interestedGenders || !candidate.interestedGenders) {
        console.log(`- ${candidate.username}: Missing gender or interest data`);
        return false;
      }
      
      const normalizedUserGender = normalizeGender(user.gender);
      const normalizedCandidateGender = normalizeGender(candidate.gender);
      const normalizedUserInterests = user.interestedGenders.map(g => normalizeGender(g));
      const normalizedCandidateInterests = candidate.interestedGenders.map(g => normalizeGender(g));
      
      const mutualInterest = normalizedCandidateInterests.includes(normalizedUserGender) && 
                             normalizedUserInterests.includes(normalizedCandidateGender);
                             
      console.log(`- ${candidate.username}: Mutual interest = ${mutualInterest}`);
      console.log(`  User gender: ${normalizedUserGender}, interests: ${JSON.stringify(normalizedUserInterests)}`);
      console.log(`  Candidate gender: ${normalizedCandidateGender}, interests: ${JSON.stringify(normalizedCandidateInterests)}`);
      
      return mutualInterest;
    });
    
    console.log(`\nFound ${manualCompatible.length} candidates with mutual gender interest`);
    
    if (manualCompatible.length > 0) {
      // Check if there's a bug in the match display
      console.log('\nChecking if matches already exist but aren\'t being displayed...');
      
      // Get all matches again to double check
      const allMatches = await db.select()
        .from(matches)
        .where(
          or(
            eq(matches.userId1, user.id),
            eq(matches.userId2, user.id)
          )
        );
      
      if (allMatches.length > userMatches.length) {
        console.log('ISSUE FOUND: Some matches exist but might not be showing correctly');
        console.log(`- Original count: ${userMatches.length}, Rechecked count: ${allMatches.length}`);
      } else {
        console.log('Match counts are consistent');
      }
      
      // Check for active vs. inactive status
      const activeMatches = allMatches.filter(m => m.status === 'active');
      console.log(`Active matches: ${activeMatches.length} of ${allMatches.length} total`);
      
      if (activeMatches.length < allMatches.length) {
        console.log('ISSUE FOUND: Some matches are not active');
        
        // Check non-active matches
        for (const match of allMatches.filter(m => m.status !== 'active')) {
          console.log(`- Match ID: ${match.id}, status: ${match.status}`);
        }
      }
    }
    
    console.log('\nRecommendation:');
    if (userMatches.length < maxMatches && manualCompatible.length > 0) {
      console.log(`User ${username} should be able to receive ${maxMatches - userMatches.length} more matches.`);
      console.log('To generate missing matches, try running the generate-matches API endpoint');
    } else if (userMatches.length >= maxMatches) {
      console.log(`User ${username} has already reached their maximum match limit (${maxMatches}).`);
      console.log('They will need to upgrade their plan to get more matches or unmatch someone to make room.');
    } else if (manualCompatible.length === 0) {
      console.log(`No compatible matches found for user ${username}.`);
      console.log('This suggests gender preference or location mismatches with available users.');
    }
    
  } catch (error) {
    console.error('Error debugging user matches:', error);
  } finally {
    console.log('Done');
    process.exit(0);
  }
}

debugUserMatches();