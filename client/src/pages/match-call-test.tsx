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

// We'll use a real match ID from the database
// The match ID will be fetched or created when the component loads

// Type for match users
type TestUser = {
  id: number;
  username: string;
  avatar?: string;
  color: string;
};

// Current logged in user
const USER_1: TestUser = { 
  id: 17, 
  username: "KennyB", 
  avatar: "🎧", 
  color: "#4f46e5" 
};

// Match user will be populated from the actual match data
const DEFAULT_USER_2: TestUser = { 
  id: 2, 
  username: "FemTest", 
  avatar: "🌸", 
  color: "#9B1D54" 
};

export default function MatchCallTest() {
  const { user: loggedInUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("user1");
  const [callDay, setCallDay] = useState<number>(1);
  const [showDebug, setShowDebug] = useState<boolean>(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [matchedUserId, setMatchedUserId] = useState<number | null>(null);
  const [matchedUser, setMatchedUser] = useState<TestUser>(DEFAULT_USER_2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Reference to log end for auto-scrolling
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Connect matched user to rtctest WebSocket for testing
  useEffect(() => {
    // Function to connect matched user to WebSocket for testing
    const connectMatchedUser = () => {
      if (!matchedUserId) {
        addLog('[MatchedUser] No matched user ID available yet');
        return () => {};
      }

      // Connect to the rtctest WebSocket server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/rtctest`;
      
      try {
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          addLog(`[MatchedUser] Connected to rtctest WebSocket`);
          
          // Register with the server as the matched user
          const registerMessage = {
            type: 'register',
            userId: matchedUser.id
          };
          
          socket.send(JSON.stringify(registerMessage));
          addLog(`[MatchedUser] Registered with rtctest server as User ${matchedUser.id} (${matchedUser.username})`);
        };
        
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            addLog(`[MatchedUser] Received message: ${data.type}`);
            
            // If we receive a signal from User 1, send back an appropriate response
            if (data.type === 'rtc-signal' && data.fromUserId === USER_1.id) {
              addLog(`[MatchedUser] Received rtc-signal from User ${USER_1.id}`);
              
              // Send a response back to User 1
              const responseMessage = {
                type: 'rtc-signal',
                targetUserId: USER_1.id,
                signalData: {
                  // Echo back the received signal with a response type
                  ...data.signalData,
                  type: data.signalData.type === 'offer' ? 'answer' : 'response',
                  responding: true
                }
              };
              
              socket.send(JSON.stringify(responseMessage));
              addLog(`[MatchedUser] Sent rtc-signal response to User ${USER_1.id}`);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };
        
        socket.onclose = () => {
          addLog(`[MatchedUser] Disconnected from rtctest WebSocket`);
        };
        
        socket.onerror = (error) => {
          addLog(`[MatchedUser] WebSocket error: ${error}`);
        };
        
        // Return a cleanup function
        return () => {
          socket.close();
        };
      } catch (err) {
        addLog(`[MatchedUser] Failed to connect to WebSocket: ${err}`);
        return () => {};
      }
    };
    
    // Connect matched user after a delay to ensure UI is ready
    // Only connect when we have a matched user ID
    if (matchedUserId) {
      const timer = setTimeout(connectMatchedUser, 2000);
      return () => clearTimeout(timer);
    }
  }, [matchedUserId, matchedUser, USER_1]);
  
  // Fetch one of the user's matches for testing
  useEffect(() => {
    const fetchUserMatch = async () => {
      if (!loggedInUser) return;
      
      try {
        setIsLoading(true);
        // Fetch user's matches
        const response = await fetch('/api/matches');
        if (!response.ok) {
          throw new Error('Failed to fetch matches');
        }
        
        const matches = await response.json();
        
        if (matches && matches.length > 0) {
          const match = matches[0];
          setMatchId(match.id);
          addLog(`Using real match ID: ${match.id}`);
          
          // Determine which user is the match (the one that's not us)
          const ourUserId = loggedInUser.id;
          const otherUserId = match.userId1 === ourUserId ? match.userId2 : match.userId1;
          setMatchedUserId(otherUserId);
          
          try {
            // Fetch the matched user details
            const userResponse = await fetch(`/api/users/${otherUserId}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              
              // Create formatted user object for the matched user
              setMatchedUser({
                id: userData.id,
                username: userData.username, 
                avatar: userData.avatar || "🌸",
                color: "#9B1D54"
              });
              
              addLog(`Found matched user: ${userData.username} (ID: ${userData.id})`);
            } else {
              // If we can't get the user, just use the default
              addLog(`Couldn't fetch matched user ${otherUserId}, using default`);
            }
          } catch (userErr) {
            // If there's an error, use the default user
            addLog(`Error fetching matched user: ${userErr}`);
          }
        } else {
          setError('No matches found. Please create a match first.');
          addLog('No matches found for testing');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load match';
        setError(message);
        addLog(`Error: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserMatch();
  }, [loggedInUser]);
  
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
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p>Loading match data...</p>
        </div>
      )}
      
      {/* Error State */}
      {error && !isLoading && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <p className="text-sm">Make sure you have at least one match in your account to test with.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Match ID Badge */}
      {matchId && (
        <div className="mb-4 text-center">
          <Badge variant="outline" className="text-lg px-3 py-1">
            Using Match ID: {matchId}
          </Badge>
        </div>
      )}
      
      {/* Control Buttons */}
      {!isLoading && matchId && (
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
      )}
      
      {/* Call Interfaces */}
      {!isLoading && matchId && (
        <Tabs defaultValue="user1" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-4">
            <TabsTrigger value="user1" className="text-center">User 1 (KennyB)</TabsTrigger>
            <TabsTrigger value="user2" className="text-center">User 2 ({matchedUser.username})</TabsTrigger>
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
                    matchId={matchId}
                    otherUserId={matchedUser.id}
                    otherUserName={matchedUser.username}
                    otherUser={{
                      id: matchedUser.id,
                      username: matchedUser.username,
                      avatar: matchedUser.avatar
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
                  <span className="text-2xl">{matchedUser.avatar}</span>
                  <span>{matchedUser.username}</span>
                  <Badge variant="outline" className="ml-auto">ID: {matchedUser.id}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <RtcTestCallUI
                    matchId={matchId}
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
      )}
      
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