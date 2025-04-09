import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAudioCall } from "@/hooks/use-audio-call";
import { useAuth } from "@/hooks/use-auth";
import CallInterface from "@/components/call-interface";
import { Loader2 } from "lucide-react";

export default function CallPage() {
  const [, setLocation] = useLocation();
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const [isInitiating, setIsInitiating] = useState(false);
  
  // Get match data
  const { 
    data: match, 
    isLoading: isLoadingMatch,
    error: matchError
  } = useQuery({
    queryKey: ['/api/matches', parseInt(matchId, 10)],
    enabled: !!matchId,
  });
  
  // Get call functionality
  const { 
    startCall, 
    isCallActive, 
    initialized: isAudioServiceInitialized 
  } = useAudioCall();
  
  // Auto-start call if query parameter is present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const autoStart = searchParams.get('autoStart') === 'true';
    
    const initiateCall = async () => {
      if (
        autoStart && 
        !isInitiating && 
        match && 
        match.otherUser && 
        match.otherUser.id && 
        user && 
        isAudioServiceInitialized &&
        !isCallActive()
      ) {
        try {
          setIsInitiating(true);
          const callDay = match.callCount + 1;
          await startCall(match.id, match.otherUser.id, callDay);
        } catch (error) {
          console.error("Failed to auto-start call:", error);
        } finally {
          setIsInitiating(false);
        }
      }
    };
    
    initiateCall();
  }, [match, user, isAudioServiceInitialized, isCallActive, startCall, isInitiating]);
  
  // Handle call ended
  const handleCallEnded = () => {
    // Redirect to match page after call ends
    setTimeout(() => {
      setLocation(`/matches/${matchId}`);
    }, 2000);
  };
  
  // Show loading state
  if (isLoadingMatch || !match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading call...</span>
      </div>
    );
  }
  
  // Show error state
  if (matchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-destructive text-xl">Error loading match</div>
        <p className="text-muted-foreground">Please try again later</p>
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
      
      <CallInterface match={match} onCallEnded={handleCallEnded} />
      
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