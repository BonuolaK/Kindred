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
    case 'basic':
      return currentMatchCount < 3;
    case 'premium':
      return currentMatchCount < 5;
    case 'elite':
      return true; // Unlimited matches
    default:
      return currentMatchCount < 3; // Default to basic if profileType is not recognized
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
    // Filter candidates by gender preference first (critical requirement)
    const genderFilteredCandidates = this.filterByGenderPreference(user, candidates);
    
    // Calculate match scores for remaining candidates
    const scoredCandidates = genderFilteredCandidates.map(candidate => {
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
      
      // Skip if no gender preferences set
      if (!user.interestedGenders || !candidate.interestedGenders) return false;
      
      // Check if user's gender is in candidate's interested genders
      const candidateInterestedInUser = 
        candidate.interestedGenders.includes(user.gender || "");
      
      // Check if candidate's gender is in user's interested genders
      const userInterestedInCandidate = 
        user.interestedGenders.includes(candidate.gender || "");
      
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
    if (!userResponse || !candidateResponse) return undefined;
    if (userResponse.length === 0 || candidateResponse.length === 0) return undefined;
    
    // Calculate Jaccard similarity (intersection over union)
    const intersection = userResponse.filter(item => 
      candidateResponse.includes(item)
    );
    
    const union = new Set([...userResponse, ...candidateResponse]);
    
    const similarity = intersection.length / union.size;
    
    // For some metrics like dealbreakers, we want to invert the score
    // More similar dealbreakers = lower compatibility
    return invert ? 1 - similarity : similarity;
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