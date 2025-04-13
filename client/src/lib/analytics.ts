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
 * Ensure PostHog is loaded from CDN 
 * This helps when the package isn't available via npm
 */
export function ensurePostHogLoaded(callback?: () => void) {
  if (typeof window === 'undefined') return;
  
  // If PostHog is already available, just call the callback
  if ('posthog' in window) {
    if (callback) callback();
    return;
  }
  
  // Otherwise, load it from CDN
  try {
    const existingScript = document.getElementById('posthog-script');
    if (existingScript) {
      if (callback) callback();
      return;
    }
    
    console.log('[Analytics] Loading PostHog from CDN...');
    
    // Create a mock posthog object to use while loading
    // @ts-ignore
    window.posthog = {
      capture: (event: string, properties?: Record<string, any>) => {
        console.log(`[Mock PostHog] Event captured: ${event}`, properties);
      },
      identify: (userId: string | number, properties?: Record<string, any>) => {
        console.log(`[Mock PostHog] User identified: ${userId}`, properties);
      },
      reset: () => {
        console.log('[Mock PostHog] User reset');
      }
    };
    
    const script = document.createElement('script');
    script.id = 'posthog-script';
    // Use a more reliable CDN URL
    script.src = 'https://unpkg.com/posthog-js@latest/dist/posthog.min.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    
    script.onload = () => {
      console.log('[Analytics] PostHog script loaded successfully');
      
      // Initialize PostHog
      const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
      const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
      
      console.log(`[Analytics] Initializing PostHog with host: ${apiHost}`);
      
      try {
        // @ts-ignore
        window.posthog.init(apiKey, {
          api_host: apiHost,
          debug: true,
          capture_pageview: true,
          persistence: 'localStorage',
          loaded: () => {
            console.log('[Analytics] PostHog successfully initialized');
            if (callback) callback();
          }
        });
      } catch (initError) {
        console.error('[Analytics] Failed to initialize PostHog:', initError);
        // Still call the callback to continue app execution
        if (callback) callback();
      }
    };
    
    script.onerror = (error) => {
      console.error('[Analytics] Failed to load PostHog script:', error);
      // Call the callback anyway to continue app execution
      if (callback) callback();
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.error('[Analytics] Failed to load PostHog:', error);
    // Call the callback anyway to continue app execution
    if (callback) callback();
  }
}

/**
 * Track an event with PostHog
 * This function safely accesses the window.posthog object if available
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  ensurePostHogLoaded(() => {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog?.capture(eventName, properties);
      console.log(`[Analytics] Event tracked: ${eventName}`, properties);
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log(`[Analytics] Unable to track event: ${eventName}`);
    }
  });
}

/**
 * Identify a user with PostHog
 * This function safely accesses the window.posthog object if available
 */
export function identifyUser(userId: string | number, properties?: Record<string, any>) {
  if (!userId) return;
  
  ensurePostHogLoaded(() => {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog?.identify(userId, properties);
      console.log(`[Analytics] User identified: ${userId}`, properties);
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log(`[Analytics] Unable to identify user: ${userId}`);
    }
  });
}

/**
 * Reset the current user in PostHog
 * This function safely accesses the window.posthog object if available
 */
export function resetUser() {
  ensurePostHogLoaded(() => {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog?.reset();
      console.log('[Analytics] User reset');
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log('[Analytics] Unable to reset user');
    }
  });
}

/**
 * Track a page view with PostHog
 * This function safely accesses the window.posthog object if available
 */
export function trackPageView(path: string) {
  ensurePostHogLoaded(() => {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog?.capture('$pageview', { path });
      console.log(`[Analytics] Page view tracked: ${path}`);
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log(`[Analytics] Unable to track page view: ${path}`);
    }
  });
}

/**
 * Track an error with PostHog
 * This function safely accesses the window.posthog object if available
 */
export function trackError(errorType: string, errorDetails: Record<string, any>) {
  ensurePostHogLoaded(() => {
    try {
      // @ts-ignore - PostHog is attached to window but TypeScript doesn't know about it
      window.posthog?.capture('error', {
        error_type: errorType,
        ...errorDetails
      });
      console.log(`[Analytics] Error tracked: ${errorType}`, errorDetails);
    } catch (error) {
      // Silently fail if PostHog is not available or fails
      console.log(`[Analytics] Unable to track error: ${errorType}`);
    }
  });
}

/**
 * Initialize analytics system - call this in your main app component
 */
export function initAnalytics() {
  ensurePostHogLoaded(() => {
    console.log('[Analytics] PostHog initialized successfully');
    
    // Track initial page view
    const path = window.location.pathname;
    trackPageView(path);
    
    // Add error tracking
    window.addEventListener('error', (event) => {
      trackError('uncaught_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString()
      });
    });
    
    // Add promise rejection tracking
    window.addEventListener('unhandledrejection', (event) => {
      trackError('unhandled_promise_rejection', {
        reason: event.reason?.toString() || 'Unknown promise rejection reason'
      });
    });
  });
}