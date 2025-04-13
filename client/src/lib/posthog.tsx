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
        // Always load PostHog from CDN to ensure consistent behavior
        if (typeof window !== 'undefined') {
          // Remove any existing script to avoid duplicates
          const existingScript = document.getElementById('posthog-script');
          if (existingScript) {
            existingScript.remove();
          }
          
          // Include PostHog via CDN
          const script = document.createElement('script');
          script.id = 'posthog-script';
          script.src = 'https://cdn.jsdelivr.net/npm/posthog-js@1.62.1/dist/posthog.min.js';
          script.async = true;
          script.onload = () => {
            // @ts-ignore - PostHog should be available on window after script loads
            if (window.posthog) {
              console.log('PostHog script loaded from CDN');
              
              // Initialize with our key and host
              const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
              const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
              
              console.log(`Initializing PostHog with host: ${apiHost}`);
              
              // @ts-ignore
              window.posthog.init(apiKey, {
                api_host: apiHost,
                debug: true, // Enable debug mode to see what's happening
                capture_pageview: true,
                autocapture: false,
                persistence: 'localStorage',
                loaded: (posthogInstance: any) => {
                  console.log('PostHog successfully loaded and initialized');
                }
              });
              
              // @ts-ignore
              setPostHog(window.posthog);
            } else {
              console.error('PostHog object not available after script load');
            }
          };
          
          script.onerror = (error) => {
            console.error('Failed to load PostHog script:', error);
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