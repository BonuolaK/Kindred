import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import AnalyticsTracker from "./components/analytics-tracker";
import { initAnalytics, trackEvent } from "./lib/analytics";
import { useEffect } from "react";
// Add PostHog interface to window object
declare global {
  interface Window {
    posthog?: any;
  }
}
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ProfilePage from "@/pages/profile-page";
import MatchesPage from "@/pages/matches-page";
import ChatsPage from "@/pages/chats-page";
import ConversationPage from "@/pages/conversation-page";
import CallPage from "@/pages/call-page";
import SocketTestPage from "@/pages/socket-test";
import RTCTestPage from "@/pages/rtc-test";
import SimpleRtcTest from "@/pages/simple-rtc-test";
import MatchCallTest from "@/pages/match-call-test";
import SimpleWsTest from "@/pages/simple-ws-test";
import WebSocketDiagnostics from "@/pages/websocket-diagnostics";
import DebugMatches from "@/pages/debug-matches";
import RtcTestPageOld from "@/pages/rtc-test-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import MatchCall from "@/pages/match-call";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/home" component={HomePage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/profile/subscription" component={ProfilePage} />
      <ProtectedRoute path="/matches" component={MatchesPage} />
      <ProtectedRoute path="/chats" component={ChatsPage} />
      <ProtectedRoute path="/conversation/:id" component={ConversationPage} />
      <ProtectedRoute path="/call/:id" component={CallPage} />
      <ProtectedRoute path="/debug-matches" component={DebugMatches} />
      <ProtectedRoute path="/socket-test" component={SocketTestPage} />
      <ProtectedRoute path="/rtc-test" component={RTCTestPage} />
      <ProtectedRoute path="/simple-rtc-test" component={SimpleRtcTest} />
      <ProtectedRoute path="/match-call-test" component={MatchCallTest} />
      <ProtectedRoute path="/match-call" component={MatchCall} />
      <Route path="/simple-ws-test" component={SimpleWsTest} />
      <Route path="/ws-diagnostics" component={WebSocketDiagnostics} />
      <ProtectedRoute path="/rtc-test-old" component={RtcTestPageOld} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AnalyticsInitializer() {
  useEffect(() => {
    try {
      // Initialize analytics system
      console.log('[App] Initializing analytics in App component');
      initAnalytics();
      
      // Send a test event through our analytics API
      console.log('[App] Sending test event');
      trackEvent('app_initialized', { 
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      
      // Try direct PostHog access to verify library loading
      if (typeof window !== 'undefined') {
        // Set up an interval to try multiple times to catch when PostHog is loaded
        const interval = setInterval(() => {
          if (window.posthog) {
            console.log('[App] Direct PostHog found in window, sending test');
            window.posthog.capture('direct_test_from_app', {
              timestamp: new Date().toISOString(),
              page: window.location.pathname,
              method: 'direct_window_access'
            });
            clearInterval(interval);
          }
        }, 500);
        
        // Clean up interval after 10 seconds (20 attempts)
        setTimeout(() => clearInterval(interval), 10000);
      }
    } catch (error) {
      console.error('[App] Error initializing analytics:', error);
    }
  }, []);
  
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnalyticsInitializer />
        <AnalyticsTracker />
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
