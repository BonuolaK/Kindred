import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  trackEvent, 
  identifyUser, 
  initAnalytics, 
  trackPageView, 
  ANALYTICS_EVENTS 
} from '@/lib/analytics';

/**
 * Component that automatically tracks page views and user identity
 * Include this component once in your application's root component
 */
export function AnalyticsTracker() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Initialize analytics on mount
  useEffect(() => {
    try {
      // Initialize the analytics system
      initAnalytics();
      console.log('[AnalyticsTracker] Initialized analytics tracker');
      
      // Track an initial event for app startup
      trackEvent('app_initialized', { 
        timestamp: new Date().toISOString(),
        url: window.location.href,
        app: 'kindred',
        env: import.meta.env.MODE || 'development'
      });
      
      // Track initial landing page view
      trackEvent('view_landing_page', { 
        source: 'landing',
        timestamp: new Date().toISOString(),
        app: 'kindred',
        env: import.meta.env.MODE || 'development'
      });
    } catch (error) {
      // Even if analytics fail, the app will continue working
      console.error('[AnalyticsTracker] Error initializing:', error);
    }
    
    // Clean up analytics on unmount if needed
    return () => {
      // No cleanup needed in this implementation
    };
  }, []);
  
  // Track page views when location changes
  useEffect(() => {
    if (location) {
      try {
        // Track page view using the standard PostHog event
        trackPageView(location);
        
        // Get the page name from the location
        const pageName = location.split('/')[1] || 'home';
        
        // Track custom page view events for specific pages
        // These can be used for more detailed analytics in PostHog
        switch (pageName) {
          case 'home':
            trackEvent(ANALYTICS_EVENTS.PAGE_HOME_VIEWED);
            break;
          case 'matches':
            trackEvent(ANALYTICS_EVENTS.PAGE_MATCHES_VIEWED);
            break;
          case 'chats':
            trackEvent(ANALYTICS_EVENTS.PAGE_CHATS_VIEWED);
            break;
          case 'profile':
            if (location.includes('subscription')) {
              trackEvent(ANALYTICS_EVENTS.PAGE_SUBSCRIPTION_VIEWED);
            } else {
              trackEvent(ANALYTICS_EVENTS.PAGE_PROFILE_VIEWED);
            }
            break;
        }
      } catch (error) {
        console.error('[AnalyticsTracker] Error tracking page view:', error);
      }
    }
  }, [location]);
  
  // Identify user when they log in
  useEffect(() => {
    if (user?.id) {
      try {
        // Log identifying user
        console.log(`[AnalyticsTracker] Identifying user: ${user.id} (${user.username})`);
        
        // First identify with basic info
        identifyUser(user.id, {
          username: user.username,
          email: user.email || '',
          app: 'kindred',
          env: import.meta.env.MODE || 'development'
        });
        
        // Then add more detail in a separate identify call
        identifyUser(user.id, {
          username: user.username,
          email: user.email || '',
          profile_type: user.profileType || 'basic',
          account_created: user.createdAt,
          app: 'kindred',
          env: import.meta.env.MODE || 'development'
        });
      } catch (error) {
        console.error('[AnalyticsTracker] Error identifying user:', error);
      }
    }
  }, [user?.id]);
  
  // This component doesn't render anything
  return null;
}

export default AnalyticsTracker;