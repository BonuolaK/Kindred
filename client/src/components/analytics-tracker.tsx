import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { trackEvent, identifyUser, initAnalytics, trackPageView } from '@/lib/analytics';

/**
 * Component that automatically tracks page views and user identity
 * Include this component once in your application's root component
 */
export function AnalyticsTracker() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
    console.log('[AnalyticsTracker] Initialized analytics tracker');
    
    // Send an initial event to confirm the tracker is working
    trackEvent('analytics_tracker_loaded', { 
      timestamp: new Date().toISOString() 
    });
  }, []);
  
  // Track page views when location changes
  useEffect(() => {
    if (location) {
      // Use the dedicated page view function with proper arguments
      trackEvent('page_view', { 
        page: location.split('?')[0],
        full_path: location,
        referrer: document.referrer || 'direct',
        timestamp: new Date().toISOString()
      });
    }
  }, [location]);
  
  // Identify user when they log in
  useEffect(() => {
    if (user?.id) {
      // Log identifying user
      console.log(`[AnalyticsTracker] Identifying user: ${user.id} (${user.username})`);
      
      identifyUser(user.id, {
        username: user.username,
        email: user.email || '',
        profileType: user.profileType || 'basic',
        accountCreated: user.createdAt,
        last_login: new Date().toISOString()
      });
    }
  }, [user?.id]);
  
  // This component doesn't render anything
  return null;
}

export default AnalyticsTracker;