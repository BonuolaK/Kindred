import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import CallInterface from "@/components/call-interface";
import { Loader2, WifiOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Match, User } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import SimpleCallInterface from "@/components/simple-call-interface";
import { RtcTestCallUI } from "@/components/RtcTestCallUI";
import ErrorBoundary from "@/components/error-boundary";

export default function CallPage() {
  console.log("Call page component rendering");
  
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isUserOnline, isConnectedToStatusService } = useOnlineStatus();
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
  const [isTargetUserOnline, setIsTargetUserOnline] = useState(false);
  
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
        
        // Check if the matched user is online
        if (data.otherUser?.id) {
          const online = isUserOnline(data.otherUser.id);
          console.log(`[CALL-PAGE] User ${data.otherUser.username} (${data.otherUser.id}) online status:`, online);
          setIsTargetUserOnline(online);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching match:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    }
    
    fetchMatchDetails();
    
    // Set up refresh interval - check for both match details and online status
    const intervalId = setInterval(() => {
      fetchMatchDetails();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [parsedMatchId, user, isUserOnline]);
  
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
                    callDay: matchDetails.callCount + 1,
                    isTargetUserOnline: isTargetUserOnline
                  }
                );
                
                // Double check that the user IDs look correct
                const currentUserId = user.id;
                const otherUserId = matchDetails.otherUser.id;
                
                console.log(`[CALL-PAGE] Current user: ${user.username} (${currentUserId}), Other user: ${matchDetails.otherUser.username} (${otherUserId}), Online: ${isTargetUserOnline}`);
                
                // If the target user is offline, show an error message instead of the call UI
                if (!isTargetUserOnline) {
                  return (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <WifiOff className="h-4 w-4 mr-2" />
                        <AlertTitle>User is offline</AlertTitle>
                        <AlertDescription>
                          {matchDetails.otherUser.username} is currently offline and cannot receive calls.
                          Please try again when they are online.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex flex-col items-center gap-3 mt-6">
                        <p className="text-center text-muted-foreground">
                          You can try again later or return to your matches
                        </p>
                        <Button onClick={() => setLocation('/matches')}>
                          Return to Matches
                        </Button>
                      </div>
                    </div>
                  );
                }
                
                // Otherwise, render the normal call UI
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
                    autoStart={isTargetUserOnline} // Only auto-start if the user is online
                  />
                );
              })()}
              
              {/* Display debug info for troubleshooting */}
              <div className="mt-6 text-xs border-t pt-4 text-muted-foreground">
                <p className="font-semibold">Debug Info:</p>
                <p>Match ID: {matchDetails.id}</p>
                <p>Other User: {matchDetails.otherUser.username} (ID: {matchDetails.otherUser.id})</p>
                <p>Other User Online: {isTargetUserOnline ? '✅ Yes' : '❌ No'}</p>
                <p>Call Day: {matchDetails.callCount + 1}</p>
                <p>Current User: {user.username} (ID: {user.id})</p>
                <p>WebSocket Status: {isConnectedToStatusService ? '✅ Connected' : '❌ Disconnected'}</p>
                <p>Photos Revealed: {matchDetails.arePhotosRevealed ? '✅ Yes' : '❌ No'}</p>
                <div className="mt-2">
                  <p className="font-semibold">Call History:</p>
                  <p>Total Calls: {matchDetails.callCount || 0}</p>
                  {matchDetails.lastCallDate && <p>Last Call: {new Date(matchDetails.lastCallDate).toLocaleString()}</p>}
                </div>
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