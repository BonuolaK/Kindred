import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RtcCallState } from '@/hooks/use-rtc-test-call';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RtcTestCallUI } from '@/components/RtcTestCallUI';

// Mock match for testing calls
const MOCK_MATCH_ID = 999;

// Test users for simulating call
type TestUser = {
  id: number;
  username: string;
  avatar?: string;
  color: string;
};

const USER_1: TestUser = { 
  id: 17, 
  username: "KennyB", 
  avatar: "🎧", 
  color: "#4f46e5" 
};

const USER_2: TestUser = { 
  id: 35, 
  username: "JaneDoe", 
  avatar: "🌻", 
  color: "#9B1D54" 
};

export default function MatchCallTest() {
  const { user: loggedInUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("user1");
  const [callDay, setCallDay] = useState<number>(1);
  const [showDebug, setShowDebug] = useState<boolean>(true);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Reference to log end for auto-scrolling
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of logs when they update
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  // Add log with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Handle call ending
  const handleCallEnded = () => {
    addLog("Call ended");
  };

  // Increment call day
  const incrementCallDay = () => {
    setCallDay(prev => Math.min(prev + 1, 3));
    addLog(`Call day set to ${callDay + 1}`);
  };

  // Decrement call day
  const decrementCallDay = () => {
    setCallDay(prev => Math.max(prev - 1, 1));
    addLog(`Call day set to ${callDay - 1}`);
  };

  // Toggle debug information
  const toggleDebug = () => {
    setShowDebug(prev => !prev);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Match Call Test</h1>
      
      <div className="mb-6 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">Call Day:</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={decrementCallDay}
            disabled={callDay <= 1}
          >
            -
          </Button>
          <span className="font-bold px-2">{callDay}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={incrementCallDay}
            disabled={callDay >= 3}
          >
            +
          </Button>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleDebug}
        >
          {showDebug ? "Hide Debug" : "Show Debug"}
        </Button>
      </div>
      
      <Tabs defaultValue="user1" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-4">
          <TabsTrigger value="user1" className="text-center">User 1 (KennyB)</TabsTrigger>
          <TabsTrigger value="user2" className="text-center">User 2 (JaneDoe)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="user1" className="w-full">
          <Card>
            <CardHeader className="bg-indigo-50 dark:bg-indigo-950">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{USER_1.avatar}</span>
                <span>{USER_1.username}</span>
                <Badge variant="outline" className="ml-auto">ID: {USER_1.id}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4">
                <RtcTestCallUI
                  matchId={MOCK_MATCH_ID}
                  otherUserId={USER_2.id}
                  otherUserName={USER_2.username}
                  otherUser={{
                    id: USER_2.id,
                    username: USER_2.username,
                    avatar: USER_2.avatar
                  }}
                  callDay={callDay}
                  onClose={handleCallEnded}
                  autoStart={false}
                  arePhotosRevealed={callDay >= 3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="user2" className="w-full">
          <Card>
            <CardHeader className="bg-pink-50 dark:bg-pink-950">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{USER_2.avatar}</span>
                <span>{USER_2.username}</span>
                <Badge variant="outline" className="ml-auto">ID: {USER_2.id}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4">
                <RtcTestCallUI
                  matchId={MOCK_MATCH_ID}
                  otherUserId={USER_1.id}
                  otherUserName={USER_1.username}
                  otherUser={{
                    id: USER_1.id,
                    username: USER_1.username,
                    avatar: USER_1.avatar
                  }}
                  callDay={callDay}
                  onClose={handleCallEnded}
                  autoStart={false}
                  arePhotosRevealed={callDay >= 3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {showDebug && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Debug Logs</h3>
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md h-40 overflow-y-auto text-xs font-mono">
            {logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
          <div className="mt-2 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLogs([])}
            >
              Clear Logs
            </Button>
          </div>
        </div>
      )}
      
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>This is a test page for the rtctest WebSocket implementation</p>
        <p>You can use this page to simulate calls between two users</p>
      </div>
    </div>
  );
}