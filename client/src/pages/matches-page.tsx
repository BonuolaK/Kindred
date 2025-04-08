import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Match, User } from "@shared/schema";
import MatchCard from "@/components/match-card";
import UserAvatar from "@/components/user-avatar";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Your Matches</h1>
            
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
          
          <Tabs defaultValue="grid" className="w-full">
            <div className="flex justify-center mb-4">
              <TabsList>
                <TabsTrigger value="grid">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Grid View</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="list">
                  <div className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">List View</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>
          
            <TabsContent value="grid" className="mt-0">
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
                  <h3 className="text-lg font-medium mb-2">No matches found</h3>
                  <p className="text-muted-foreground mb-6">
                    {filterValue === "all"
                      ? "You don't have any matches yet. Complete your profile to increase your chances of matching."
                      : "No matches found with the selected filter. Try a different filter."}
                  </p>
                  {filterValue === "all" && (
                    <Button
                      onClick={() => generateMatchesMutation.mutate()}
                      disabled={generateMatchesMutation.isPending}
                      className="mx-auto"
                    >
                      {generateMatchesMutation.isPending ? "Finding Matches..." : "Find Matches"}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="list" className="mt-0">
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-background border rounded-lg h-24"></div>
                  ))}
                </div>
              ) : filteredMatches.length > 0 ? (
                <div className="space-y-4">
                  {filteredMatches.map(match => (
                    <div key={match.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative w-16 h-16">
                          <div className="absolute inset-0">
                            <UserAvatar user={match.otherUser} showPhoto={match.arePhotosRevealed || false} size="md" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium">{match.otherUser.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {match.compatibility}% Match • Matched on {formatDate(match.matchDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleScheduleCall(match.id)}
                          disabled={!!match.callScheduled}
                        >
                          {match.callScheduled ? "Scheduled" : "Schedule Call"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium mb-2">No matches found</h3>
                  <p className="text-muted-foreground mb-6">
                    {filterValue === "all"
                      ? "You don't have any matches yet. Complete your profile to increase your chances of matching."
                      : "No matches found with the selected filter. Try a different filter."}
                  </p>
                  {filterValue === "all" && (
                    <Button
                      onClick={() => generateMatchesMutation.mutate()}
                      disabled={generateMatchesMutation.isPending}
                      className="mx-auto"
                    >
                      {generateMatchesMutation.isPending ? "Finding Matches..." : "Find Matches"}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
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