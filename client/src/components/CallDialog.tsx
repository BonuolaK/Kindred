import { useEffect, useState } from 'react';
import { useCallSignaling, type CallStatus } from '@/hooks/use-call-signaling';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, User } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export function CallDialog() {
  const {
    callStatus,
    currentCall,
    acceptCall,
    rejectCall,
    endCall,
    resetCallState
  } = useCallSignaling();
  
  const [open, setOpen] = useState(false);

  // Open dialog when there's an incoming call or active call
  useEffect(() => {
    if (callStatus === 'ringing' || 
        callStatus === 'connecting' ||
        callStatus === 'active') {
      setOpen(true);
    } else if (callStatus === 'ended' || 
              callStatus === 'rejected' || 
              callStatus === 'missed' ||
              callStatus === 'error') {
      // Dialog will close after a short delay for ended, rejected, or missed calls
      const timer = setTimeout(() => {
        setOpen(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else if (callStatus === 'idle') {
      setOpen(false);
    }
  }, [callStatus]);

  // When dialog is closed manually, reset state if needed
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    
    if (!isOpen && ['connecting', 'active', 'ringing'].includes(callStatus)) {
      // If call is active and dialog is closed, end call
      if (callStatus === 'active' || callStatus === 'connecting') {
        endCall();
      } else if (callStatus === 'ringing') {
        // If call is ringing and dialog is closed, reject call
        rejectCall();
      }
    } else if (!isOpen) {
      // Otherwise just reset the state
      resetCallState();
    }
  };

  if (!currentCall) return null;
  
  const avatar = currentCall.avatar || '';
  const userName = currentCall.otherUserName || 'User';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {callStatus === 'ringing' && 'Incoming Call'}
            {callStatus === 'calling' && 'Calling...'}
            {callStatus === 'connecting' && 'Connecting...'}
            {callStatus === 'active' && 'In Call'}
            {callStatus === 'ended' && 'Call Ended'}
            {callStatus === 'rejected' && 'Call Rejected'}
            {callStatus === 'missed' && 'Call Missed'}
            {callStatus === 'error' && 'Call Error'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatar} alt={userName} />
            <AvatarFallback className="text-2xl">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-xl font-semibold">{userName}</div>
          
          <div className="text-sm text-muted-foreground">
            {callStatus === 'ringing' && 'is calling you...'}
            {callStatus === 'calling' && 'Calling...'}
            {callStatus === 'connecting' && 'Connecting to call...'}
            {callStatus === 'active' && 'Call in progress'}
            {callStatus === 'ended' && 'Call has ended'}
            {callStatus === 'rejected' && 'Call was rejected'}
            {callStatus === 'missed' && 'Call was missed'}
            {callStatus === 'error' && currentCall.errorMessage || 'An error occurred'}
          </div>
        </div>
        
        <DialogFooter className="flex justify-center gap-4 sm:justify-center">
          {callStatus === 'ringing' && (
            <>
              <Button 
                variant="destructive" 
                className="rounded-full p-6" 
                onClick={rejectCall}
              >
                <PhoneOff size={24} />
              </Button>
              
              <Button 
                variant="default" 
                className="rounded-full bg-green-600 hover:bg-green-700 p-6" 
                onClick={acceptCall}
              >
                <Phone size={24} />
              </Button>
            </>
          )}
          
          {(callStatus === 'connecting' || callStatus === 'active') && (
            <Button 
              variant="destructive" 
              className="rounded-full p-6" 
              onClick={endCall}
            >
              <PhoneOff size={24} />
            </Button>
          )}
          
          {(callStatus === 'ended' || callStatus === 'missed' || callStatus === 'rejected' || callStatus === 'error') && (
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}