import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, MapPin, Trash2, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday,
} from 'date-fns';

interface CalendarEvent {
  id: string; title: string; description: string | null;
  event_type: string; start_time: string; end_time: string | null;
  location: string | null; is_all_day: boolean; case_id: string | null;
}

const eventTypes = ['hearing','meeting','deadline','consultation','court_date','other'];

const emptyForm = {
  title:'', description:'', event_type:'meeting',
  start_date:'', start_time:'', end_time:'', location:'', is_all_day: false,
};

const CalendarView = ({ userId }: { userId: string }) => {
  const [events, setEvents]             = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData]         = useState({ ...emptyForm });

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const start = startOfMonth(currentMonth).toISOString();
      const end   = endOfMonth(currentMonth).toISOString();
      const data  = await authFetch<CalendarEvent[]>(`/api/calendar-events?from=${start}&to=${end}`);
      setEvents(data || []);
    } catch {
      toast.error('Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [userId, currentMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.start_date) { toast.error('Please fill in required fields'); return; }

    const startDateTime = formData.is_all_day
      ? new Date(`${formData.start_date}T00:00:00`)
      : new Date(`${formData.start_date}T${formData.start_time || '09:00'}`);
    const endDateTime = formData.end_time ? new Date(`${formData.start_date}T${formData.end_time}`) : null;

    try {
      await authFetch('/api/calendar-events', {
        method: 'POST',
        body: JSON.stringify({
          title:       formData.title,
          description: formData.description || null,
          event_type:  formData.event_type,
          start_time:  startDateTime.toISOString(),
          end_time:    endDateTime?.toISOString() || null,
          location:    formData.location || null,
          is_all_day:  formData.is_all_day,
        }),
      });
      toast.success('Event created successfully');
      fetchEvents();
      resetForm();
      setIsDialogOpen(false);
    } catch {
      toast.error('Failed to create event');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await authFetch(`/api/calendar-events/${eventId}`, { method: 'DELETE' });
      toast.success('Event deleted');
      fetchEvents();
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const resetForm = () => {
    setFormData({ ...emptyForm, start_date: format(selectedDate, 'yyyy-MM-dd') });
  };

  const openNewEventDialog = (date?: Date) => {
    if (date) setSelectedDate(date);
    setFormData({ ...emptyForm, start_date: format(date || selectedDate, 'yyyy-MM-dd') });
    setIsDialogOpen(true);
  };

  const getEventsForDate   = (d: Date) => events.filter(e => isSameDay(new Date(e.start_time), d));
  const selectedDateEvents = getEventsForDate(selectedDate);
  const days               = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'hearing':      return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'court_date':   return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'deadline':     return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'meeting':      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'consultation': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:             return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Calendar</h2>
          <p className="text-sm text-muted-foreground">Manage your schedule and appointments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => openNewEventDialog()}><Plus className="w-4 h-4" />New Event</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create New Event</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Enter event title" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select value={formData.event_type} onValueChange={v => setFormData({ ...formData, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{eventTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_',' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_all_day" checked={formData.is_all_day} onChange={e => setFormData({ ...formData, is_all_day: e.target.checked })} className="rounded" />
                <Label htmlFor="is_all_day" className="text-sm">All day event</Label>
              </div>
              {!formData.is_all_day && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Enter location" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Event details" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
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
              <CardTitle className="text-lg">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>Today</Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(startOfMonth(currentMonth).getDay())].map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
              {days.map(day => {
                const dayEvents  = getEventsForDate(day);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayD   = isToday(day);
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                    className={`aspect-square p-1 rounded-lg border transition-colors flex flex-col items-center justify-start gap-1 ${
                      isSelected ? 'border-primary bg-primary/10' : isTodayD ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:border-border hover:bg-muted/50'
                    }`}>
                    <span className={`text-sm ${isTodayD ? 'font-bold text-primary' : ''}`}>{format(day, 'd')}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5">
                        {dayEvents.slice(0,3).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />)}
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
              <CardTitle className="text-lg">{format(selectedDate, 'EEEE, MMM d')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => openNewEventDialog(selectedDate)}><Plus className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events scheduled</p>
                <Button variant="link" className="text-sm" onClick={() => openNewEventDialog(selectedDate)}>Add an event</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map(event => (
                  <div key={event.id} className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <Badge variant="outline" className={`text-xs mt-1 ${getEventTypeColor(event.event_type)}`}>{event.event_type.replace('_',' ')}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(event.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {event.is_all_day ? (
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" />All day</div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.start_time), 'h:mm a')}
                          {event.end_time && ` - ${format(new Date(event.end_time), 'h:mm a')}`}
                        </div>
                      )}
                      {event.location && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</div>}
                    </div>
                    {event.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</p>}
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
