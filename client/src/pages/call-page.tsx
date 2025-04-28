import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import CallInterface from "@/components/call-interface";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Match, User } from "@shared/schema";

import SimpleCallInterface from "@/components/simple-call-interface";
import { RtcTestCallUI } from "@/components/RtcTestCallUI";
import ErrorBoundary from "@/components/error-boundary";

export default function CallPage() {
  console.log("Call page component rendering");
  
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const parsedMatchId = parseInt(id || "0", 10);
  
  // Define a proper type for matchDetails including strong typing for otherUser
  type MatchWithOtherUser = Match & { 
    otherUser: { 
      id: number; 
      username: string; 
      name?: string;
      avatar?: string;
      [key: string]: any;
    } 
  };
  
  const [matchDetails, setMatchDetails] = useState<MatchWithOtherUser>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Debug output
  console.log("Call page loaded with id:", id, "parsed as:", parsedMatchId);
  
  useEffect(() => {
    // Directly fetch the match details without React Query
    async function fetchMatchDetails() {
      if (!parsedMatchId || !user) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/matches/${parsedMatchId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch match: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Direct API response:", data);
        
        setMatchDetails(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching match:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    }
    
    fetchMatchDetails();
    
    // Set up refresh interval
    const intervalId = setInterval(() => {
      fetchMatchDetails();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [parsedMatchId, user]);
  
  // Handle call ended
  const handleCallEnded = () => {
    toast({
      title: "Call Ended",
      description: "Your call has ended. Redirecting to matches...",
      variant: "default"
    });
    
    // Redirect to match page after call ends
    setTimeout(() => {
      setLocation(`/matches`);
    }, 2000);
  };
  
  // Show loading state
  if (isLoading || !matchDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading call information...</span>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-destructive text-xl">Error setting up call</div>
        <p className="text-muted-foreground">
          Could not load match information. Please try again.
        </p>
        <button
          className="mt-4 bg-primary text-white px-4 py-2 rounded"
          onClick={() => setLocation(`/matches`)}
        >
          Return to Matches
        </button>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <button
          className="text-primary hover:underline flex items-center"
          onClick={() => setLocation(`/matches`)}
        >
          &larr; Back to Matches
        </button>
      </div>
      
      <h1 className="text-3xl font-bold text-center mb-8">Audio Call</h1>
      
      <ErrorBoundary>
        {user && matchDetails.otherUser && (
          <div className="flex justify-center items-center">
            <div className="bg-white shadow-lg rounded-lg p-6 mb-6 max-w-md w-full">
              {/* 
                Ensure we're using the correct user ID for the other user
                Verify by adding extra logging before rendering component 
              */}
              {(() => {
                console.log('[CALL-PAGE] Rendering RtcTestCallUI with matchDetails:', 
                  { 
                    matchId: matchDetails.id,
                    otherUserId: matchDetails.otherUser.id,
                    otherUserName: matchDetails.otherUser.username,
                    callDay: matchDetails.callCount + 1 
                  }
                );
                
                // Double check that the user IDs look correct
                const currentUserId = user.id;
                const otherUserId = matchDetails.otherUser.id;
                
                console.log(`[CALL-PAGE] Current user: ${user.username} (${currentUserId}), Other user: ${matchDetails.otherUser.username} (${otherUserId})`);
                
                return (
                  <RtcTestCallUI
                    matchId={matchDetails.id}
                    otherUserId={otherUserId}
                    otherUserName={matchDetails.otherUser.username || 'Your Match'}
                    otherUser={{
                      id: otherUserId,
                      username: matchDetails.otherUser.username,
                      avatar: matchDetails.otherUser.avatar || undefined
                    }}
                    callDay={matchDetails.callCount + 1}
                    onClose={handleCallEnded}
                    arePhotosRevealed={matchDetails.arePhotosRevealed ? true : false}
                    autoStart={true}
                  />
                );
              })()}
              
              {/* Display debug info for troubleshooting */}
              <div className="mt-6 text-xs border-t pt-4 text-muted-foreground">
                <p className="font-semibold">Debug Info:</p>
                <p>Match ID: {matchDetails.id}</p>
                <p>Other User ID: {matchDetails.otherUser.id}</p>
                <p>Call Day: {matchDetails.callCount + 1}</p>
                <p>Current User: {user.username} (ID: {user.id})</p>
              </div>
            </div>
          </div>
        )}
      </ErrorBoundary>
      
      <div className="mt-8 text-center text-muted-foreground">
        <p>Calls are limited based on how many you've had with this match:</p>
        <ul className="list-disc list-inside mt-2 inline-block text-left">
          <li>First call: 5 minutes</li>
          <li>Second call: 10 minutes</li>
          <li>Third call and beyond: 20 minutes</li>
        </ul>
        <p className="mt-4">
          After your second call, message functionality will be unlocked.<br />
          After your third call, photos will be revealed.
        </p>
      </div>
    </div>
  );
}