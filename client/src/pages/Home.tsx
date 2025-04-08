import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/types';
import { AuthModal } from '@/components/AuthModal';
import { useLocation } from 'wouter';
import { EventCard } from '@/components/EventCard';
import { isLoggedIn } from '@/lib/auth';

export default function Home() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [_, navigate] = useLocation();

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['/api/events'],
  });

  const handleAuthSuccess = () => {
    navigate('/dashboard');
  };

  // Show only limited events for non-authenticated users
  const displayEvents = events.slice(0, 3) as Event[];

  if (isLoggedIn()) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to EventPoll</h2>
          <p className="text-gray-600 mb-6">Sign in or register to vote for upcoming events.</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => setAuthModalOpen(true)}
              size="lg"
            >
              Log In
            </Button>
            <Button 
              variant="outline"
              onClick={() => setAuthModalOpen(true)}
              size="lg"
            >
              Register
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Events</h3>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, index) => (
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayEvents.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    hasVoted={false}
                    onAuthRequired={() => setAuthModalOpen(true)}
                    readOnly={true}
                  />
                ))}
              </div>
              
              <p className="mt-6 text-center text-sm text-gray-600">
                <Button 
                  variant="link" 
                  onClick={() => setAuthModalOpen(true)}
                >
                  Register now
                </Button> 
                to see all events and vote.
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
