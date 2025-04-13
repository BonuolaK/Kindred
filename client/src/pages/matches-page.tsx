import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Match, User } from "@shared/schema";
import MatchCard from "@/components/match-card";
import UserAvatar from "@/components/user-avatar";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Filter, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MatchesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedMatch, setSelectedMatch] = useState<(Match & { otherUser?: User }) | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | undefined>(undefined);
  const [filterValue, setFilterValue] = useState<string>("all");
  
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
  
  const scheduleMutation = useMutation({
    mutationFn: async (data: { matchId: number, date: string, time: string }) => {
      const res = await fetch(`/api/matches/${data.matchId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: data.date, time: data.time })
      });
      
      if (!res.ok) throw new Error("Failed to schedule call");
      return res.json();
    },
    onSuccess: () => {
      setSelectedMatch(null);
      setDate(undefined);
      setTime(undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    }
  });
  
  const generateMatchesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/generate-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) throw new Error('Failed to generate matches');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    }
  });
  
  // Filter matches based on selected filter
  const filteredMatches = matches.filter(match => {
    if (filterValue === "all") return true;
    if (filterValue === "active") return match.status === "active";
    if (filterValue === "scheduled") return !!match.callScheduled;
    if (filterValue === "chatUnlocked") return !!match.isChatUnlocked;
    if (filterValue === "photosRevealed") return !!match.arePhotosRevealed;
    return true;
  });
  
  const handleScheduleCall = (matchId: number) => {
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setSelectedMatch(match);
    }
  };
  
  const handleConfirmSchedule = () => {
    if (!selectedMatch || !date || !time) return;
    
    const formattedDate = format(date, "yyyy-MM-dd");
    scheduleMutation.mutate({
      matchId: selectedMatch.id,
      date: formattedDate,
      time
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-5xl py-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Your Matches</h1>
                <div className="flex items-center mt-1 text-sm text-muted-foreground">
                  <span className="font-medium">
                    {matches.length}/{user?.profileType === 'basic' ? '3' : user?.profileType === 'premium' ? '5' : '∞'} matches
                  </span>
                  {user?.profileType !== 'elite' && (
                    <Button 
                      variant="link" 
                      className="h-auto p-0 pl-2 text-primary font-medium" 
                      onClick={() => {
                        navigate("/profile/subscription");
                      }}
                    >
                      Upgrade for more matches
                    </Button>
                  )}
                </div>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Filter className="h-4 w-4" /> Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Filter Matches</h4>
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Matches</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="scheduled">Call Scheduled</SelectItem>
                        <SelectItem value="chatUnlocked">Chat Unlocked</SelectItem>
                        <SelectItem value="photosRevealed">Photos Revealed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    {user?.profileType === 'basic' ? 'Basic Account' : 
                     user?.profileType === 'premium' ? 'Premium Account' : 
                     user?.profileType === 'elite' ? 'Elite Account' : 'Basic Account'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {user?.profileType === 'basic' ? 'Up to 3 matches' : 
                     user?.profileType === 'premium' ? 'Up to 5 matches' : 
                     user?.profileType === 'elite' ? 'Unlimited matches' : 'Up to 3 matches'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs flex flex-col items-end">
                    <span className="font-medium">
                      {(matches.length || 0)} / 
                      {user?.profileType === 'basic' ? '3' : 
                       user?.profileType === 'premium' ? '5' : 
                       '∞'}
                    </span>
                    <span className="text-muted-foreground">Matches used</span>
                  </div>
                  {(user?.profileType === 'basic' || user?.profileType === 'premium') && (
                    <Button 
                      size="sm" 
                      className="text-xs h-9 bg-primary hover:bg-primary/90 text-white font-medium"
                      onClick={() => {
                        navigate("/profile/subscription");
                      }}
                    >
                      {user?.profileType === 'basic' ? 'Unlock 5+ Matches' : 'Get Unlimited'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="grid" className="w-full">
          
            <div className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-background border rounded-lg h-96"></div>
                  ))}
                </div>
              ) : filteredMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMatches.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      currentUserId={user?.id || 0}
                      onScheduleCall={handleScheduleCall}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium mb-2">Ready to find your Kindred spirit?</h3>
                  <p className="text-muted-foreground mb-6">
                    {filterValue === "all"
                      ? "Your perfect match is just a click away! Make sure your profile is complete to discover your most compatible connections."
                      : "No matches found with the selected filter. Try a different filter."}
                  </p>
                  {filterValue === "all" && (
                    <Button
                      onClick={() => generateMatchesMutation.mutate()}
                      disabled={generateMatchesMutation.isPending}
                      className="mx-auto bg-primary hover:bg-primary/90 text-white font-medium px-8 py-6 h-auto"
                      size="lg"
                    >
                      {generateMatchesMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Finding Matches...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Heart className="h-5 w-5" />
                          Find New Matches
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </main>
      
      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a call</DialogTitle>
            <DialogDescription>
              Select a date and time for your audio call with {selectedMatch?.otherUser?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="date" className="text-sm font-medium">
                Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="time" className="text-sm font-medium">
                Time
              </label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger id="time">
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="13:00">1:00 PM</SelectItem>
                  <SelectItem value="14:00">2:00 PM</SelectItem>
                  <SelectItem value="15:00">3:00 PM</SelectItem>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                  <SelectItem value="17:00">5:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                  <SelectItem value="19:00">7:00 PM</SelectItem>
                  <SelectItem value="20:00">8:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedMatch(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSchedule}
              disabled={!date || !time || scheduleMutation.isPending}
            >
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule Call"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <MobileNav activeTab="matches" />
    </div>
  );
}