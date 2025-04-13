// Direct PostHog integration for reliable analytics
import { useState, useEffect } from 'react';

// Using the direct API key provided by user
const API_KEY = 'phc_1cg15kdbDfKi50My4h4AvT77euT7xtIMxUZe7rqks9P';
const API_HOST = 'https://us.i.posthog.com';

// Log the configuration
console.log('[PostHog] Using Direct Configuration:');
console.log(' - Host:', API_HOST);
console.log(' - API Key:', `${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 4)}`);

// Direct PostHog integration function
function initPostHog() {
  if (typeof window === 'undefined') return;
  
  // Clean up existing posthog if any
  if (window.posthog) {
    console.log('[PostHog] Cleaning up existing instance');
    window.posthog.reset();
    window.posthog = undefined;
  }
  
  console.log('[PostHog] Loading script from CDN');
  
  // Load the PostHog script directly from CDN
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/posthog-js@1.57.2/dist/posthog.min.js';
  script.async = true;
  script.onload = initializePostHog;
  script.onerror = () => {
    console.error('[PostHog] Failed to load script');
    // Try alternative CDN
    const fallbackScript = document.createElement('script');
    fallbackScript.src = 'https://unpkg.com/posthog-js@1.57.2/dist/posthog.min.js';
    fallbackScript.async = true;
    fallbackScript.onload = initializePostHog;
    fallbackScript.onerror = () => console.error('[PostHog] All CDN attempts failed');
    document.head.appendChild(fallbackScript);
  };
  
  // Add script to document
  document.head.appendChild(script);
  
  // Function that initializes PostHog after script loads
  function initializePostHog() {
    console.log('[PostHog] Script loaded, initializing...');
    
    if (!API_KEY) {
      console.error('[PostHog] No API key available. PostHog will not be initialized.');
      return;
    }
    
    try {
      const initOptions = {
        api_host: API_HOST,
        loaded: (posthog) => {
          console.log('[PostHog] Successfully loaded and initialized');
          // Send a test event immediately
          posthog.capture('test_event', {
            timestamp: new Date().toISOString(),
            test_property: 'this is a test event',
            url: window.location.href
          });
        },
        capture_pageview: false, // We'll handle this manually
        debug: true // Enable debug mode for troubleshooting
      };
      
      console.log('[PostHog] Initializing with options:', initOptions);
      
      window.posthog.init(API_KEY, initOptions);
      
      // If we get here, it seems to have initialized properly
      console.log('[PostHog] Init function completed successfully');
      
      // Extra check to ensure it's working
      setTimeout(() => {
        if (window.posthog && typeof window.posthog.capture === 'function') {
          console.log('[PostHog] Verified capture function exists');
          window.posthog.capture('delayed_test', { delay: '500ms' });
        } else {
          console.error('[PostHog] Verification failed - posthog object may be incomplete');
        }
      }, 500);
      
    } catch (error) {
      console.error('[PostHog] Failed to initialize:', error);
    }
  }
}

// Initialize when this file is imported
if (typeof window !== 'undefined') {
  initPostHog();
}

// Helper to safely get posthog
function getPostHog() {
  if (typeof window === 'undefined') return null;
  return window.posthog;
}

// PostHog API
export const PostHog = {
  // Track an event
  capture: (eventName, properties = {}) => {
    const posthog = getPostHog();
    if (!posthog) {
      console.warn(`[PostHog] Can't capture event ${eventName}: PostHog not loaded`);
      return;
    }
    
    try {
      console.log(`[PostHog] Capturing event: ${eventName}`, properties);
      // Add timestamp if not provided
      if (!properties.timestamp) {
        properties.timestamp = new Date().toISOString();
      }
      posthog.capture(eventName, properties);
    } catch (error) {
      console.error(`[PostHog] Error capturing ${eventName}:`, error);
    }
  },
  
  // Identify a user
  identify: (userId, properties = {}) => {
    const posthog = getPostHog();
    if (!posthog || !userId) {
      console.warn(`[PostHog] Can't identify user ${userId}: PostHog not loaded or no userId`);
      return;
    }
    
    try {
      console.log(`[PostHog] Identifying user: ${userId}`, properties);
      posthog.identify(userId.toString(), properties);
    } catch (error) {
      console.error(`[PostHog] Error identifying user ${userId}:`, error);
    }
  },
  
  // Reset the user
  reset: () => {
    const posthog = getPostHog();
    if (!posthog) {
      console.warn('[PostHog] Can\'t reset user: PostHog not loaded');
      return;
    }
    
    try {
      console.log('[PostHog] Resetting user');
      posthog.reset();
    } catch (error) {
      console.error('[PostHog] Error resetting user:', error);
    }
  },
  
  // Page view
  capturePageView: (url) => {
    const posthog = getPostHog();
    if (!posthog) {
      console.warn(`[PostHog] Can't capture page view for ${url}: PostHog not loaded`);
      return;
    }
    
    try {
      console.log(`[PostHog] Capturing page view: ${url}`);
      posthog.capture('$pageview', { 
        current_url: url,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[PostHog] Error capturing page view for ${url}:`, error);
    }
  }
};

// React hook for using PostHog in components
export function usePostHog() {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (window.posthog) {
      setReady(true);
    } else {
      const checkInterval = setInterval(() => {
        if (window.posthog) {
          console.log('[PostHog] Hook detected PostHog is ready');
          setReady(true);
          clearInterval(checkInterval);
        }
      }, 100);
      
      return () => clearInterval(checkInterval);
    }
  }, []);
  
  return {
    ready,
    ...PostHog
  };
}

export default PostHog;