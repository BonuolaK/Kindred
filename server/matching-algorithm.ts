import { User } from "@shared/schema";

/**
 * Kindred - Photoless Dating Matching Algorithm
 * This algorithm matches users based on personality compatibility (60%), 
 * location proximity (20%), and age compatibility (20%)
 */
/**
 * Function to check if user can receive new matches based on their profile type
 * @param user The user to check
 * @param currentMatchCount The number of current matches the user has
 * @returns Boolean indicating if the user can receive more matches
 */
export function canReceiveNewMatch(user: User, currentMatchCount: number): boolean {
  switch(user.profileType) {
    case 'free':
      return currentMatchCount < 1;
    case 'basic':
      return currentMatchCount < 3;
    case 'premium':
      return currentMatchCount < 5;
    case 'unlimited':
      return currentMatchCount < 10;
    default:
      return currentMatchCount < 3; // Default to basic if profileType is not recognized
  }
}

/**
 * Get the maximum number of matches allowed for a user based on their subscription type
 * @param user The user to check
 * @returns The maximum number of matches allowed
 */
export function getMaxMatchesAllowed(user: User): number {
  switch(user.profileType) {
    case 'free':
      return 1;
    case 'basic':
      return 3;
    case 'premium':
      return 5;
    case 'unlimited':
      return 10;
    default:
      return 3; // Default to basic if profileType is not recognized
  }
}

export class MatchingAlgorithm {
  private weights = {
    personality: 0.6,
    location: 0.2,
    age: 0.2
  };
  
  private distanceThresholds = {
    sameCity: 5,
    nearby: 20,
    sameRegion: 100
  };
  
