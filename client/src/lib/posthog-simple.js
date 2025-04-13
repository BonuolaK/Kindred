// Simple PostHog integration
import posthog from 'posthog-js';

// Get the API key and host from environment variables
const API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const API_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

// Initialize PostHog
if (API_KEY) {
  posthog.init(API_KEY, {
    api_host: API_HOST,
    loaded: function(posthog) {
      console.log('PostHog loaded successfully');
    },
    autocapture: false,
    capture_pageview: true,
    persistence: 'localStorage',
    debug: true
  });
} else {
  console.error('PostHog API key not found');
}

// Export the initialized instance
export default posthog;