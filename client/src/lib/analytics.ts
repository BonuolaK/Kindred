/**
 * Standalone analytics utility functions that can be used anywhere in the application
 * These don't rely on React hooks so can be used in non-component code
 */

// Event names constants to ensure consistency
export const ANALYTICS_EVENTS = {
  // Authentication events
  USER_LOGIN: 'user_login',
  LOGIN_FAILED: 'login_failed',
  USER_REGISTERED: 'user_registered',
  REGISTRATION_FAILED: 'registration_failed',
  USER_LOGOUT: 'user_logout',
  
  // Profile events
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_UPDATE_FAILED: 'profile_update_failed',
  ID_VERIFICATION_STARTED: 'id_verification_started',
  ID_VERIFICATION_COMPLETED: 'id_verification_completed',
  ID_VERIFICATION_FAILED: 'id_verification_failed',
  
  // Subscription events
  SUBSCRIPTION_VIEWED: 'subscription_viewed',
  SUBSCRIPTION_CHANGED: 'subscription_changed',
  
  // Match events
  MATCH_RECEIVED: 'match_received',
  MATCH_ACCEPTED: 'match_accepted',
  MATCH_DECLINED: 'match_declined',
  
  // Call events
  CALL_INITIATED: 'call_initiated',
  CALL_CONNECTED: 'call_connected',
  CALL_ENDED: 'call_ended',
  CALL_REJECTED: 'call_rejected',
  CALL_MISSED: 'call_missed',
  CALL_ERROR: 'call_error',
  
  // Chat events
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  CHAT_OPENED: 'chat_opened',
  
  // Feature usage events
  NOTES_CREATED: 'notes_created',
  NOTES_UPDATED: 'notes_updated',
  
  // Page views are handled automatically by PostHog provider
  // Additional custom page events if needed
  PAGE_HOME_VIEWED: 'page_home_viewed',
  PAGE_MATCHES_VIEWED: 'page_matches_viewed',
  PAGE_CHATS_VIEWED: 'page_chats_viewed',
  PAGE_PROFILE_VIEWED: 'page_profile_viewed',
  PAGE_SUBSCRIPTION_VIEWED: 'page_subscription_viewed',
  
  // App lifecycle events
  APP_ERROR: 'app_error',
  NETWORK_ERROR: 'network_error'
};

/**
 * Track an event with PostHog
 * This function safely accesses the window.posthog object if available
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && 'posthog' in window) {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog.capture(eventName, properties);
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log(`[Analytics] Unable to track event: ${eventName}`);
    }
  }
}

/**
 * Identify a user with PostHog
 * This function safely accesses the window.posthog object if available
 */
export function identifyUser(userId: string | number, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && 'posthog' in window && userId) {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog.identify(userId, properties);
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log(`[Analytics] Unable to identify user: ${userId}`);
    }
  }
}

/**
 * Reset the current user in PostHog
 * This function safely accesses the window.posthog object if available
 */
export function resetUser() {
  if (typeof window !== 'undefined' && 'posthog' in window) {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog.reset();
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log('[Analytics] Unable to reset user');
    }
  }
}

/**
 * Track a page view with PostHog
 * This function safely accesses the window.posthog object if available
 */
export function trackPageView(path: string) {
  if (typeof window !== 'undefined' && 'posthog' in window) {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog.capture('$pageview', { path });
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log(`[Analytics] Unable to track page view: ${path}`);
    }
  }
}

/**
 * Track an error with PostHog
 * This function safely accesses the window.posthog object if available
 */
export function trackError(errorType: string, errorDetails: Record<string, any>) {
  if (typeof window !== 'undefined' && 'posthog' in window) {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog.capture('error', {
        error_type: errorType,
        ...errorDetails
      });
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log(`[Analytics] Unable to track error: ${errorType}`);
    }
  }
}