  /**
   * Main matching function - returns array of potential matches with scores
   */
  findMatches(user: User, candidates: User[]) {
    // Define preferred age range if specified
    // Default to 21-40 if age is not set (ensures 21+ minimum)
    const defaultUserAge = (user.age !== null && user.age !== undefined) ? user.age : 30;
    const userMinAge = user.agePreferenceMin || Math.max(21, defaultUserAge - 5);
    const userMaxAge = user.agePreferenceMax || (defaultUserAge + 5);
    
    // Filter candidates by gender preference first (critical requirement)
    const genderFilteredCandidates = this.filterByGenderPreference(user, candidates);
    
    console.log(`Age Preference Check: User ${user.username} prefers ages ${userMinAge}-${userMaxAge}`);
    
    // Filter candidates by age preference (another critical requirement)
    const ageFilteredCandidates = genderFilteredCandidates.filter(candidate => {
      // If no age is provided for candidate, we'll allow them (for testing/admin accounts)
      if (!candidate.age) {
        console.log(`Age Preference Skip: Candidate ${candidate.username} has no age specified, including`);
        return true;
      }
      
      // Check if candidate age is within user's preferred range
      const ageInRange = candidate.age >= userMinAge && candidate.age <= userMaxAge;
      
      console.log(`Age Preference Check: Candidate ${candidate.username} (age: ${candidate.age}) ${ageInRange ? 'IS' : 'is NOT'} within user's preferred range ${userMinAge}-${userMaxAge}`);
      
      // Additional validation: check mutual age preference
      if (ageInRange) {
        // Also check if user's age is within candidate's preferred range
        const candidateMinAge = candidate.agePreferenceMin || Math.max(21, candidate.age - 5);
        const candidateMaxAge = candidate.agePreferenceMax || (candidate.age + 5);
        
        // If user has no age specified, assume they're within range (for admin accounts)
        if (!user.age) {
          console.log(`Age Preference Skip: User ${user.username} has no age specified, assuming in range`);
          return true;
        }
        
        const userInCandidateRange = user.age >= candidateMinAge && user.age <= candidateMaxAge;
        
        console.log(`Age Preference Mutual Check: User ${user.username} (age: ${user.age}) ${userInCandidateRange ? 'IS' : 'is NOT'} within candidate's preferred range ${candidateMinAge}-${candidateMaxAge}`);
        
        // Only include matches where both users are within each other's age preferences
        return userInCandidateRange;
      }
      
      return false;
    });
    
    console.log(`Age Preference Results: ${ageFilteredCandidates.length} candidates remain after age filtering`);
    
    // Calculate match scores for remaining candidates
    const scoredCandidates = ageFilteredCandidates.map(candidate => {
      const personalityScore = this.calculatePersonalityScore(user, candidate);
      const locationScore = this.calculateLocationScore(user, candidate);
      const ageScore = this.calculateAgeScore(user, candidate);
      
      // Apply weights to each component
      const weightedScore = (
        personalityScore * this.weights.personality +
        locationScore * this.weights.location +
        ageScore * this.weights.age
      );
      
      return {
        ...candidate,
        matchScore: Math.round(weightedScore * 100), // Convert to percentage
        compatibilityBreakdown: {
          personality: Math.round(personalityScore * 100),
          location: Math.round(locationScore * 100),
          age: Math.round(ageScore * 100)
        }
      };
    });
    
    // Sort by match score (highest first)
    return scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  /**
   * Filter candidates by gender preference - this is a critical requirement
   */
  private filterByGenderPreference(user: User, candidates: User[]) {
    return candidates.filter(candidate => {
      // Skip self
      if (candidate.id === user.id) return false;
      
      // For better debugging, log the gender preferences
      console.log(`Checking gender preferences between ${user.username} and ${candidate.username}:`);
      console.log(`  User gender: ${user.gender || 'Not specified'}`);
      console.log(`  Candidate gender: ${candidate.gender || 'Not specified'}`);
      console.log(`  User interested in: ${user.interestedGenders ? JSON.stringify(user.interestedGenders) : 'Not specified'}`);
      console.log(`  Candidate interested in: ${candidate.interestedGenders ? JSON.stringify(candidate.interestedGenders) : 'Not specified'}`);
      
      // If preferences aren't set, be inclusive rather than exclusive
      if (!user.interestedGenders || !user.interestedGenders.length) {
        console.log(`  ${user.username} has no gender preferences set, considering all matches`);
        return true;
      }
      
      if (!candidate.interestedGenders || !candidate.interestedGenders.length) {
        console.log(`  ${candidate.username} has no gender preferences set, considering as match`);
        return true;
      }
      
      // Handle missing gender field more gracefully
      if (!user.gender) {
        console.log(`  ${user.username} has no gender specified, skipping mutual check`);
        // Only check if user is interested in candidate's gender
        return user.interestedGenders.includes(candidate.gender || "");
      }
      
      if (!candidate.gender) {
        console.log(`  ${candidate.username} has no gender specified, skipping mutual check`);
        // Only check if candidate is interested in user's gender
        return candidate.interestedGenders.includes(user.gender || "");
      }
      
      // Normalize gender values for case-insensitive comparison
      const normalizeGender = (gender: string): string => {
        const g = gender.toLowerCase();
        
        // Map different formats to standard values
        if (g === 'man' || g === 'male' || g === 'men') return 'male';
        if (g === 'woman' || g === 'female' || g === 'women') return 'female';
        if (g === 'non-binary' || g === 'nonbinary' || g === 'non binary') return 'non-binary';
        
        return g;
      };
      
      const normalizedUserGender = normalizeGender(user.gender);
      const normalizedCandidateGender = normalizeGender(candidate.gender);
      
      // Normalize the interest arrays
      const normalizedUserInterests = user.interestedGenders.map(g => normalizeGender(g));
      const normalizedCandidateInterests = candidate.interestedGenders.map(g => normalizeGender(g));
      
      // Standard mutual interest check with normalized values
      const candidateInterestedInUser = normalizedCandidateInterests.includes(normalizedUserGender);
      const userInterestedInCandidate = normalizedUserInterests.includes(normalizedCandidateGender);
      
      console.log(`  Normalized user gender: ${normalizedUserGender}, candidate gender: ${normalizedCandidateGender}`);
      console.log(`  Normalized user interests: ${JSON.stringify(normalizedUserInterests)}`);
      console.log(`  Normalized candidate interests: ${JSON.stringify(normalizedCandidateInterests)}`);
      console.log(`  Candidate interested in user: ${candidateInterestedInUser}`);
      console.log(`  User interested in candidate: ${userInterestedInCandidate}`);
      console.log(`  Match: ${candidateInterestedInUser && userInterestedInCandidate}`);
      
      // Must be mutual interest
      return candidateInterestedInUser && userInterestedInCandidate;
    });
  }
  
  /**
   * Calculate personality compatibility score (0-1)
   */
  private calculatePersonalityScore(user: User, candidate: User) {
    const questionnaireResponses = [
      this.compareResponses(user.communicationStyle, candidate.communicationStyle),
      this.compareArrayResponses(user.freeTimeActivities, candidate.freeTimeActivities),
      this.compareResponses(user.values, candidate.values),
      this.compareResponses(user.conflictResolution, candidate.conflictResolution),
      this.compareResponses(user.loveLanguage, candidate.loveLanguage),
      this.compareResponses(user.relationshipPace, candidate.relationshipPace),
      this.compareArrayResponses(user.dealbreakers, candidate.dealbreakers, true) // Invert for dealbreakers
    ];
    
    // Filter out undefined scores
    const validScores = questionnaireResponses.filter(score => score !== undefined) as number[];
    
    // If no valid scores, return middle value
    if (validScores.length === 0) return 0.5;
    
    // Average the scores from all questions
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  }
  
  /**
   * Compare string responses between two users for a single question
   */
  private compareResponses(userResponse?: string | null, candidateResponse?: string | null): number | undefined {
    if (!userResponse || !candidateResponse) return undefined;
    
    // Exact match gets full score
    return userResponse === candidateResponse ? 1 : 0;
  }
  
  /**
   * Compare array responses between two users
   */
  private compareArrayResponses(
    userResponse?: string[] | null, 
    candidateResponse?: string[] | null,
    invert: boolean = false
  ): number | undefined {
    // Handle null/undefined arrays more gracefully
    if (!userResponse) userResponse = [];
    if (!candidateResponse) candidateResponse = [];
    
    // If both arrays are empty, they're technically identical
    if (userResponse.length === 0 && candidateResponse.length === 0) return 1.0;
    
    // If one array is empty but the other isn't, there's minimal similarity
    if (userResponse.length === 0 || candidateResponse.length === 0) return 0.2;
    
    // Log for debugging
    console.log(`Comparing arrays: ${JSON.stringify(userResponse)} and ${JSON.stringify(candidateResponse)}`);
    
    // Calculate Jaccard similarity (intersection over union)
    const intersection = userResponse.filter(item => 
      candidateResponse.includes(item)
    );
    
    const union = new Set([...userResponse, ...candidateResponse]);
    
    const similarity = intersection.length / union.size;
    console.log(`Array similarity: ${similarity} (${intersection.length} common items out of ${union.size} total)`);
    
    // For some metrics like dealbreakers, we want to invert the score
    // More similar dealbreakers = lower compatibility
    const result = invert ? 1 - similarity : similarity;
    console.log(`Final array score (${invert ? 'inverted' : 'normal'}): ${result}`);
    
    return result;
  }
  
  /**
   * Calculate location compatibility score (0-1)
   */
  private calculateLocationScore(user: User, candidate: User): number {
    // Simplified implementation for locations as strings
    if (!user.location || !candidate.location) return 0.5; // Medium score if no location
    
    if (user.location === candidate.location) {
      return 1.0; // Same city (highest score)
    }
    
    // Simplified region matching based on first word in location
    // This assumes format like "London, UK" where London is the city
    const userCity = user.location.split(',')[0].trim();
    const candidateCity = candidate.location.split(',')[0].trim();
    
    if (userCity === candidateCity) {
      return 0.8; // Same city but maybe different postal code
    }
    
    // Simplified region matching
    // Get country or region after comma
    const userRegion = user.location.includes(',') ? 
      user.location.split(',')[1].trim() : '';
    
    const candidateRegion = candidate.location.includes(',') ? 
      candidate.location.split(',')[1].trim() : '';
    
    if (userRegion && candidateRegion && userRegion === candidateRegion) {
      return 0.5; // Same region
    }
    
    // Different regions
    return 0.2;
  }
  
  /**
   * Calculate age compatibility score (0-1)
   */
  private calculateAgeScore(user: User, candidate: User): number {
    if (!user.age || !candidate.age) return 0.5; // Medium score if ages unknown
    
    // Define preferred age range if not specified
    // Default to 5 years younger and 5 years older
    const userMin = user.agePreferenceMin || (user.age - 5);
    const userMax = user.agePreferenceMax || (user.age + 5);
    
    // Also calculate candidate's preferences
    const candidateMin = candidate.agePreferenceMin || (candidate.age - 5);
    const candidateMax = candidate.agePreferenceMax || (candidate.age + 5);
    
    // Check if either is outside the other's preferred range
    if (
      candidate.age < userMin || 
      candidate.age > userMax ||
      user.age < candidateMin ||
      user.age > candidateMax
    ) {
      return 0.2; // Low but not zero - still potential
    }
    
    // Calculate how centered they are in each other's preferences
    const userCenteredness = this.calculateAgeCenteredness(
      candidate.age, 
      userMin, 
      userMax
    );
    
    const candidateCenteredness = this.calculateAgeCenteredness(
      user.age, 
      candidateMin, 
      candidateMax
    );
    
    // Average the two values
    return (userCenteredness + candidateCenteredness) / 2;
  }
  
  /**
   * Calculate how centered an age is within a preferred range (higher if closer to center)
   */
  private calculateAgeCenteredness(age: number, minPreferred: number, maxPreferred: number): number {
    const rangeSize = maxPreferred - minPreferred;
    if (rangeSize <= 0) return 0.5; // Invalid range
    
    const center = minPreferred + (rangeSize / 2);
    const distanceFromCenter = Math.abs(age - center);
    const maxDistance = rangeSize / 2;
    
    // Convert to a 0-1 score, higher when closer to center
    return 1 - (distanceFromCenter / maxDistance);
  }
}