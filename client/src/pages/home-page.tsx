import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import MobileNav from "@/components/mobile-nav";
import Onboarding from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Match } from "@shared/schema";
import { MatchCard } from "@/components/match-card";
import { Loader2, PhoneCall, Heart, MessageCircle, Settings, User, CrownIcon, ArrowUpCircle } from "lucide-react";
import { getMaxMatches, getSubscriptionName, hasReachedMatchLimit } from "@/lib/subscription-limits";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Check if profile is complete to show onboarding if needed
  useEffect(() => {
    if (user) {
      // Check for the needsOnboarding flag from session
      // @ts-ignore - The needsOnboarding flag is added by the server
      if (user.needsOnboarding) {
        setShowOnboarding(true);
        return;
      }
      
      // Also check if profile is incomplete
      if (!user.age || !user.gender || !user.interestedGenders) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
    enabled: !!user && !showOnboarding,
  });

  // Check if user has completed their profile
  const isProfileComplete = user && user.age && user.gender && user.interestedGenders;

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-gray-900">
            Welcome, {user?.name || 'there'}!
          </h1>
          <p className="text-gray-600 mt-1">
            {isProfileComplete 
              ? "Discover meaningful connections through conversation" 
              : "Let's complete your profile to find meaningful connections"}
          </p>
        </div>
        
        {!isProfileComplete ? (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <h2 className="font-heading font-semibold text-xl">Complete Your Profile</h2>
                <p className="text-gray-600 mt-1">
                  Help us find the right matches for you by completing your profile
                </p>
              </div>
              <Button 
                className="w-full"
                onClick={() => navigate("/profile")}
              >
                Complete Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="matches" className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="matches" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span>Matches</span>
              </TabsTrigger>
              <TabsTrigger value="conversations" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>Conversations</span>
              </TabsTrigger>
              <TabsTrigger value="calls" className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4" />
                <span>Scheduled Calls</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="matches" className="mt-6">
              {/* Subscription information */}
              <div className="mb-4 bg-purple-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CrownIcon className="h-5 w-5 text-purple-700" />
                  <div>
                    <h3 className="font-medium">{getSubscriptionName(user?.profileType)}</h3>
                    <p className="text-sm text-gray-600">
                      {matches && matches.length} of {getMaxMatches(user?.profileType)} matches available
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="bg-white"
                  onClick={() => navigate("/profile/subscription")}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : matches && matches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches.map((match) => (
                    <MatchCard key={match.id} match={match} currentUserId={user?.id || 0} />
                  ))}
                  
                  {matches.length < getMaxMatches(user?.profileType) ? (
                    <Card className="flex flex-col items-center justify-center p-6 border-dashed">
                      <Heart className="h-12 w-12 text-gray-300 mb-4" />
                      <h3 className="font-heading font-semibold text-lg mb-2 text-center">Find More Matches</h3>
                      <p className="text-gray-600 mb-4 text-center text-sm">
                        You have {getMaxMatches(user?.profileType) - (matches.length || 0)} matches remaining on your plan
                      </p>
                      <Button 
                        onClick={() => navigate("/matches")}
                        variant="default"
                      >
                        Find Matches
                      </Button>
                    </Card>
                  ) : (
                    <Card className="flex flex-col items-center justify-center p-6 border-dashed">
                      <CrownIcon className="h-12 w-12 text-yellow-400 mb-4" />
                      <h3 className="font-heading font-semibold text-lg mb-2 text-center">Upgrade for More</h3>
                      <p className="text-gray-600 mb-4 text-center text-sm">
                        Upgrade your plan to receive more high-quality matches
                      </p>
                      <Button 
                        onClick={() => navigate("/profile/subscription")}
                        variant="default"
                      >
                        Upgrade Now
                      </Button>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="mb-4 flex justify-center">
                      <Heart className="h-12 w-12 text-gray-300" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-2">No Matches Yet</h3>
                    <p className="text-gray-600 mb-4">
                      We're working on finding your compatible matches based on your profile
                    </p>
                    <Button 
                      onClick={() => navigate("/matches")}
                      className="w-full"
                    >
                      Find Matches
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="conversations" className="mt-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <MessageCircle className="h-12 w-12 text-gray-300" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">No Conversations Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Chat unlocks after completing your first two audio calls with a match
                  </p>
                  <Button 
                    onClick={() => navigate("/matches")}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Matches
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="calls" className="mt-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <PhoneCall className="h-12 w-12 text-gray-300" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">No Scheduled Calls</h3>
                  <p className="text-gray-600 mb-4">
                    Schedule an audio call with one of your matches to get to know them
                  </p>
                  <Button 
                    onClick={() => navigate("/matches")}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Matches
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">How Kindred Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-light/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold mb-2">Get Matched</h3>
                <p className="text-gray-600 text-sm">
                  Our algorithm pairs you with compatible matches based on your profile
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-light/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PhoneCall className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold mb-2">Connect Through Calls</h3>
                <p className="text-gray-600 text-sm">
                  Scheduled audio calls help you build connection gradually
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-light/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold mb-2">Deepen Your Connection</h3>
                <p className="text-gray-600 text-sm">
                  Chat unlocks after 2 calls, and photos reveal after 3 calls
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
      <MobileNav activeTab="home" />
    </div>
  );
}
