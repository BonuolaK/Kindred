import { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'wouter';
import posthogCdn, { trackEvent, identifyUser, resetUser } from './posthog-cdn';

// Create a context for PostHog
const PostHogContext = createContext(posthogCdn);

// Provider component
export function PostHogProvider({ children }) {
  const [location] = useLocation();
  
  // Track page views when location changes
  useEffect(() => {
    if (location) {
      trackEvent('$pageview', { path: location });
    }
  }, [location]);

  return (
    <PostHogContext.Provider value={posthogCdn}>
      {children}
    </PostHogContext.Provider>
  );
}

// Hook to use PostHog
export function usePostHog() {
  return useContext(PostHogContext);
}

// Export functions for direct use
export { trackEvent, identifyUser, resetUser };

// Export default
export default PostHogProvider;