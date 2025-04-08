import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, UserPlus } from 'lucide-react';
import { Event, VoteDetail } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getUser } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventCardProps {
  event: Event;
  hasVoted: boolean;
  onAuthRequired?: () => void;
  readOnly?: boolean;
}

export function EventCard({ event, hasVoted, onAuthRequired, readOnly = false }: EventCardProps) {
  const { toast } = useToast();
  const user = getUser();
  const [additionalPlayers, setAdditionalPlayers] = useState<number>(0);
  
  // Fetch event voters
  const { data: eventVoters = [] } = useQuery<VoteDetail[]>({
    queryKey: ['/api/votes/event', event.id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      return await apiRequest<VoteDetail[]>('GET', `/api/votes/event/${event.id}?userId=${user?.id}`);
    }
  });

  const toggleVote = async () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }

    try {
      const endpoint = hasVoted ? '/api/unvote' : '/api/vote';
      await apiRequest('POST', endpoint, {
        userId: user.id,
        eventId: event.id,
        additionalPlayers: additionalPlayers
      });

      // Invalidate user and events queries
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/votes/event', event.id, user?.id] });

      toast({
        title: hasVoted ? 'Vote removed' : 'Vote added',
        description: hasVoted 
          ? `Vote removed from "${event.title}"`
          : `Vote added for "${event.title}"${additionalPlayers > 0 ? ` with ${additionalPlayers} additional player${additionalPlayers > 1 ? 's' : ''}` : ''}`,
        variant: hasVoted ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('Error toggling vote:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your vote. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAdditionalPlayersChange = (value: string) => {
    setAdditionalPlayers(parseInt(value));
  };

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{event.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{event.description}</p>
          <div className="text-sm text-gray-600 mb-3">
            <h4 className="font-medium text-gray-700 mb-1">Players:</h4>
            {eventVoters.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {eventVoters.map((voter, index) => (
                  <Badge 
                    key={`${voter.userId}-${index}`} 
                    variant="outline"
                    className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    {voter.userName}
                    {voter.additionalPlayers > 0 && (
                      <span className="ml-1 text-xs text-blue-600">
                        +{voter.additionalPlayers}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 italic">No players signed up yet</span>
            )}
          </div>
          <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 inline mr-1" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 inline mr-1" />
              <span>{event.votes} players</span>
            </div>
          </div>
        </div>
        
        {!readOnly && (
          <div className="space-y-2">
            {!hasVoted && (
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Additional players:</span>
                <Select onValueChange={handleAdditionalPlayersChange} defaultValue="0">
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="0" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={toggleVote}
              variant={hasVoted ? "default" : "outline"}
              className={hasVoted ? "bg-green-600 hover:bg-green-700 w-full" : "w-full"}
            >
              {hasVoted ? (
                <>
                  <Check className="h-5 w-5 mr-1" />
                  Signed Up
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
