/**
 * Simple PostHog integration using direct CDN script 
 */

// Function to load PostHog script
function loadPostHogScript() {
  if (typeof window !== 'undefined' && !window.posthog) {
    // Create and inject the script element
    const script = document.createElement('script');
    script.innerHTML = `
      // PostHog script
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      
      // Initialize PostHog
      posthog.init('${import.meta.env.VITE_POSTHOG_API_KEY}', {
        api_host: '${import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'}',
        capture_pageview: true,
        autocapture: false,
        loaded: function() {
          console.log('PostHog loaded successfully!');
        }
      });
    `;
    document.head.appendChild(script);
    console.log('PostHog script loaded');
  }
}

// Initialize PostHog when this module is imported
if (typeof window !== 'undefined') {
  loadPostHogScript();
}

// Utility functions that safely access the PostHog object
export function trackEvent(eventName, properties = {}) {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(eventName, properties);
    console.log(`Event tracked: ${eventName}`, properties);
  } else {
    console.log(`Would track event: ${eventName}`, properties);
  }
}

export function identifyUser(userId, properties = {}) {
  if (typeof window !== 'undefined' && window.posthog && userId) {
    window.posthog.identify(userId, properties);
    console.log(`User identified: ${userId}`, properties);
  } else {
    console.log(`Would identify user: ${userId}`, properties);
  }
}

export function resetUser() {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.reset();
    console.log('User reset');
  } else {
    console.log('Would reset user');
  }
}

// Export a default object with all methods
export default {
  trackEvent,
  identifyUser,
  resetUser
};