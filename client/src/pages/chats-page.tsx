import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Match, User } from "@shared/schema";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import UserAvatar from "@/components/user-avatar";
import { formatDate } from "@/lib/utils";
import { MessageCircleOff, Phone, Lock, MessageCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ChatsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: matches = [], isLoading } = useQuery<(Match & { otherUser: User })[]>({
    queryKey: ["/api/matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error("Failed to fetch matches");
      
      const matchesData = await res.json();
      
      // For each match, fetch the other user's data
      const matchesWithUsers = await Promise.all(
        matchesData.map(async (match: Match) => {
          const otherUserId = match.userId1 === user?.id ? match.userId2 : match.userId1;
          const userRes = await fetch(`/api/users/${otherUserId}`);
          if (!userRes.ok) return { ...match, otherUser: null };
          
          const otherUser = await userRes.json();
          return { ...match, otherUser };
        })
      );
      
      return matchesWithUsers.filter(m => m.otherUser);
    },
    enabled: !!user,
  });

  // Only show matches with unlocked chat
  const chats = matches.filter(match => match.isChatUnlocked === true);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-5xl py-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Your Chats</h1>
                <p className="text-muted-foreground text-sm">
                  Continue your conversations with matches after audio calls
                </p>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="all" className="w-full">
            <div className="flex justify-center mb-4">
              <TabsList>
                <TabsTrigger value="all">All Chats</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>
            </div>
          
            <TabsContent value="all" className="mt-0">
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-background border rounded-lg h-24"></div>
                  ))}
                </div>
              ) : chats.length > 0 ? (
                <div className="space-y-4">
                  {chats.map(chat => (
                    <Card 
                      key={chat.id} 
                      className="cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => navigate(`/conversation/${chat.id}`)}
                    >
                      <CardContent className="p-4 flex items-center">
                        <div className="flex items-center space-x-4 flex-grow">
                          <UserAvatar 
                            user={chat.otherUser} 
                            showPhoto={chat.arePhotosRevealed || false} 
                            size="md" 
                          />
                          <div>
                            <h3 className="font-medium">{chat.otherUser.username}</h3>
                            <p className="text-sm text-muted-foreground">
                              Last active: {formatDate(chat.matchDate)}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="ml-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/conversation/${chat.id}`);
                          }}
                        >
                          <MessageCircle className="h-5 w-5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyChatState 
                  matches={matches}
                  navigate={navigate}
                />
              )}
            </TabsContent>
            
            <TabsContent value="unread" className="mt-0">
              <div className="text-center py-12">
                <MessageCircleOff className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No unread messages</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You've caught up with all your conversations. Check back later for new messages.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}

interface EmptyChatStateProps {
  matches: (Match & { otherUser: User })[];
  navigate: (to: string) => void;
}

function EmptyChatState({ matches, navigate }: EmptyChatStateProps) {
  const hasMatches = matches.length > 0;
  
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6 pb-6 text-center flex flex-col items-center">
        <MessageCircleOff className="h-12 w-12 text-gray-300 mb-4" />
        <CardTitle className="text-xl mb-2">No Chats Available</CardTitle>
        <CardDescription className="mb-6 max-w-md">
          Chats are unlocked after completing your first audio call with a match. This helps build meaningful connections before messaging.
        </CardDescription>

        {hasMatches ? (
          <div className="w-full max-w-md space-y-4">
            <h4 className="font-medium text-sm">Your Matches</h4>
            {matches.slice(0, 3).map(match => (
              <div key={match.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <UserAvatar 
                    user={match.otherUser} 
                    showPhoto={match.arePhotosRevealed || false} 
                    size="sm" 
                  />
                  <span>{match.otherUser.username}</span>
                </div>
                <div className="flex items-center">
                  {match.isChatUnlocked === true ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/conversation/${match.id}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/call/${match.id}`)}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call to Unlock
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {matches.length > 3 && (
              <p className="text-sm text-center text-muted-foreground">
                + {matches.length - 3} more matches
              </p>
            )}
            
            <Separator />
            
            <div className="flex justify-center">
              <Button 
                variant="default" 
                onClick={() => navigate("/matches")}
              >
                View All Matches
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You don't have any matches yet. Find matches to start connecting!
            </p>
            <Button
              variant="default"
              onClick={() => navigate("/matches")}
            >
              Find Matches
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}