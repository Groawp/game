import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { EventCard } from '@/components/EventCard';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { getUser } from '@/lib/auth';
import { Event, User } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';

export default function UserDashboard() {
  const [_, navigate] = useLocation();
  const [user, setUser] = useState(getUser());

  // Redirect if not logged in
  useEffect(() => {
    // Get the latest user data
    const currentUser = getUser();
    setUser(currentUser);
    
    if (!currentUser) {
      navigate('/');
    }
  }, [navigate]);

  // Fetch events
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  // Fetch fresh user data for votes
  const { data: currentUser = user } = useQuery<User>({
    queryKey: ['/api/user'],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("No user ID");
      const users = await apiRequest<User[]>('GET', '/api/users');
      const currentUser = users.find(u => u.id === user.id);
      if (!currentUser) throw new Error("User not found");
      return currentUser;
    },
  });
  
  if (!currentUser) return null;

  const hasVoted = (eventId: number) => {
    return currentUser.votes.includes(eventId);
  };

  return (
    <div className="space-y-6">
      {/* Badge Display Card */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Achievements</h2>
          <div className="mb-6">
            <BadgeDisplay user={currentUser} />
          </div>
        </CardContent>
      </Card>
          
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Events</h2>
          <p className="text-gray-600 mb-6">Vote for the events you'd like to attend. You can change your vote at any time.</p>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="h-48">
                  <CardContent className="p-5 flex flex-col animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event: Event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  hasVoted={hasVoted(event.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
