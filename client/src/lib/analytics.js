// Professional analytics implementation using PostHog
import { PostHog } from './posthog';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { USER_EVENTS, MATCH_EVENTS, COMMUNICATION_EVENTS, FEATURE_EVENTS, PAGE_EVENTS } from './analytics-events';

// Store for recent events (only in memory - for debugging)
const recentEvents = [];
const MAX_EVENTS = 100;

// Track if we've initialized
let initialized = false;

/**
 * Initialize analytics with PostHog when the app starts
 */
export function initAnalytics() {
  if (initialized) return;
  initialized = true;
  
  console.log('[Analytics] Initializing PostHog analytics');
  
  // Debug helper for development
  if (typeof window !== 'undefined') {
    window.KindredAnalytics = {
      getEvents: () => recentEvents,
      clearEvents: () => {
        recentEvents.length = 0;
        console.log('[Analytics] Events cleared');
      }
    };
  }
}

/**
 * Track an analytics event
 * @param {string} eventName - Name of the event to track
 * @param {Object} properties - Additional properties to include with the event
 */
export function trackEvent(eventName, properties = {}) {
  if (!initialized) initAnalytics();
  
  // Add app and environment info
  const enrichedProperties = {
    ...properties,
    app: 'kindred',
    env: import.meta.env.MODE || 'development',
    event_time: new Date().toISOString()
  };

  // Store in local memory for debugging
  recentEvents.unshift({
    name: eventName,
    properties: enrichedProperties,
    timestamp: new Date().toISOString()
  });
  
  if (recentEvents.length > MAX_EVENTS) {
    recentEvents.pop();
  }

  // Console log
  console.log(`[Analytics] ${eventName}`, enrichedProperties);
  
  // Send to PostHog with additional logging
  console.log(`[Analytics Direct] Sending event to PostHog: ${eventName}`);
  try {
    PostHog.capture(eventName, enrichedProperties);
    
    // Direct capture for critical events to ensure they're sent
    if (typeof window !== 'undefined' && window.posthog && 
        ['page_view', 'identify_user', 'app_initialized'].includes(eventName)) {
      console.log(`[Analytics Direct] Critical event - sending directly via window.posthog: ${eventName}`);
      window.posthog.capture(eventName, {
        ...enrichedProperties,
        sent_directly: true
      });
    }
  } catch (error) {
    console.error(`[Analytics] Error sending to PostHog: ${error.message}`);
  }
}

/**
 * Identify a user in the analytics system
 * @param {number|string} userId - ID of the user to identify
 * @param {Object} properties - User properties to include
 */
export function identifyUser(userId, properties = {}) {
  if (!userId) return;
  
  const enrichedProperties = {
    ...properties,
    app: 'kindred',
    env: import.meta.env.MODE || 'development'
  };
  
  // Log the identification
  console.log(`[Analytics] Identifying user: ${userId}`, enrichedProperties);
  
  // Send to PostHog
  console.log(`[Analytics Direct] Identifying user in PostHog: ${userId}`);
  try {
    // Try regular API call first
    PostHog.identify(userId, enrichedProperties);
    
    // Also try direct window method for critical user identification
    if (typeof window !== 'undefined' && window.posthog) {
      console.log(`[Analytics Direct] Critical identify - sending directly via window.posthog`);
      window.posthog.identify(userId.toString(), enrichedProperties);
      
      // Also capture an identify event
      window.posthog.capture('user_identified', {
        userId: userId.toString(),
        timestamp: new Date().toISOString(),
        sent_directly: true
      });
    }
  } catch (error) {
    console.error(`[Analytics] Error identifying in PostHog: ${error.message}`);
  }
}

/**
 * Reset the current user in the analytics system
 */
export function resetUser() {
  console.log('[Analytics] Resetting user');
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
        email: user.email || '',
        profileType: user.profileType || 'basic',
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
  const pageProperties = {
    page: pageName,
    path: window.location.pathname,
    url: window.location.href,
    ...properties
  };
  
  // Track as a custom event
  trackEvent('page_view', pageProperties);
  
  // Also send to PostHog's native pageview tracking
  PostHog.capturePageView(window.location.href);
}

// Combine all events into ANALYTICS_EVENTS for backward compatibility
export const ANALYTICS_EVENTS = {
  ...USER_EVENTS,
  ...MATCH_EVENTS,
  ...COMMUNICATION_EVENTS,
  ...FEATURE_EVENTS,
  ...PAGE_EVENTS
};

// Export event constants
export { USER_EVENTS, MATCH_EVENTS, COMMUNICATION_EVENTS, FEATURE_EVENTS, PAGE_EVENTS };

// Export a default object with all functions
export default {
  initAnalytics,
  trackEvent,
  identifyUser,
  resetUser,
  useAnalyticsUser,
  trackPageView,
  USER_EVENTS,
  MATCH_EVENTS,
  COMMUNICATION_EVENTS,
  FEATURE_EVENTS,
  PAGE_EVENTS
};