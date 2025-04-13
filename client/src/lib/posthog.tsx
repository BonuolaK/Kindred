import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';

// Create a type definition for the PostHog object
type PostHogType = {
  capture: (event: string, properties?: Record<string, any>) => void;
  identify: (distinctId: string | number, properties?: Record<string, any>) => void;
  reset: () => void;
};

// Create a mock PostHog implementation that will be used if the real one isn't available
const createMockPostHog = (): PostHogType => {
  return {
    capture: (event, properties) => {
      console.log(`[Mock PostHog] Event captured: ${event}`, properties);
    },
    identify: (userId, properties) => {
      console.log(`[Mock PostHog] User identified: ${userId}`, properties);
    },
    reset: () => {
      console.log('[Mock PostHog] User reset');
    }
  };
};

// Create a context to provide PostHog instance throughout the app
interface PostHogContextType {
  posthog: PostHogType;
}

// Initialize with mock implementation
const PostHogContext = createContext<PostHogContextType>({ posthog: createMockPostHog() });

interface PostHogProviderProps {
  children: React.ReactNode;
}

// This provider will initialize PostHog if available, or use the mock implementation
export const PostHogProvider: React.FC<PostHogProviderProps> = ({ children }) => {
  const [posthog, setPostHog] = useState<PostHogType>(createMockPostHog());
  const [location] = useLocation();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only try to initialize once
    if (initialized) return;
    
    const initPostHog = () => {
      try {
        // Check if PostHog is available globally - this approach doesn't rely on imports
        if (typeof window !== 'undefined') {
          // Include PostHog via CDN as a fallback if not installed via npm
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/posthog-js@latest/dist/posthog.min.js';
          script.async = true;
          script.onload = () => {
            // @ts-ignore - PostHog should be available on window after script loads
            if (window.posthog) {
              // @ts-ignore
              window.posthog.init(import.meta.env.VITE_POSTHOG_API_KEY, {
                api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
                debug: import.meta.env.DEV,
                capture_pageview: true,
                autocapture: false,
                persistence: 'localStorage'
              });
              
              // @ts-ignore
              setPostHog(window.posthog);
              console.log('PostHog initialized via CDN');
            }
          };
          document.head.appendChild(script);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize PostHog:', error);
      }
    };

    initPostHog();
  }, [initialized]);

  // Track page views when location changes
  useEffect(() => {
    if (posthog && location) {
      posthog.capture('$pageview', { path: location });
    }
  }, [posthog, location]);

  return (
    <PostHogContext.Provider value={{ posthog }}>
      {children}
    </PostHogContext.Provider>
  );
};

// Custom hook to access PostHog
export const usePostHog = () => {
  const context = useContext(PostHogContext);
  if (context === undefined) {
    throw new Error('usePostHog must be used within a PostHogProvider');
  }
  return context.posthog;
};

// Analytics event tracking helper functions
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  const posthog = usePostHog();
  if (posthog) {
    posthog.capture(eventName, properties);
  }
};

export const identifyUser = (userId: string | number, properties?: Record<string, any>) => {
  const posthog = usePostHog();
  if (posthog && userId) {
    posthog.identify(userId, properties);
  }
};

export const resetUser = () => {
  const posthog = usePostHog();
  if (posthog) {
    posthog.reset();
  }
};