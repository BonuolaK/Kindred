import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Match, User } from "@shared/schema";
import { Lock, Phone, MessageCircle, CalendarClock, Eye } from "lucide-react";
import UserAvatar from "./user-avatar";
import { Link } from "wouter";

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
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-medium">{otherUser.username}</CardTitle>
          <CardDescription className="text-sm">
            Matched on {formatDate(match.matchDate)}
          </CardDescription>
        </div>
        <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
          {match.compatibility}% Match
        </Badge>
      </CardHeader>
      
      <CardContent className="p-4 flex flex-col items-center">
        <div className="relative mb-4 w-32 h-32">
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
        
        <p className="text-sm text-center text-gray-600 line-clamp-3 mb-4">
          {otherUser.bio || "No bio available."}
        </p>
        
        <div className="w-full grid grid-cols-2 gap-2 text-xs">
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
      </CardContent>
      
      <CardFooter className="p-4 pt-0 grid grid-cols-3 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center justify-center gap-1"
          onClick={() => onScheduleCall && onScheduleCall(match.id)}
          disabled={!!match.callScheduled}
        >
          {match.callScheduled ? <CalendarClock className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          {match.callScheduled ? "Scheduled" : "Call"}
        </Button>
        
        {isChatUnlocked ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-1"
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
            className="flex items-center justify-center gap-1"
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
            className="flex items-center justify-center gap-1"
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
            className="flex items-center justify-center gap-1"
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