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

import ErrorBoundary from "@/components/error-boundary";

export default function CallPage() {
  console.log("Call page component rendering");
  
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInitiating, setIsInitiating] = useState(false);
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
    enabled: !!id && !isNaN(parsedMatchId)
  });
  
  // Create call mutation
  const createCallMutation = useMutation({
    mutationFn: async () => {
      console.log("Creating call for match ID:", parsedMatchId);
      const response = await apiRequest("POST", `/api/matches/${parsedMatchId}/calls`);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Call created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/matches', parsedMatchId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating call",
        description: error.message,
        variant: "destructive"
      });
    }
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
  if (isLoadingMatch || createCallMutation.isPending || !match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">
          {createCallMutation.isPending 
            ? "Setting up call..." 
            : "Loading call information..."}
        </span>
      </div>
    );
  }
  
  // Show error state
  if (matchError || createCallMutation.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-destructive text-xl">Error setting up call</div>
        <p className="text-muted-foreground">
          {createCallMutation.error 
            ? "Failed to create call. Please try again later." 
            : "Could not load match information. Please try again."}
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
  
  // Temporary simplified view for debugging
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
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Call with {match.otherUser?.username || 'Match'}</h2>
          <div className="text-center mb-4">
            <p>Match ID: {match.id}</p>
            <p>Call count: {match.callCount}</p>
            <p>Your ID: {user?.id}</p>
            <p>Other user ID: {match.otherUser?.id}</p>
          </div>
          
          <div className="flex justify-center mt-4">
            <button
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => setLocation(`/matches`)}
            >
              End Call (Debug)
            </button>
          </div>
        </div>
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