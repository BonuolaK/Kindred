import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { setupWebSocket } from "@/lib/utils";
import AvatarPlaceholder from "@/components/avatar-placeholder";
import CallTimer from "@/components/call-timer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Match, CallLog } from "@shared/schema";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, ChevronLeft } from "lucide-react";
import { calculateCallDuration } from "@/lib/utils";

type CallStatus = "connecting" | "ongoing" | "completed" | "canceled" | "error";

export default function CallPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [match] = useRoute<{ id: string }>("/call/:id");
  const matchId = match ? parseInt(match.params.id) : 0;
  
  // Call state
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [showEndCallDialog, setShowEndCallDialog] = useState(false);
  const [endCallNote, setEndCallNote] = useState("");
  const [currentCallId, setCurrentCallId] = useState<number | null>(null);
  
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  
  // Fetch match details
  const { data: matchData, isLoading: isLoadingMatch } = useQuery<Match & { otherUser: any }>({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId,
  });
  
  // Start call mutation
  const startCallMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/calls`, {});
      return res.json();
    },
    onSuccess: (data: CallLog) => {
      setCurrentCallId(data.id);
      setCallStatus("ongoing");
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
    },
    onError: () => {
      setCallStatus("error");
    }
  });
  
  // End call mutation
  const endCallMutation = useMutation({
    mutationFn: async (callId: number) => {
      const res = await apiRequest("PUT", `/api/calls/${callId}/end`, {
        duration: callDuration
      });
      return res.json();
    },
    onSuccess: () => {
      setCallStatus("completed");
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
      
      // If there's a note, save it
      if (endCallNote.trim()) {
        saveNoteMutation.mutate(endCallNote);
      }
    }
  });
  
  // Save note mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/notes`, { content });
      return res.json();
    }
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (matchId && user && callStatus === "connecting") {
      // Set up WebSocket connection
      const ws = setupWebSocket();
      wsRef.current = ws;
      
      // Initialize WebSocket event handlers
      ws.onopen = () => {
        console.log("WebSocket connection established");
        // Start call when WS connection is ready
        startCallMutation.mutate();
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received message:", data);
        // Handle incoming WebSocket messages
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setCallStatus("error");
      };
      
      ws.onclose = () => {
        console.log("WebSocket connection closed");
      };
      
      // Clean up on unmount
      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    }
  }, [matchId, user, callStatus, startCallMutation]);
  
  // Handle call timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (callStatus === "ongoing") {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callStatus]);
  
  const handleEndCall = () => {
    setShowEndCallDialog(true);
  };
  
  const confirmEndCall = () => {
    if (currentCallId) {
      endCallMutation.mutate(currentCallId);
    }
    setShowEndCallDialog(false);
  };
  
  const handleBackToMatches = () => {
    navigate("/matches");
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Here you would also implement the actual audio muting logic
  };
  
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Here you would also implement the actual speaker toggling logic
  };
  
  // Calculate call day based on previous call count
  const callDay = matchData ? (matchData.callCount + 1) : 1;
  
  const getRandomConversationStarters = () => {
    const starters = [
      "If you could travel anywhere tomorrow, where would you go?",
      "What's a book or movie that changed how you see the world?",
      "What's something you're proud of that you don't usually talk about?",
      "What does your ideal weekend look like?",
      "If you could have dinner with anyone, living or dead, who would it be?",
      "What's a hobby you've always wanted to try but haven't yet?",
      "What's your favorite way to spend time alone?",
      "What's something unexpected that always makes you smile?",
      "If you could master any skill instantly, what would it be?",
      "What's one thing you're excited about for the future?"
    ];
    
    // Return two random starters
    const shuffled = [...starters].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  };
  
  const conversationStarters = getRandomConversationStarters();
  
  if (!user || isLoadingMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary text-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        <p className="mt-4">Setting up your call...</p>
      </div>
    );
  }
  
  if (!matchData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-heading font-bold mb-4">Call Error</h2>
        <p className="text-center mb-6">We couldn't find the match you're trying to call.</p>
        <Button 
          variant="secondary" 
          onClick={handleBackToMatches}
          className="bg-white text-primary hover:bg-white/90"
        >
          Back to Matches
        </Button>
      </div>
    );
  }
  
  const { otherUser } = matchData;
  
  // Determine content based on call status
  const renderCallContent = () => {
    switch (callStatus) {
      case "connecting":
        return (
          <div className="text-center">
            <div className="animate-pulse mb-4">
              <div className="w-24 h-24 rounded-full avatar-shape-2 bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center">
                <span className="font-bold text-4xl">{otherUser.name.charAt(0)}</span>
              </div>
            </div>
            <h3 className="font-heading font-bold text-2xl mb-2">{otherUser.name}</h3>
            <p className="text-white/80">Connecting...</p>
          </div>
        );
      
      case "ongoing":
        return (
          <>
            <div className="mb-auto text-center pt-6">
              <AvatarPlaceholder 
                user={otherUser} 
                size="lg" 
                className="mx-auto"
              />
              <h3 className="font-heading font-bold text-2xl mt-4 mb-2">{otherUser.name}</h3>
              <p className="text-white/80">Day {callDay}: {calculateCallDuration(callDay) / 60} minute call</p>
              
              <div className="mt-8 text-center">
                <CallTimer 
                  callDay={callDay} 
                  isActive={true}
                  onTimeEnd={handleEndCall}
                />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mt-2">
              <div className="text-center font-medium mb-4">Conversation Starters</div>
              <div className="space-y-3">
                {conversationStarters.map((starter, index) => (
                  <div key={index} className="bg-white/10 rounded-lg px-3 py-2 text-sm">
                    {starter}
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      
      case "completed":
        return (
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h3 className="font-heading font-bold text-2xl mb-2">Call Completed</h3>
            <p className="text-white/80 mb-6">
              Your call with {otherUser.name} has ended
            </p>
            <Button 
              variant="secondary" 
              onClick={handleBackToMatches}
              className="bg-white text-primary hover:bg-white/90"
            >
              Back to Matches
            </Button>
          </div>
        );
      
      case "error":
        return (
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3 className="font-heading font-bold text-2xl mb-2">Call Error</h3>
            <p className="text-white/80 mb-6">
              We couldn't connect your call. Please try again later.
            </p>
            <Button 
              variant="secondary" 
              onClick={handleBackToMatches}
              className="bg-white text-primary hover:bg-white/90"
            >
              Back to Matches
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-black/20"></div>
      
      {/* Back button (only in connecting state) */}
      {callStatus === "connecting" && (
        <button 
          className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20"
          onClick={handleBackToMatches}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      
      <div className="relative z-10 h-full flex flex-col p-6 min-h-screen">
        {renderCallContent()}
        
        {/* Call controls (only show during ongoing call) */}
        {callStatus === "ongoing" && (
          <div className="flex justify-center space-x-4 mt-8 mb-4">
            <button 
              className={`w-14 h-14 rounded-full ${isMuted ? 'bg-red-500' : 'bg-white/20'} flex items-center justify-center`}
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="text-2xl" /> : <Mic className="text-2xl" />}
            </button>
            <button 
              className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center"
              onClick={handleEndCall}
            >
              <PhoneOff className="text-2xl" />
            </button>
            <button 
              className={`w-14 h-14 rounded-full ${!isSpeakerOn ? 'bg-red-500' : 'bg-white/20'} flex items-center justify-center`}
              onClick={toggleSpeaker}
            >
              {isSpeakerOn ? <Volume2 className="text-2xl" /> : <VolumeX className="text-2xl" />}
            </button>
          </div>
        )}
      </div>
      
      {/* End call dialog */}
      <Dialog open={showEndCallDialog} onOpenChange={setShowEndCallDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>End Call</DialogTitle>
            <DialogDescription>
              Are you sure you want to end your call with {otherUser?.name}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Add a note about this call (optional)"
              value={endCallNote}
              onChange={(e) => setEndCallNote(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEndCallDialog(false)}
            >
              Continue Call
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmEndCall}
            >
              End Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
