import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAudioCall } from "@/hooks/use-audio-call";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import CallInterface from "@/components/call-interface";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Match } from "@shared/schema";

import SimpleCallInterface from "@/components/simple-call-interface";
import { AudioCallUI } from "@/components/AudioCallUI";
import ErrorBoundary from "@/components/error-boundary";

export default function CallPage() {
  console.log("Call page component rendering");
  
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const parsedMatchId = parseInt(id || "0", 10);
  
  // Debug output
  console.log("Call page loaded with id:", id, "parsed as:", parsedMatchId);
  
  // Get match data
  const { 
    data: match, 
    isLoading: isLoadingMatch,
    error: matchError
  } = useQuery<Match & { otherUser?: any }>({
    queryKey: ['/api/matches', parsedMatchId],
    enabled: !!id && !isNaN(parsedMatchId),
    refetchInterval: 5000 // Refresh data every 5 seconds
  });
  
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
  if (isLoadingMatch || !match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading call information...</span>
      </div>
    );
  }
  
  // Show error state
  if (matchError) {
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
        {user && match.otherUser && (
          <div className="flex justify-center items-center">
            {/* Using the new WebSocket-based AudioCallUI component */}
            <AudioCallUI
              matchId={match.id}
              otherUserId={match.otherUser.id}
              otherUserName={match.otherUser.username || 'Your Match'}
              callDay={match.callCount + 1}
              onClose={handleCallEnded}
            />
            
            {/* Legacy SimpleCallInterface component - can be removed once AudioCallUI is fully tested */}
            {/* <SimpleCallInterface 
              match={match} 
              userId={user.id}
              onCallEnded={handleCallEnded}
            /> */}
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