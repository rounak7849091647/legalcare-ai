import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, MapPin, Trash2, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  is_all_day: boolean;
  case_id: string | null;
}

interface CalendarViewProps {
  userId: string;
}

const eventTypes = ['hearing', 'meeting', 'deadline', 'consultation', 'court_date', 'other'];

const CalendarView = ({ userId }: CalendarViewProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'meeting',
    start_date: '',
    start_time: '',
    end_time: '',
    location: '',
    is_all_day: false
  });

  const fetchEvents = async () => {
    setIsLoading(true);
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      toast.error('Failed to fetch events');
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [userId, currentMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.start_date) {
      toast.error('Please fill in required fields');
      return;
    }

    const startDateTime = formData.is_all_day 
      ? new Date(`${formData.start_date}T00:00:00`)
      : new Date(`${formData.start_date}T${formData.start_time || '09:00'}`);

    const endDateTime = formData.end_time 
      ? new Date(`${formData.start_date}T${formData.end_time}`)
      : null;

    const eventData = {
      user_id: userId,
      title: formData.title,
      description: formData.description || null,
      event_type: formData.event_type,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime?.toISOString() || null,
      location: formData.location || null,
      is_all_day: formData.is_all_day
    };

    const { error } = await supabase
      .from('calendar_events')
      .insert([eventData]);

    if (error) {
      toast.error('Failed to create event');
    } else {
      toast.success('Event created successfully');
      fetchEvents();
      resetForm();
      setIsDialogOpen(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      toast.error('Failed to delete event');
    } else {
      toast.success('Event deleted');
      fetchEvents();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'meeting',
      start_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      location: '',
      is_all_day: false
    });
  };

  const openNewEventDialog = (date?: Date) => {
    if (date) setSelectedDate(date);
    setFormData({
      ...formData,
      start_date: format(date || selectedDate, 'yyyy-MM-dd')
    });
    setIsDialogOpen(true);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), date));
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'hearing': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'court_date': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'deadline': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'meeting': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'consultation': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Calendar</h2>
          <p className="text-sm text-muted-foreground">Manage your schedule and appointments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => openNewEventDialog()}>
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_all_day"
                  checked={formData.is_all_day}
                  onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_all_day" className="text-sm">All day event</Label>
              </div>

              {!formData.is_all_day && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event details"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Event</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
                >
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first of the month */}
              {[...Array(startOfMonth(currentMonth).getDay())].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {days.map(day => {
                const dayEvents = getEventsForDate(day);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square p-1 rounded-lg border transition-colors flex flex-col items-center justify-start gap-1 ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : isTodayDate
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-transparent hover:border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className={`text-sm ${
                      isTodayDate ? 'font-bold text-primary' : ''
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {format(selectedDate, 'EEEE, MMM d')}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => openNewEventDialog(selectedDate)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events scheduled</p>
                <Button 
                  variant="link" 
                  className="text-sm"
                  onClick={() => openNewEventDialog(selectedDate)}
                >
                  Add an event
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map(event => (
                  <div 
                    key={event.id}
                    className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <Badge variant="outline" className={`text-xs mt-1 ${getEventTypeColor(event.event_type)}`}>
                          {event.event_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(event.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {!event.is_all_day && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.start_time), 'h:mm a')}
                          {event.end_time && ` - ${format(new Date(event.end_time), 'h:mm a')}`}
                        </div>
                      )}
                      {event.is_all_day && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          All day
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarView;
