// Simple PostHog client for analytics
import { useState, useEffect } from 'react';

// Constants
// Extract the actual API key from the environment variable
const rawApiKey = import.meta.env.VITE_POSTHOG_API_KEY || '';
const API_KEY = rawApiKey.includes('=') ? 
  rawApiKey.split('=')[1].trim() : 
  rawApiKey.trim();
const API_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

// Debug info
console.log('[PostHog] Initializing with host:', API_HOST);
console.log('[PostHog] API Key length:', API_KEY ? API_KEY.length : 0);

// Helper function to safely get PostHog from window
function getPostHog() {
  return window.posthog;
}

// Load PostHog script
function loadPostHogScript() {
  // Only load in browser environment
  if (typeof window === 'undefined') return;
  
  // Don't load if already loaded
  if (window.posthog) return;
  
  // Create script tag
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/posthog-js@1.62.1/dist/posthog.min.js';
  script.async = true;
  
  // When script loads, initialize PostHog
  script.onload = () => {
    window.posthog.init(API_KEY, {
      api_host: API_HOST,
      capture_pageview: true
    });
  };
  
  // Add script to document
  document.head.appendChild(script);
}

// Initialize PostHog when this file is imported
if (typeof window !== 'undefined') {
  loadPostHogScript();
}

// Analytics API
export const PostHog = {
  // Track an event
  capture: (eventName, properties) => {
    const posthog = getPostHog();
    if (posthog) {
      posthog.capture(eventName, properties);
    }
  },
  
  // Identify a user
  identify: (userId, properties) => {
    const posthog = getPostHog();
    if (posthog && userId) {
      posthog.identify(userId, properties);
    }
  },
  
  // Reset the user
  reset: () => {
    const posthog = getPostHog();
    if (posthog) {
      posthog.reset();
    }
  }
};

// React hook for using PostHog in components
export function usePostHog() {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    // Check if PostHog is loaded
    if (window.posthog) {
      setReady(true);
    } else {
      // Set up an interval to check for PostHog
      const interval = setInterval(() => {
        if (window.posthog) {
          setReady(true);
          clearInterval(interval);
        }
      }, 100);
      
      // Clean up
      return () => clearInterval(interval);
    }
  }, []);
  
  return {
    ready,
    ...PostHog
  };
}

// Export PostHog as default
export default PostHog;