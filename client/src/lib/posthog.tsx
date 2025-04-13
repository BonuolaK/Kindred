import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';

// Create a type definition for the PostHog object to avoid needing the actual library
// This will be populated when the library is properly installed
type PostHogType = {
  capture: (event: string, properties?: Record<string, any>) => void;
  identify: (distinctId: string | number, properties?: Record<string, any>) => void;
  reset: () => void;
};

// Create a context to provide PostHog instance throughout the app
interface PostHogContextType {
  posthog: PostHogType | null;
}

const PostHogContext = createContext<PostHogContextType>({ posthog: null });

interface PostHogProviderProps {
  children: React.ReactNode;
}

// This provider will initialize PostHog when the library is loaded
export const PostHogProvider: React.FC<PostHogProviderProps> = ({ children }) => {
  const [posthog, setPostHog] = useState<PostHogType | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    // This function will be called when the component mounts
    const initPostHog = async () => {
      try {
        // When posthog-js is properly installed, this import will work
        const posthogModule = await import('posthog-js');
        const posthogInstance = posthogModule.default;

        // Initialize PostHog with your project API key
        posthogInstance.init(import.meta.env.VITE_POSTHOG_API_KEY, {
          api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
          // Enable debug mode in development
          debug: import.meta.env.DEV,
          // Only capture events in production by default
          capture_pageview: import.meta.env.PROD,
          // Disable autocapture to reduce noise
          autocapture: false,
          // Don't use cookies if they're not needed
          disable_cookie: true,
          // Save memory by persisting events only in localStorage
          persistence: 'localStorage'
        });

        setPostHog(posthogInstance);
      } catch (error) {
        console.error('Failed to initialize PostHog:', error);
      }
    };

    if (!posthog) {
      initPostHog();
    }
  }, []);

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