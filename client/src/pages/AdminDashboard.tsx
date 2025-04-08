import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { isLoggedIn, isAdmin, getUser } from '@/lib/auth';
import { Event, User, Log, NewEvent, VoteDetail } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { CalendarIcon, Trash2, ClipboardList, User as UserIcon, Calendar, Edit, X, Clock } from 'lucide-react';
import { BadgeDisplay } from '@/components/BadgeDisplay';

export default function AdminDashboard() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [adminView, setAdminView] = useState<'events' | 'users' | 'logs' | 'registrations'>('events');
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [showEditEventForm, setShowEditEventForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<NewEvent>({
    title: '',
    description: '',
    date: '',
  });
  
  // State for date picker
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(undefined);
  const [newEventTime, setNewEventTime] = useState<string>('');
  const [editEventDate, setEditEventDate] = useState<Date | undefined>(undefined);
  const [editEventTime, setEditEventTime] = useState<string>('');
  
  // State for balance editing
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newBalance, setNewBalance] = useState(0);

  const [user, setUser] = useState(getUser());
  
  // Redirect if not logged in or not admin
  useEffect(() => {
    // Get the latest user data
    const currentUser = getUser();
    setUser(currentUser);
    
    if (!currentUser) {
      navigate('/');
    } else if (!currentUser.isAdmin) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Fetch events
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });
  
  // Fetch event voters
  const { data: eventVotersMap = {} } = useQuery<Record<number, VoteDetail[]>>({
    queryKey: ['/api/event-voters', user?.id],
    enabled: !!user?.id && adminView === 'events',
    queryFn: async () => {
      const votersMap: Record<number, VoteDetail[]> = {};
      
      // Fetch voters for each event
      if (events.length > 0) {
        for (const event of events) {
          const voters = await apiRequest<VoteDetail[]>('GET', 
            `/api/votes/event/${event.id}?userId=${user?.id}`);
          votersMap[event.id] = voters;
        }
      }
      
      return votersMap;
    }
  });

  // Fetch users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch logs
  const { data: logs = [] } = useQuery<Log[]>({
    queryKey: ['/api/logs'],
  });
  
  // Fetch vote details
  const { data: voteDetails = [], isLoading: voteDetailsLoading } = useQuery<VoteDetail[]>({
    queryKey: ['/api/votes', user?.id],
    enabled: adminView === 'registrations' && !!user?.id,
    queryFn: async () => {
      return await apiRequest<VoteDetail[]>('GET', `/api/votes?userId=${user?.id}`);
    }
  });
  
  // Fetch votes by event
  const { data: eventVotes = [], isLoading: eventVotesLoading } = useQuery<VoteDetail[]>({
    queryKey: ['/api/votes/event', selectedEventId, user?.id],
    enabled: adminView === 'registrations' && selectedEventId !== null && !!user?.id,
    queryFn: async () => {
      return await apiRequest<VoteDetail[]>('GET', `/api/votes/event/${selectedEventId}?userId=${user?.id}`);
    }
  });
  
  // Fetch votes by user
  const { data: userVotes = [], isLoading: userVotesLoading } = useQuery<VoteDetail[]>({
    queryKey: ['/api/votes/user', selectedUserId, user?.id],
    enabled: adminView === 'registrations' && selectedUserId !== null && !!user?.id,
    queryFn: async () => {
      return await apiRequest<VoteDetail[]>('GET', `/api/votes/user/${selectedUserId}?userId=${user?.id}`);
    }
  });

  const addEventMutation = useMutation({
    mutationFn: async (event: NewEvent) => {
      await apiRequest('POST', '/api/events', event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      setShowAddEventForm(false);
      setNewEvent({
        title: '',
        description: '',
        date: '',
      });
      // Reset date and time states
      setNewEventDate(undefined);
      setNewEventTime('');
      toast({
        title: 'Success',
        description: 'Event added successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add event',
        variant: 'destructive',
      });
    },
  });

  const removeEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest('DELETE', `/api/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      toast({
        title: 'Success',
        description: 'Event removed successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove event',
        variant: 'destructive',
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      toast({
        title: 'Success',
        description: 'User removed successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove user',
        variant: 'destructive',
      });
    },
  });
  
  const updateEventMutation = useMutation({
    mutationFn: async (event: Partial<Event>) => {
      if (!event.id) return;
      return await apiRequest('PATCH', `/api/events/${event.id}?userId=${user?.id}`, event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      setShowEditEventForm(false);
      setEventToEdit(null);
      // Reset date and time states
      setEditEventDate(undefined);
      setEditEventTime('');
      toast({
        title: 'Success',
        description: 'Event updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive',
      });
    },
  });

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine date and time
    const dateTimeStr = combineDateAndTime(newEventDate, newEventTime);
    
    if (dateTimeStr) {
      // Update the date field with the combined date and time
      const updatedEvent = {
        ...newEvent,
        date: dateTimeStr
      };
      
      addEventMutation.mutate(updatedEvent);
      
      // Reset date and time states
      setNewEventDate(undefined);
      setNewEventTime('');
    } else {
      toast({
        title: 'Error',
        description: 'Please select a valid date and time',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveEvent = (eventId: number) => {
    if (confirm('Are you sure you want to remove this event?')) {
      removeEventMutation.mutate(eventId);
    }
  };
  
  const handleEditEvent = (event: Event) => {
    setEventToEdit(event);
    
    // Parse the existing date string
    const { date, time } = parseEventDate(event.date);
    setEditEventDate(date);
    setEditEventTime(time);
    
    setShowEditEventForm(true);
  };
  
  const handleUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (eventToEdit) {
      // Combine date and time
      const dateTimeStr = combineDateAndTime(editEventDate, editEventTime);
      
      if (dateTimeStr) {
        // Update the date field with the combined date and time
        const updatedEvent = {
          ...eventToEdit,
          date: dateTimeStr
        };
        
        updateEventMutation.mutate(updatedEvent);
        
        // Reset date and time states
        setEditEventDate(undefined);
        setEditEventTime('');
      } else {
        toast({
          title: 'Error',
          description: 'Please select a valid date and time',
          variant: 'destructive',
        });
      }
    }
  };

  const handleRemoveUser = (userId: number) => {
    if (confirm('Are you sure you want to remove this user?')) {
      removeUserMutation.mutate(userId);
    }
  };
  
  const handleUpdateBalance = (user: User) => {
    setSelectedUser(user);
    setNewBalance(user.balance);
    setIsEditingBalance(true);
  };
  
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, balance }: { userId: number; balance: number }) => {
      return await apiRequest('POST', `/api/user/balance?userId=${user?.id}`, { userId, balance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      setIsEditingBalance(false);
      toast({
        title: 'Success',
        description: 'User balance updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update user balance',
        variant: 'destructive',
      });
    },
  });
  
  const handleUpdatePaymentStatus = useMutation({
    mutationFn: async ({ userId, eventId, paid }: { userId: number; eventId: number; paid: boolean }) => {
      return await apiRequest('POST', `/api/payment/status?userId=${user?.id}`, { userId, eventId, paid });
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/votes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/votes/event'] });
      queryClient.invalidateQueries({ queryKey: ['/api/votes/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      toast({
        title: 'Success',
        description: 'Payment status updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update payment status',
        variant: 'destructive',
      });
    },
  });

  const formattedDate = (date: string | Date) => {
    if (typeof date === 'string') {
      return new Date(date).toLocaleString();
    }
    return date.toLocaleString();
  };
  
  // Generate time options in 30-minute increments with AM/PM format
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour <= 22; hour++) { // Limit from 8 AM to 10 PM
      const isPM = hour >= 12;
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      options.push(`${displayHour}:00 ${isPM ? 'PM' : 'AM'}`);
      options.push(`${displayHour}:30 ${isPM ? 'PM' : 'AM'}`);
    }
    return options;
  };
  
  // Combine date and time into a formatted string
  const combineDateAndTime = (date: Date | undefined, time: string): string => {
    if (!date) return '';
    
    const formattedDate = format(date, 'MMMM d, yyyy');
    return time ? `${formattedDate} at ${time}` : formattedDate;
  };
  
  // Parse existing date string when opening edit form
  const parseEventDate = (dateString: string) => {
    try {
      // Attempt to extract date and time from string like "June 15, 2023 at 14:30"
      const match = dateString.match(/(.+?)(?:\s+at\s+(\d{1,2}:\d{2}))?$/);
      
      if (match) {
        const datePart = match[1];
        const timePart = match[2] || '';
        
        // Try to parse the date
        const parsedDate = new Date(datePart);
        
        if (!isNaN(parsedDate.getTime())) {
          return { date: parsedDate, time: timePart };
        }
      }
    } catch (error) {
      console.error("Error parsing date:", error);
    }
    
    return { date: undefined, time: '' };
  };

  const getBadgeClassForAction = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'REGISTER':
        return 'bg-blue-100 text-blue-800';
      case 'VOTE':
        return 'bg-green-100 text-green-800';
      case 'UNVOTE':
      case 'REMOVE':
        return 'bg-red-100 text-red-800';
      case 'ADD':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user || !user.isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Admin Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            <Button 
              onClick={() => setAdminView('events')} 
              variant={adminView === 'events' ? 'default' : 'secondary'}
              className="flex justify-center md:justify-start"
              size="sm"
            >
              <Calendar className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline ml-2">Games</span>
            </Button>
            <Button 
              onClick={() => setAdminView('users')} 
              variant={adminView === 'users' ? 'default' : 'secondary'}
              className="flex justify-center md:justify-start"
              size="sm"
            >
              <UserIcon className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline ml-2">Users</span>
            </Button>
            <Button 
              onClick={() => setAdminView('logs')} 
              variant={adminView === 'logs' ? 'default' : 'secondary'}
              className="flex justify-center md:justify-start"
              size="sm"
            >
              <ClipboardList className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline ml-2">Logs</span>
            </Button>
            <Button 
              onClick={() => {
                setAdminView('registrations');
                setSelectedEventId(null);
                setSelectedUserId(null);
              }} 
              variant={adminView === 'registrations' ? 'default' : 'secondary'}
              className="flex justify-center md:justify-start"
              size="sm"
            >
              <svg className="w-4 h-4 md:mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span className="hidden md:inline ml-2">Registrations</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Games Management Panel */}
      {adminView === 'events' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Manage Games</h2>
              <Button 
                onClick={() => setShowAddEventForm(!showAddEventForm)}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Game
              </Button>
            </div>
            
            {/* Add Game Form */}
            {showAddEventForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Game</h3>
                <form onSubmit={handleAddEvent}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventTitle">Game Title</Label>
                      <Input 
                        id="eventTitle" 
                        value={newEvent.title} 
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventDate">Game Date</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newEventDate ? format(newEventDate, 'PPP') : (
                                <span className="text-muted-foreground">Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={newEventDate}
                              onSelect={setNewEventDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Select
                            value={newEventTime}
                            onValueChange={setNewEventTime}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {generateTimeOptions().map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {/* Hidden required field with the combined value */}
                      <input
                        type="hidden"
                        value={combineDateAndTime(newEventDate, newEventTime)}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-4 space-y-2">
                    <Label htmlFor="eventDescription">Description</Label>
                    <Textarea 
                      id="eventDescription" 
                      value={newEvent.description} 
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddEventForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addEventMutation.isPending}
                    >
                      Add Game
                    </Button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Edit Game Form */}
            {showEditEventForm && eventToEdit && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Edit Game</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setShowEditEventForm(false);
                      setEventToEdit(null);
                    }}
                    className="text-gray-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <form onSubmit={handleUpdateEvent}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="editEventTitle">Game Title</Label>
                      <Input 
                        id="editEventTitle" 
                        value={eventToEdit.title} 
                        onChange={(e) => setEventToEdit({ ...eventToEdit, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editEventDate">Game Date</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editEventDate ? format(editEventDate, 'PPP') : (
                                <span className="text-muted-foreground">Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={editEventDate}
                              onSelect={setEditEventDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Select
                            value={editEventTime}
                            onValueChange={setEditEventTime}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {generateTimeOptions().map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {/* Hidden required field with the combined value */}
                      <input
                        type="hidden"
                        value={combineDateAndTime(editEventDate, editEventTime)}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-4 space-y-2">
                    <Label htmlFor="editEventDescription">Description</Label>
                    <Textarea 
                      id="editEventDescription" 
                      value={eventToEdit.description} 
                      onChange={(e) => setEventToEdit({ ...eventToEdit, description: e.target.value })}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditEventForm(false);
                        setEventToEdit(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateEventMutation.isPending}
                    >
                      Update Game
                    </Button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Games Table - Desktop View */}
            <div className="overflow-x-auto -mx-6 md:mx-0 md:overflow-visible hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 table-fixed md:w-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5 md:w-auto">Game</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Date</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Votes</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event: Event) => (
                    <tr key={event.id}>
                      <td className="px-3 md:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {eventVotersMap[event.id]?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {eventVotersMap[event.id].map((voter, index) => (
                                <span 
                                  key={`${voter.userId}-${index}`} 
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {voter.userName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No attendees yet</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.date}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.votes}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            onClick={() => handleEditEvent(event)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={() => handleRemoveEvent(event.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Games Cards - Mobile View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {events.map((event: Event) => (
                <Card key={event.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditEvent(event)}
                          className="h-8 w-8 p-0 text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveEvent(event.id)}
                          className="h-8 w-8 p-0 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-2">
                      <p>{event.date}</p>
                      <p className="font-medium">{event.votes} sign-ups</p>
                    </div>
                    
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">Attendees:</div>
                      {eventVotersMap[event.id]?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {eventVotersMap[event.id].map((voter, index) => (
                            <span 
                              key={`${voter.userId}-${index}`} 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {voter.userName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No attendees yet</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Users Management Panel */}
      {adminView === 'users' && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Users</h2>
            
            {/* Users Table */}
            <div className="overflow-x-auto -mx-6 md:mx-0 md:overflow-visible">
              <table className="min-w-full divide-y divide-gray-200 table-fixed md:w-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Name</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Role</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto hidden md:table-cell">Registrations</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Badges</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto hidden md:table-cell">Participations</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto hidden md:table-cell">Balance</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user: User) => (
                    <tr key={user.id}>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant="outline"
                          className={user.isAdmin ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}
                        >
                          {user.isAdmin ? 'Admin' : 'User'}
                        </Badge>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{user.votes?.length || 0}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <BadgeDisplay user={user} compact={true} />
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{user.participationCount || 0}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm hidden md:table-cell">
                        <Badge 
                          variant="outline"
                          className={user.balance > 0 
                            ? "bg-green-100 text-green-800" 
                            : user.balance < 0 
                              ? "bg-red-100 text-red-800" 
                              : "bg-gray-100 text-gray-800"}
                        >
                          {user.balance} points
                        </Badge>
                        {!user.isAdmin && (
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateBalance(user)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!user.isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveUser(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4 md:hidden" />
                            <span className="hidden md:inline">Remove</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Logs Panel */}
      {adminView === 'logs' && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">System Logs</h2>
            
            {/* Logs Table */}
            <div className="overflow-x-auto -mx-6 md:mx-0 md:overflow-visible">
              <table className="min-w-full divide-y divide-gray-200 table-fixed md:w-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Timestamp</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log: Log) => (
                    <tr key={log.id}>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {formattedDate(log.timestamp)}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant="outline"
                          className={getBadgeClassForAction(log.action)}
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-[120px] md:max-w-none truncate md:whitespace-nowrap">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Registration Details Panel */}
      {adminView === 'registrations' && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Registration Details</h2>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div>
                <Label htmlFor="eventFilter" className="mb-2 block">Filter by Game</Label>
                <select 
                  id="eventFilter" 
                  className="p-2 border rounded-md"
                  value={selectedEventId || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedEventId(val ? parseInt(val) : null);
                    setSelectedUserId(null);
                  }}
                >
                  <option value="">All Games</option>
                  {events.map((event: Event) => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="userFilter" className="mb-2 block">Filter by User</Label>
                <select 
                  id="userFilter" 
                  className="p-2 border rounded-md"
                  value={selectedUserId || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedUserId(val ? parseInt(val) : null);
                    setSelectedEventId(null);
                  }}
                >
                  <option value="">All Users</option>
                  {users.map((user: User) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              
              {(selectedEventId || selectedUserId) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedEventId(null);
                    setSelectedUserId(null);
                  }}
                  className="self-end"
                >
                  Clear Filters
                </Button>
              )}
            </div>
            
            {/* Registration Details Table */}
            <div className="overflow-x-auto -mx-6 md:mx-0 md:overflow-visible">
              {voteDetailsLoading ? (
                <div className="py-8 text-center text-gray-500">Loading registration details...</div>
              ) : (
                <>
                  {selectedEventId && eventVotes && eventVotes.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2">Participants for Game: {eventVotes[0]?.eventTitle}</h3>
                      <table className="min-w-full divide-y divide-gray-200 table-fixed md:w-auto">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 md:w-auto">User</th>
                            <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 md:w-auto">Registered At</th>
                            <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 md:w-auto">Payment</th>
                            <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 md:w-auto">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {eventVotes.map((vote: VoteDetail, index: number) => (
                            <tr key={index}>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vote.userName}</td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formattedDate(vote.votedAt)}</td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                                <Badge 
                                  variant="outline"
                                  className={vote.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                >
                                  {vote.paid ? "Paid" : "Unpaid"}
                                </Badge>
                              </td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdatePaymentStatus.mutate({
                                    userId: vote.userId,
                                    eventId: vote.eventId,
                                    paid: !vote.paid
                                  })}
                                  className={vote.paid ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}
                                >
                                  {vote.paid ? "Mark Unpaid" : "Mark Paid"}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {selectedUserId && userVotes && userVotes.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2">Games Attended by User: {userVotes[0]?.userName}</h3>
                      <table className="min-w-full divide-y divide-gray-200 table-fixed md:w-auto">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 md:w-auto">Game</th>
                            <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 md:w-auto">Registered At</th>
                            <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 md:w-auto">Payment</th>
                            <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 md:w-auto">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {userVotes.map((vote: VoteDetail, index: number) => (
                            <tr key={index}>
                              <td className="px-3 md:px-6 py-4 whitespace-normal text-sm text-gray-900 max-w-[150px] md:max-w-none truncate md:whitespace-nowrap">{vote.eventTitle}</td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formattedDate(vote.votedAt)}</td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                                <Badge 
                                  variant="outline"
                                  className={vote.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                >
                                  {vote.paid ? "Paid" : "Unpaid"}
                                </Badge>
                              </td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdatePaymentStatus.mutate({
                                    userId: vote.userId,
                                    eventId: vote.eventId,
                                    paid: !vote.paid
                                  })}
                                  className={vote.paid ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}
                                >
                                  {vote.paid ? "Mark Unpaid" : "Mark Paid"}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {!selectedEventId && !selectedUserId && voteDetails && (
                    <table className="min-w-full divide-y divide-gray-200 table-fixed md:w-auto">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">User</th>
                          <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Game</th>
                          <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto hidden md:table-cell">Registered At</th>
                          <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Payment</th>
                          <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 md:w-auto">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {voteDetails.length > 0 ? (
                          voteDetails.map((vote: VoteDetail, index: number) => (
                            <tr key={index}>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate">{vote.userName}</td>
                              <td className="px-3 md:px-6 py-4 whitespace-normal text-sm text-gray-900 max-w-[150px] md:max-w-none truncate md:whitespace-nowrap">{vote.eventTitle}</td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{formattedDate(vote.votedAt)}</td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                                <Badge 
                                  variant="outline"
                                  className={vote.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                >
                                  {vote.paid ? "Paid" : "Unpaid"}
                                </Badge>
                              </td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdatePaymentStatus.mutate({
                                    userId: vote.userId,
                                    eventId: vote.eventId,
                                    paid: !vote.paid
                                  })}
                                  className={vote.paid ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}
                                >
                                  {vote.paid ? "Mark Unpaid" : "Mark Paid"}
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">No registration records found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Edit Balance Dialog */}
      <Dialog open={isEditingBalance} onOpenChange={setIsEditingBalance}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update User Balance</DialogTitle>
            <DialogDescription>
              Adjust the point balance for {selectedUser?.name}. Current balance: {selectedUser?.balance} points.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newBalance">New Balance</Label>
                <Input
                  id="newBalance"
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditingBalance(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedUser) {
                  updateBalanceMutation.mutate({ 
                    userId: selectedUser.id, 
                    balance: newBalance 
                  });
                }
              }}
              disabled={updateBalanceMutation.isPending}
            >
              {updateBalanceMutation.isPending ? "Updating..." : "Update Balance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
