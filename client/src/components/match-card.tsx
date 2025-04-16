import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Match, User } from "@shared/schema";
import { Lock, Phone, MessageCircle, CalendarClock, Eye, Clock, X, RefreshCw, AlertTriangle } from "lucide-react";
import UserAvatar from "./user-avatar";
import { Link } from "wouter";
import { CallPreferencesDisplay } from "./call-preferences-display";
import { CompactCallPreferences } from "./compact-call-preferences";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type MatchCardProps = {
  match: Match & { otherUser?: User };
  currentUserId: number;
  onScheduleCall?: (matchId: number) => void;
};

export const MatchCard = ({ match, currentUserId, onScheduleCall }: MatchCardProps) => {
  if (!match.otherUser) return null;
  
  const otherUser = match.otherUser;
  const isPhotoRevealed = match.arePhotosRevealed || false;
  const isChatUnlocked = match.isChatUnlocked || false;
  
  // Get online status
  const { isUserOnline } = useOnlineStatus();
  const isOtherUserOnline = isUserOnline(otherUser.id);
  
  // State for unmatch dialog
  const [unmatchDialogOpen, setUnmatchDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [isUnmatching, setIsUnmatching] = useState(false);
  const { toast } = useToast();
  
  // Handle unmatch function
  const handleUnmatch = async () => {
    try {
      setIsUnmatching(true);
      
      const response = await apiRequest("POST", `/api/matches/${match.id}/unmatch`);
      
      if (response.ok) {
        // Get the response data
        const data = await response.json();
        
        // Show success toast
        toast({
          title: "Successfully unmatched",
          description: `You have unmatched with ${otherUser.username}.`,
          variant: "default",
        });
        
        // Invalidate the matches query to refresh the list
        queryClient.invalidateQueries({queryKey: ["/api/matches"]});
        
        // Close the dialog
        setUnmatchDialogOpen(false);
      } else {
        // Check if it's a premium-required error
        if (response.status === 403) {
          const data = await response.json();
          if (data.requiresUpgrade) {
            setUpgradeDialogOpen(true);
            setUnmatchDialogOpen(false);
          } else {
            throw new Error(data.message || "You don't have permission to unmatch.");
          }
        } else {
          throw new Error("Failed to unmatch. Please try again later.");
        }
      }
    } catch (error) {
      console.error("Unmatch error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUnmatching(false);
    }
  };
  
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md border-gray-200 shadow-sm bg-gradient-to-b from-white to-gray-50 relative">
      {/* Unmatch confirmation dialog */}
      <AlertDialog open={unmatchDialogOpen} onOpenChange={setUnmatchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Unmatch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unmatch with {otherUser.username}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnmatching}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleUnmatch();
              }}
              disabled={isUnmatching}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isUnmatching ? "Unmatching..." : "Unmatch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Upgrade required dialog */}
      <AlertDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Premium Feature
            </AlertDialogTitle>
            <AlertDialogDescription>
              Unmatching is only available for Premium and Elite members. Upgrade your account to access this feature.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setUpgradeDialogOpen(false);
                window.location.href = "/profile?tab=subscription";
              }}
              className="bg-[#9B1D54] hover:bg-[#9B1D54]/90"
            >
              Upgrade Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="absolute top-2 right-2 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                onClick={() => setUnmatchDialogOpen(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Unmatch</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-medium">{otherUser.username}</CardTitle>
            <div className={`h-2.5 w-2.5 rounded-full ${isOtherUserOnline ? 'bg-green-500' : 'bg-gray-300'}`} 
                 title={isOtherUserOnline ? 'Online' : 'Offline'} />
          </div>
          <CardDescription className="text-sm">
            Matched on {formatDate(match.matchDate)}
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 flex flex-col items-center">
        <div className="relative mb-4 w-40 h-40">
          <UserAvatar 
            user={otherUser} 
            size="xl" 
            showPhoto={isPhotoRevealed}
          />
          {!isPhotoRevealed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
              <Lock className="text-white h-8 w-8" />
            </div>
          )}
        </div>
        
        <p className="text-base text-center font-medium text-gray-800 line-clamp-3 mb-4">
          {otherUser.bio || "No bio available."}
        </p>
        
        <div className="w-full grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="flex items-center gap-1">
            <span className="font-medium">Age:</span> 
            <span>{otherUser.age || "Not specified"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">Location:</span> 
            <span>{otherUser.location || "Not specified"}</span>
          </div>
          {otherUser.communicationStyle && (
            <div className="col-span-2 flex items-center gap-1">
              <span className="font-medium">Communication:</span> 
              <span className="truncate">{otherUser.communicationStyle}</span>
            </div>
          )}
        </div>
        
        <div className="w-full mb-3">
          <div className="flex justify-between items-center">
            <CompactCallPreferences preferences={otherUser.callPreferences || undefined} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-[#9B1D54] hover:text-[#9B1D54]/80 hover:bg-[#9B1D54]/10 rounded-full"
                    onClick={() => {
                      const modal = document.createElement('div');
                      modal.id = 'call-preferences-modal';
                      modal.innerHTML = `
                        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                          <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
                            <div class="flex justify-between items-center mb-4">
                              <h3 class="text-lg font-medium">Call Preferences</h3>
                              <button class="text-gray-500 hover:text-gray-700" onclick="document.getElementById('call-preferences-modal').remove()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                            </div>
                            <div id="call-preferences-content">
                              <div class="text-gray-600">
                                Loading call preferences...
                              </div>
                            </div>
                          </div>
                        </div>
                      `;
                      document.body.appendChild(modal);
                      
                      // Render the detailed preferences into the modal
                      const contentElement = document.getElementById('call-preferences-content');
                      if (contentElement) {
                        const detailedPreferences = document.createElement('div');
                        detailedPreferences.className = 'text-sm';
                        contentElement.innerHTML = '';
                        contentElement.appendChild(detailedPreferences);
                        
                        // This is a hacky approach since we can't directly render React components here
                        // In a real app, you'd use a proper React modal
                        
                        // If user has no preferences, show default "Available anytime" view
                        if (!otherUser.callPreferences || 
                            (!otherUser.callPreferences.weekdays?.length && 
                             !otherUser.callPreferences.weekends?.length && 
                             !otherUser.callPreferences.notAvailable?.length)) {
                          
                          detailedPreferences.innerHTML = `
                            <div class="mb-4">
                              <div class="flex items-center mb-3">
                                <div class="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                                <span class="text-sm font-medium">Available anytime</span>
                              </div>
                              <p class="text-gray-500 text-xs italic mb-3">This user hasn't set specific preferences yet</p>
                              
                              <h4 class="font-medium mb-2">Standard Availability</h4>
                              <div class="flex flex-wrap">
                                <span class="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-700 mr-2 mb-2">
                                  Weekdays: 9AM - 9PM
                                </span>
                                <span class="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-700 mr-2 mb-2">
                                  Weekends: 9AM - 9PM
                                </span>
                              </div>
                            </div>
                            <div>
                              <h4 class="font-medium mb-2">Available Days</h4>
                              <div class="flex flex-wrap">
                                <span class="inline-block bg-green-100 rounded-full px-3 py-1 text-sm font-medium text-green-700 mr-2 mb-2">
                                  All days
                                </span>
                              </div>
                            </div>
                          `;
                        } else {
                          // Otherwise show the actual preferences
                          const weekdays = otherUser.callPreferences.weekdays?.map(slot => 
                            `<span class="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-700 mr-2 mb-2">
                              Weekdays: ${slot.start.replace(/:\d\d$/, '')} - ${slot.end.replace(/:\d\d$/, '')}
                            </span>`
                          ).join('') || '';
                          
                          const weekends = otherUser.callPreferences.weekends?.map(slot => 
                            `<span class="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-700 mr-2 mb-2">
                              Weekends: ${slot.start.replace(/:\d\d$/, '')} - ${slot.end.replace(/:\d\d$/, '')}
                            </span>`
                          ).join('') || '';
                          
                          const unavailable = otherUser.callPreferences.notAvailable?.map(day => 
                            `<span class="inline-block bg-red-100 rounded-full px-3 py-1 text-sm font-medium text-red-700 mr-2 mb-2">
                              ${day.charAt(0).toUpperCase() + day.slice(1)}
                            </span>`
                          ).join('') || '';
                          
                          detailedPreferences.innerHTML = `
                            <div class="mb-4">
                              <h4 class="font-medium mb-2">Available Times</h4>
                              <div class="flex flex-wrap">${weekdays || "No weekday preferences set"}${weekends || "No weekend preferences set"}</div>
                            </div>
                            ${unavailable ? `
                            <div>
                              <h4 class="font-medium mb-2">Unavailable Days</h4>
                              <div class="flex flex-wrap">${unavailable}</div>
                            </div>
                            ` : `
                            <div>
                              <h4 class="font-medium mb-2">Available Days</h4>
                              <div class="flex flex-wrap">
                                <span class="inline-block bg-green-100 rounded-full px-3 py-1 text-sm font-medium text-green-700 mr-2 mb-2">
                                  All days
                                </span>
                              </div>
                            </div>
                            `}
                          `;
                        }
                      }
                    }}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View detailed call preferences</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 grid grid-cols-3 gap-3">
        {match.callScheduled ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-1 h-10 border-gray-300 hover:bg-gray-50"
            disabled
          >
            <CalendarClock className="h-4 w-4" />
            Scheduled
          </Button>
        ) : (
          // TEMPORARY FIX: Enable calling regardless of online status
          // The original implementation depended on online status: {isOtherUserOnline ? ... : ...}
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-1 h-10 border-[#9B1D54]/30 bg-[#9B1D54]/5 hover:bg-[#9B1D54]/10 hover:border-[#9B1D54]/50 text-[#9B1D54] hover:text-[#9B1D54]"
            asChild
          >
            <Link to={`/call/${match.id}?autoStart=true`}>
              <Phone className="h-4 w-4" />
              Call
              {!isOtherUserOnline && (
                <span className="ml-1 text-xs text-[#9B1D54]/60">(try)</span>
              )}
            </Link>
          </Button>
        )}
        
        {isChatUnlocked ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-1 h-10 border-[#9B1D54]/30 bg-[#9B1D54]/5 hover:bg-[#9B1D54]/10 hover:border-[#9B1D54]/50 text-[#9B1D54] hover:text-[#9B1D54]"
            asChild
          >
            <Link to={`/conversation/${match.id}`}>
              <MessageCircle className="h-4 w-4" />
              Chat
            </Link>
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-1 h-10 border-gray-300"
            disabled
          >
            <Lock className="h-4 w-4" />
            Chat
          </Button>
        )}
        
        {isPhotoRevealed ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-1 h-10 border-[#9B1D54]/30 bg-[#9B1D54]/5 hover:bg-[#9B1D54]/10 hover:border-[#9B1D54]/50 text-[#9B1D54] hover:text-[#9B1D54]"
            asChild
          >
            <Link to={`/profile/${otherUser.id}`}>
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-1 h-10 border-gray-300"
            disabled
          >
            <Lock className="h-4 w-4" />
            View
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default MatchCard;