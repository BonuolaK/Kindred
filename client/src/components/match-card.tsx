import { useLocation } from "wouter";
import { Match } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AvatarPlaceholder from "./avatar-placeholder";
import { PhoneCall, MessageCircle, Calendar } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type MatchCardProps = {
  match: Match & { otherUser?: any };
};

export const MatchCard = ({ match }: MatchCardProps) => {
  const [, navigate] = useLocation();
  
  if (!match.otherUser) {
    return null;
  }

  const isPhotoRevealed = match.arePhotosRevealed;
  const canChat = match.isChatUnlocked;
  const isCallScheduled = match.callScheduled;
  const callDay = match.callCount + 1;
  const compatibility = match.compatibility;
  
  // Format compatibility as percentage
  const compatibilityPercent = `${compatibility}% Compatible`;
  
  // Calculate call duration based on call day
  const getCallDuration = (day: number) => {
    switch (day) {
      case 1: return "5 min";
      case 2: return "10 min";
      case 3: return "20 min";
      default: return "Unlimited";
    }
  };

  const handleCallClick = () => {
    navigate(`/call/${match.id}`);
  };

  const handleChatClick = () => {
    navigate(`/conversation/${match.id}`);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <AvatarPlaceholder 
            user={match.otherUser} 
            showPhoto={isPhotoRevealed}
            size="md"
          />
          <div className="flex-1">
            <div className="font-heading font-medium text-gray-900">
              {match.otherUser.name}
            </div>
            <div className="text-sm text-gray-500">{compatibilityPercent}</div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              {isCallScheduled ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  <span>Call scheduled: {match.scheduledCallTime && formatRelativeTime(match.scheduledCallTime)}</span>
                </>
              ) : match.lastCallDate ? (
                <>
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                  <span>Call completed: {match.callCount} of 3</span>
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                  <span>Day {callDay}: {getCallDuration(callDay)} call</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {match.otherUser.job && (
          <div className="mt-3 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Occupation:</span> {match.otherUser.job}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="bg-gray-50 p-4 flex justify-between">
        <Button
          variant={canChat ? "outline" : "ghost"}
          className={!canChat ? "text-gray-400 cursor-not-allowed" : ""}
          disabled={!canChat}
          onClick={handleChatClick}
        >
          <MessageCircle className="h-5 w-5 mr-1" />
          <span>{canChat ? "Chat" : "Locked"}</span>
        </Button>
        
        <Button 
          variant="primary"
          onClick={handleCallClick}
        >
          <PhoneCall className="h-5 w-5 mr-1" />
          <span>Call</span>
        </Button>
      </CardFooter>
    </Card>
  );
};
