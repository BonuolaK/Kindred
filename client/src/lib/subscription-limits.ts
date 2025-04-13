/**
 * Defines the subscription plan limits for Kindred app
 */

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'unlimited';

interface SubscriptionLimits {
  maxMatches: number;
  callsPerDay: number;
  callDuration: number; // in minutes
  photoRevealAfter: number; // number of calls
  supportsPriority: boolean;
}

// Max matches available based on subscription type
export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxMatches: 1,
    callsPerDay: 1,
    callDuration: 5,
    photoRevealAfter: 3,
    supportsPriority: false,
  },
  basic: {
    maxMatches: 3,
    callsPerDay: 2,
    callDuration: 10,
    photoRevealAfter: 3,
    supportsPriority: false,
  },
  premium: {
    maxMatches: 5,
    callsPerDay: 3,
    callDuration: 20,
    photoRevealAfter: 2,
    supportsPriority: true,
  },
  unlimited: {
    maxMatches: 10,
    callsPerDay: 5,
    callDuration: 30,
    photoRevealAfter: 1,
    supportsPriority: true,
  },
};

/**
 * Get the maximum number of matches available for a user based on subscription type
 */
export function getMaxMatches(profileType?: string): number {
  const tier = (profileType || 'basic') as SubscriptionTier;
  return SUBSCRIPTION_LIMITS[tier]?.maxMatches || SUBSCRIPTION_LIMITS.basic.maxMatches;
}

/**
 * Check if a user has reached their match limit based on subscription type
 */
export function hasReachedMatchLimit(currentMatchCount: number, profileType?: string): boolean {
  const maxMatches = getMaxMatches(profileType);
  return currentMatchCount >= maxMatches;
}

/**
 * Get subscription display name
 */
export function getSubscriptionName(profileType?: string): string {
  const tier = (profileType || 'basic') as SubscriptionTier;
  
  switch(tier) {
    case 'free':
      return 'Free Plan';
    case 'basic':
      return 'Basic Plan';
    case 'premium':
      return 'Premium Plan';
    case 'unlimited':
      return 'Unlimited Plan';
    default:
      return 'Basic Plan';
  }
}