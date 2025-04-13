import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ProfilePage from "@/pages/profile-page";
import MatchesPage from "@/pages/matches-page";
import ConversationPage from "@/pages/conversation-page";
import CallPage from "@/pages/call-page";
import SocketTestPage from "@/pages/socket-test";
import RTCTestPage from "@/pages/rtc-test";
import SimpleRtcTest from "@/pages/simple-rtc-test";
import RtcTestPageOld from "@/pages/rtc-test-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/home" component={HomePage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/matches" component={MatchesPage} />
      <ProtectedRoute path="/conversation/:id" component={ConversationPage} />
      <ProtectedRoute path="/call/:id" component={CallPage} />
      <ProtectedRoute path="/socket-test" component={SocketTestPage} />
      <ProtectedRoute path="/rtc-test" component={RTCTestPage} />
      <ProtectedRoute path="/simple-rtc-test" component={SimpleRtcTest} />
      <ProtectedRoute path="/rtc-test-old" component={RtcTestPageOld} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
