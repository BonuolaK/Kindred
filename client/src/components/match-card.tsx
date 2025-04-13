import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Match, User } from "@shared/schema";
import { Lock, Phone, MessageCircle, CalendarClock, Eye, Clock, X, RefreshCw } from "lucide-react";
import UserAvatar from "./user-avatar";
import { Link } from "wouter";
import { CallPreferencesDisplay } from "./call-preferences-display";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md border-gray-200 shadow-sm bg-gradient-to-b from-white to-gray-50 relative">
      <div className="absolute top-2 right-2 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                onClick={() => alert("This feature is only available to premium members. Upgrade your plan to swap matches.")}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Swap/Unmatch (Premium Feature)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-medium">{otherUser.username}</CardTitle>
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
        
        {otherUser.callPreferences && (
          <div className="w-full rounded-md bg-gray-50 p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium text-gray-700">Preferred Call Times</h4>
            </div>
            <div className="text-xs">
              <CallPreferencesDisplay preferences={otherUser.callPreferences} className="text-xs" />
            </div>
          </div>
        )}
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
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-1 h-10 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary hover:text-primary"
            asChild
          >
            <Link to={`/call/${match.id}?autoStart=true`}>
              <Phone className="h-4 w-4" />
              Call
            </Link>
          </Button>
        )}
        
        {isChatUnlocked ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-1 h-10 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary hover:text-primary"
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
            className="flex items-center justify-center gap-1 h-10 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary hover:text-primary"
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