// Simple analytics wrapper
import { PostHog } from './posthog';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ANALYTICS_EVENTS } from './analytics-events';

/**
 * Initialize analytics with the current user when the app starts
 */
export function initAnalytics() {
  console.log('[Analytics] Initializing analytics system');
  // Nothing needed here as PostHog is loaded automatically
  // when the posthog.js module is imported
}

/**
 * Track an analytics event
 * @param {string} eventName - Name of the event to track
 * @param {Object} properties - Additional properties to include with the event
 */
export function trackEvent(eventName, properties = {}) {
  console.log(`[Analytics] Tracking event: ${eventName}`, properties);
  PostHog.capture(eventName, properties);
}

/**
 * Identify a user in the analytics system
 * @param {number|string} userId - ID of the user to identify
 * @param {Object} properties - User properties to include
 */
export function identifyUser(userId, properties = {}) {
  if (!userId) return;
  console.log(`[Analytics] User identified: ${userId}`, properties);
  PostHog.identify(userId, properties);
}

/**
 * Reset the current user in the analytics system
 */
export function resetUser() {
  console.log('[Analytics] User reset');
  PostHog.reset();
}

/**
 * Hook to automatically identify the current user on page load
 */
export function useAnalyticsUser() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user?.id) {
      // Create a simplified user object for analytics
      const userProperties = {
        username: user.username,
        email: user.email,
        profileType: user.profileType,
        accountCreated: user.createdAt
      };
      identifyUser(user.id, userProperties);
    } else {
      resetUser();
    }
  }, [user?.id]);
}

/**
 * Track a page view event
 * @param {string} pageName - Name of the page being viewed
 * @param {Object} properties - Additional properties to include
 */
export function trackPageView(pageName, properties = {}) {
  trackEvent('page_view', { page: pageName, ...properties });
}

// Export event constants
export { ANALYTICS_EVENTS };

// Export a default object with all functions
export default {
  initAnalytics,
  trackEvent,
  identifyUser,
  resetUser,
  useAnalyticsUser,
  trackPageView,
  ANALYTICS_EVENTS
};