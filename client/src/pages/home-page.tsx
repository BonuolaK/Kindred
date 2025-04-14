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
  const { toast } = useToast();
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
      
      // Also check if profile is incomplete based on required fields
      if (!user.age || !user.gender || !user.interestedGenders || !user.location || !user.bio) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
    enabled: !!user && !showOnboarding,
  });
  
  // Generate matches mutation
  const generateMatchesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/generate-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) throw new Error('Failed to generate matches');
      return res.json();
    },
    onSuccess: (data) => {
      // Show appropriate toast message based on response
      if (data.newMatches && data.newMatches.length > 0) {
        toast({
          title: "New Matches Found!",
          description: `Found ${data.newMatches.length} new match${data.newMatches.length > 1 ? 'es' : ''} for you.`,
        });
      } else {
        toast({
          title: "No New Matches",
          description: "Our system is searching for your perfect match. Check back soon!",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: () => {
      toast({
        title: "Error Finding Matches",
        description: "There was an issue finding new matches. Please try again later.",
        variant: "destructive",
      });
    }
  });

  // Check if user has completed their profile (all required fields)
  const isProfileComplete = user && 
    user.age && 
    user.gender && 
    user.interestedGenders && 
    user.interestedGenders.length > 0 && 
    user.location && 
    user.bio;

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
                className="w-full bg-[#9B1D54] hover:bg-[#9B1D54]/90 text-white"
                onClick={() => navigate("/profile")}
              >
                Complete Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-8">
            {/* Subscription information */}
            <div className="mb-6 bg-purple-50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CrownIcon className="h-5 w-5 text-[#9B1D54]" />
                <div>
                  <h3 className="font-medium">{getSubscriptionName(user?.profileType)}</h3>
                  <p className="text-sm text-gray-600">
                    {matches?.length || 0} of {getMaxMatches(user?.profileType)} matches 
                    {user?.profileType === 'elite' ? '' : ' available'}
                  </p>
                </div>
              </div>
              
              {user?.profileType !== 'elite' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="bg-white hover:bg-gray-50 border-[#9B1D54] text-[#9B1D54]"
                  onClick={() => navigate("/profile/subscription")}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              )}
            </div>
            
            {/* Find Matches Button */}
            <div className="mb-6 flex justify-center">
              <Button 
                onClick={() => generateMatchesMutation.mutate()}
                disabled={
                  generateMatchesMutation.isPending || 
                  (matches && hasReachedMatchLimit(matches.length, user?.profileType))
                }
                className="w-full max-w-lg py-6 h-auto bg-[#9B1D54] hover:bg-[#9B1D54]/90 text-white"
                size="lg"
              >
                {generateMatchesMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Finding Matches...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Find New Matches
                  </span>
                )}
              </Button>
            </div>
            
            {/* Matches Grid */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#9B1D54]" />
              </div>
            ) : matches && matches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} currentUserId={user?.id || 0} />
                ))}
                
                {/* Show upgrade card only if not elite and reached limit */}
                {user?.profileType !== 'elite' && matches.length >= getMaxMatches(user?.profileType) && (
                  <Card className="flex flex-col items-center justify-center p-6 border-dashed">
                    <CrownIcon className="h-12 w-12 text-yellow-400 mb-4" />
                    <h3 className="font-heading font-semibold text-lg mb-2 text-center">Upgrade for More</h3>
                    <p className="text-gray-600 mb-4 text-center text-sm">
                      Upgrade your plan to receive more high-quality matches
                    </p>
                    <Button 
                      onClick={() => navigate("/profile/subscription")}
                      variant="default"
                      className="bg-[#9B1D54] hover:bg-[#9B1D54]/90 text-white"
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
                    Our system is searching for your perfect match. Check back soon!
                  </p>
                  <Button 
                    onClick={() => generateMatchesMutation.mutate()}
                    disabled={generateMatchesMutation.isPending}
                    className="w-full bg-[#9B1D54] hover:bg-[#9B1D54]/90 text-white"
                  >
                    {generateMatchesMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finding Matches...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Find Matches
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
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
                  Chats are unlocked after your first call
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
