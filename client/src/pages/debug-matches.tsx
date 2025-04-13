import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@shared/schema";
import { Loader2, Check, X } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface CompatibilityBreakdown {
  personality: number;
  location: number;
  age: number;
}

interface MatchResult extends Partial<User> {
  matchScore: number;
  compatibilityBreakdown: CompatibilityBreakdown;
}

export default function DebugMatches() {
  const { toast } = useToast();
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [debugData, setDebugData] = useState<any>(null);
  
  // Get current user
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ['/api/user'],
    retry: false,
  });

  // Generate matches mutation
  const generateMatchesMutation = useMutation({
    mutationFn: async () => {
      setIsGeneratingMatches(true);
      try {
        const response = await apiRequest('POST', '/api/generate-matches');
        return await response.json();
      } finally {
        setIsGeneratingMatches(false);
      }
    },
    onSuccess: (data) => {
      console.log('Match generation results:', data);
      setMatchResults(data.matchResults || []);
      setDebugData(data);
      
      // Invalidate matches query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      
      toast({
        title: "Match Generation Complete",
        description: `Found ${data.matchResults?.length || 0} potential matches.` +
          ` Created ${data.newMatches?.length || 0} new matches.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error generating matches:', error);
      toast({
        title: "Match Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Get existing matches
  const { data: matches = [], isLoading: isLoadingMatches } = useQuery<any[]>({
    queryKey: ['/api/matches'],
    retry: false,
  });
  
  const handleGenerateMatches = () => {
    generateMatchesMutation.mutate();
  };
  
  // Return loading state if still fetching user data
  if (isLoadingUser) {
    return (
      <div className="container max-w-4xl mx-auto py-10 space-y-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  // If not authenticated, show message
  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-10 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to be logged in to access this page.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => window.location.href = "/auth"}>Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-5xl mx-auto py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Match Algorithm Debugging</CardTitle>
          <CardDescription>
            Analyze and generate matches for the current user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Current User</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar>
                    {user.avatar && <AvatarFallback>{user.avatar}</AvatarFallback>}
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.name}</p>
                  </div>
                </div>
                <p>
                  <span className="font-medium">Gender:</span> {user.gender || "Not specified"}
                </p>
                <p>
                  <span className="font-medium">Interested in:</span>{" "}
                  {user.interestedGenders && user.interestedGenders.length > 0 
                    ? user.interestedGenders.join(", ") 
                    : "Not specified"}
                </p>
                <p>
                  <span className="font-medium">Age:</span> {user.age || "Not specified"}
                </p>
                <p>
                  <span className="font-medium">Location:</span> {user.location || "Not specified"}
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Matching Information</h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Current Matches:</span>{" "}
                  {isLoadingMatches 
                    ? <Loader2 className="inline h-4 w-4 animate-spin ml-2" /> 
                    : matches?.length || 0}
                </p>
                <p>
                  <span className="font-medium">Communication Style:</span>{" "}
                  {user.communicationStyle || "Not specified"}
                </p>
                <p>
                  <span className="font-medium">Values:</span>{" "}
                  {user.values || "Not specified"}
                </p>
                <p>
                  <span className="font-medium">Conflict Resolution:</span>{" "}
                  {user.conflictResolution || "Not specified"}
                </p>
                <p>
                  <span className="font-medium">Activities:</span>{" "}
                  {user.freeTimeActivities && user.freeTimeActivities.length > 0 
                    ? user.freeTimeActivities.join(", ") 
                    : "Not specified"}
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleGenerateMatches} 
            disabled={isGeneratingMatches || generateMatchesMutation.isPending}
          >
            {(isGeneratingMatches || generateMatchesMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Generate Matches
          </Button>
        </CardContent>
      </Card>
      
      {/* Match Results */}
      {matchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
            <CardDescription>
              Top {matchResults.length} potential matches and their compatibility scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchResults.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar>
                            {match.avatar && <AvatarFallback>{match.avatar}</AvatarFallback>}
                          </Avatar>
                          <div>
                            <p className="font-medium">{match.username}</p>
                            <p className="text-sm text-muted-foreground">{match.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          match.matchScore > 80 ? "default" : 
                          match.matchScore > 60 ? "secondary" : 
                          "outline"
                        }>
                          {Math.round(match.matchScore)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{match.gender || "Not set"}</p>
                          <p className="text-xs text-muted-foreground">
                            Interested in: {match.interestedGenders?.join(", ") || "Not set"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{match.age || "Not set"}</TableCell>
                      <TableCell>{match.location || "Not set"}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <p>
                            Personality: {Math.round(match.compatibilityBreakdown.personality * 100)}%
                          </p>
                          <p>
                            Location: {Math.round(match.compatibilityBreakdown.location * 100)}%
                          </p>
                          <p>
                            Age: {Math.round(match.compatibilityBreakdown.age * 100)}%
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Debug Data */}
      {debugData && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>
              Raw data from the matching process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-md overflow-auto">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}