import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import AvatarPlaceholder from "@/components/avatar-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Match, Message, Note } from "@shared/schema";
import { PhoneCall, ChevronLeft, Send, Clock, PenSquare, Lock } from "lucide-react";
import { formatTime, formatRelativeTime } from "@/lib/utils";

export default function ConversationPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [match] = useRoute<{ id: string }>("/conversation/:id");
  const matchId = match ? parseInt(match.params.id) : 0;
  
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [noteText, setNoteText] = useState("");
  
  // Fetch match details
  const { data: matchData, isLoading: isLoadingMatch } = useQuery<Match & { otherUser: any }>({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId,
  });
  
  // Fetch messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/matches/${matchId}/messages`],
    enabled: !!matchId && !!matchData?.isChatUnlocked,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });
  
  // Fetch notes
  const { data: notes, isLoading: isLoadingNotes } = useQuery<Note[]>({
    queryKey: [`/api/matches/${matchId}/notes`],
    enabled: !!matchId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/messages`] });
    }
  });
  
  // Save note mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/notes`, { content });
      return res.json();
    },
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/notes`] });
    }
  });

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(messageText);
    }
  };

  const handleSaveNote = () => {
    if (noteText.trim() && !saveNoteMutation.isPending) {
      saveNoteMutation.mutate(noteText);
    }
  };

  const handleInitiateCall = () => {
    if (matchId) {
      navigate(`/call/${matchId}`);
    }
  };

  const handleBack = () => {
    navigate("/matches");
  };

  if (!user || isLoadingMatch) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Matches
          </Button>
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">Match not found or no longer available.</p>
            <Button onClick={() => navigate("/matches")}>View All Matches</Button>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  const { otherUser } = matchData;
  const isChatUnlocked = matchData.isChatUnlocked;
  const arePhotosRevealed = matchData.arePhotosRevealed;
  const callCount = matchData.callCount;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-4xl">
        {/* Header with match info */}
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-4 flex items-center">
            <Button variant="ghost" onClick={handleBack} className="mr-2 p-2 h-auto">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center flex-1">
              <AvatarPlaceholder 
                user={otherUser} 
                showPhoto={arePhotosRevealed} 
                size="sm"
              />
              <div className="ml-3">
                <div className="font-heading font-medium text-gray-900">{otherUser.name}</div>
                <div className="text-xs text-gray-500">
                  {callCount > 0 
                    ? `Calls completed: ${callCount} of 3` 
                    : 'No calls yet'}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleInitiateCall}
                className="flex items-center"
              >
                <PhoneCall className="h-4 w-4 mr-1" />
                <span>Call</span>
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center">
                    <PenSquare className="h-4 w-4 mr-1" />
                    <span>Notes</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Private Notes</DialogTitle>
                    <DialogDescription>
                      Keep track of your thoughts about {otherUser.name}. These notes are only visible to you.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="max-h-[300px] overflow-y-auto mt-4">
                    {notes && notes.length > 0 ? (
                      <div className="space-y-4">
                        {notes.map((note) => (
                          <div key={note.id} className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm text-gray-700">{note.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatRelativeTime(note.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No notes yet</p>
                    )}
                  </div>
                  
                  <Textarea
                    placeholder="Add a new note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="min-h-[100px]"
                  />
                  
                  <DialogFooter>
                    <Button 
                      onClick={handleSaveNote} 
                      disabled={!noteText.trim() || saveNoteMutation.isPending}
                    >
                      {saveNoteMutation.isPending ? "Saving..." : "Save Note"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {matchData.callScheduled && (
            <div className="bg-primary-light/10 p-3 flex items-center justify-center text-primary">
              <Clock className="h-4 w-4 mr-2" />
              <span>
                Call scheduled: {matchData.scheduledCallTime && formatRelativeTime(matchData.scheduledCallTime)}
              </span>
            </div>
          )}
        </div>
        
        {/* Chat content */}
        <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
          {isChatUnlocked ? (
            <>
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isMyMessage = message.senderId === user.id;
                      
                      return (
                        <div 
                          key={message.id} 
                          className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                        >
                          <div 
                            className={`px-4 py-2 max-w-[80%] ${
                              isMyMessage 
                                ? 'bg-primary text-white rounded-2xl rounded-tr-sm' 
                                : 'bg-gray-200 text-gray-800 rounded-2xl rounded-tl-sm'
                            }`}
                          >
                            {message.content}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatTime(message.sentAt)}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messageEndRef} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-gray-500 mb-2">No messages yet</p>
                    <p className="text-sm text-gray-400">
                      Send your first message to {otherUser.name}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Message input */}
              <form 
                onSubmit={handleSendMessage} 
                className="border-t border-gray-200 p-3 flex items-center"
              >
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  className="ml-2 rounded-full w-10 h-10 p-0"
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[400px]">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">Chat is Locked</h3>
              <p className="text-gray-600 max-w-md mb-6">
                Complete {callCount < 2 ? `${2 - callCount} more` : 'at least 2'} audio calls with {otherUser.name} to unlock the chat feature.
              </p>
              <Button onClick={handleInitiateCall}>Schedule a Call</Button>
            </div>
          )}
        </div>
      </main>
      
      <MobileNav activeTab="conversations" />
    </div>
  );
}
