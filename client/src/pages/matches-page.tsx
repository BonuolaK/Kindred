import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/header";
import Footer from "@/components/footer";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Match } from "@shared/schema";
import { MatchCard } from "@/components/match-card";
import { Loader2, Heart, Users, Clock } from "lucide-react";

export default function MatchesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
    enabled: !!user,
  });
  
  // Filter matches based on status
  const filterMatches = (status: string) => {
    if (!matches) return [];
    
    if (status === "all") {
      return matches;
    } else if (status === "active") {
      return matches.filter(match => match.status === "active");
    } else if (status === "pending") {
      return matches.filter(match => match.callScheduled);
    }
    
    return matches;
  };
  
  const filteredMatches = filterMatches(activeTab);
  const matchLimit = user?.isPremium ? 5 : 3;
  const canAddMoreMatches = matches ? matches.filter(m => m.status === "active").length < matchLimit : true;
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-gray-900">
              Your Matches
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.isPremium 
                ? `Premium users can have up to ${matchLimit} active matches` 
                : `You can have up to ${matchLimit} active matches at a time`}
            </p>
          </div>
          
          <Button 
            className="flex items-center gap-2"
            disabled={!canAddMoreMatches}
            onClick={() => navigate("/find-matches")}
          >
            <Users className="h-4 w-4" />
            <span>Find New Matches</span>
          </Button>
        </div>
        
        <Tabs 
          defaultValue="all" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-8"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>All Matches</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>Active</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Scheduled Calls</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <Heart className="h-12 w-12 text-gray-300" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">No Matches Found</h3>
                  <p className="text-gray-600 mb-4">
                    {activeTab === "all" 
                      ? "You don't have any matches yet. Find new matches to start connecting!" 
                      : activeTab === "active" 
                        ? "You don't have any active matches at the moment."
                        : "You don't have any scheduled calls with your matches."}
                  </p>
                  {canAddMoreMatches && (
                    <Button 
                      onClick={() => navigate("/find-matches")}
                      className="w-full"
                    >
                      Find New Matches
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              <span>Premium Features</span>
              {!user?.isPremium && (
                <Badge variant="outline" className="ml-2 text-primary bg-primary/10">
                  Upgrade
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${user?.isPremium ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-semibold mb-2">More Matches</h3>
                <p className="text-gray-600 text-sm">
                  {user?.isPremium 
                    ? "Access to 5 concurrent matches (standard: 3 matches)" 
                    : "Increase your match limit from 3 to 5 active matches"}
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${user?.isPremium ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <PhoneCall className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-semibold mb-2">More Calls</h3>
                <p className="text-gray-600 text-sm">
                  {user?.isPremium 
                    ? "Enjoy 2 calls on day one (standard: 1 call)" 
                    : "Get 2 calls on day one instead of just 1 call"}
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${user?.isPremium ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <Image className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-semibold mb-2">Earlier Photo Reveal</h3>
                <p className="text-gray-600 text-sm">
                  {user?.isPremium 
                    ? "Photos revealed after 2 calls (standard: 3 calls)" 
                    : "See photos after 2 calls instead of waiting for 3 calls"}
                </p>
              </div>
            </div>
            
            {!user?.isPremium && (
              <div className="mt-8 text-center">
                <Button className="w-full md:w-auto">
                  Upgrade to Premium
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      <Footer />
      <MobileNav activeTab="matches" />
    </div>
  );
}
