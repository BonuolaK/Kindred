import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { trackEvent, identifyUser } from '@/lib/analytics';

/**
 * Component that automatically tracks page views and user identity
 * Include this component once in your application's root component
 */
export function AnalyticsTracker() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Track page views when location changes
  useEffect(() => {
    if (location) {
      trackEvent('$pageview', { path: location });
    }
  }, [location]);
  
  // Identify user when they log in
  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, {
        username: user.username,
        email: user.email,
        profile_type: user.profile_type,
        account_created: user.created_at
      });
    }
  }, [user?.id]);
  
  // This component doesn't render anything
  return null;
}

export default AnalyticsTracker;