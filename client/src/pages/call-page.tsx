import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CallInterface from "@/components/call-interface";
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
import { ChevronLeft, Loader2, Mic, MicOff, Volume2, VolumeX, PhoneOff } from "lucide-react";

export default function CallPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [matched, params] = useRoute<{ id: string }>("/call/:id");
  const matchId = matched && params ? parseInt(params.id) : 0;
  
  // UI state
  const [showEndCallDialog, setShowEndCallDialog] = useState(false);
  const [endCallNote, setEndCallNote] = useState("");
  
  // Fetch match details
  const { data: matchData, isLoading: isLoadingMatch } = useQuery<Match & { otherUser: any }>({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId,
  });
  
  // Save note mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/notes`, { content });
      return res.json();
    }
  });
  
  // Handle call end
  const handleCallEnded = () => {
    // If there's a note, save it
    if (endCallNote.trim()) {
      saveNoteMutation.mutate(endCallNote);
    }
    
    // Update match data
    queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
    
    // Redirect back to matches page
    navigate("/matches");
  };
  
  // Handle back to matches
  const handleBackToMatches = () => {
    navigate("/matches");
  };
  
  // Generate conversation starters
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
  
  // Loading state
  if (!user || isLoadingMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary text-white flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="mt-4">Setting up your call...</p>
      </div>
    );
  }
  
  // Match not found
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
  
  // Render the call interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary text-white flex flex-col p-4 md:p-8">
      {/* Back button */}
      <button 
        className="self-start p-2 rounded-full bg-white/10 hover:bg-white/20 mb-4"
        onClick={handleBackToMatches}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      
      <div className="flex flex-col flex-1 items-center justify-center">
        {/* Call interface */}
        <CallInterface 
          match={matchData}
          onCallEnded={handleCallEnded}
        />
        
        {/* Conversation starters */}
        <div className="mt-8 w-full max-w-md bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="text-center font-medium mb-4">Conversation Starters</div>
          <div className="space-y-3">
            {getRandomConversationStarters().map((starter, index) => (
              <div key={index} className="bg-white/10 rounded-lg px-3 py-2 text-sm">
                {starter}
              </div>
            ))}
          </div>
        </div>
        
        {/* Note dialog */}
        <Dialog open={showEndCallDialog} onOpenChange={setShowEndCallDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Save Call Note</DialogTitle>
              <DialogDescription>
                Add a note about your conversation (optional)
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Textarea
                placeholder="Write notes about this call..."
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
                Skip
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  if (endCallNote.trim()) {
                    saveNoteMutation.mutate(endCallNote);
                  }
                  setShowEndCallDialog(false);
                  navigate("/matches");
                }}
              >
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
