import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, Clock, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardOverviewProps {
  userId: string;
  onNavigate: (tab: string) => void;
}

interface Case {
  id: string;
  title: string;
  case_type: string;
  status: string;
  priority: string;
  next_hearing_date: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  event_type: string;
}

const DashboardOverview = ({ userId, onNavigate }: DashboardOverviewProps) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch cases
      const { data: casesData } = await supabase
        .from('cases')
        .select('id, title, case_type, status, priority, next_hearing_date')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('id, title, start_time, event_type')
        .eq('user_id', userId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      setCases(casesData || []);
      setEvents(eventsData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [userId]);

  const activeCases = cases.filter(c => c.status === 'active').length;
  const pendingCases = cases.filter(c => c.status === 'pending').length;
  const closedCases = cases.filter(c => c.status === 'closed').length;
  const upcomingHearings = cases.filter(c => c.next_hearing_date).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'closed': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          icon={<Briefcase className="w-5 h-5 text-primary" />}
          title="Active Cases"
          value={activeCases}
          trend={`${cases.length} total`}
        />
        <StatsCard
          icon={<Clock className="w-5 h-5 text-yellow-500" />}
          title="Pending"
          value={pendingCases}
          trend="Awaiting action"
        />
        <StatsCard
          icon={<Calendar className="w-5 h-5 text-blue-500" />}
          title="Upcoming Hearings"
          value={upcomingHearings}
          trend="Scheduled"
        />
        <StatsCard
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          title="Closed"
          value={closedCases}
          trend="Resolved"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Cases</CardTitle>
            <button 
              onClick={() => onNavigate('cases')}
              className="text-sm text-primary hover:underline"
            >
              View all
            </button>
          </CardHeader>
          <CardContent>
            {cases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No cases yet</p>
                <button 
                  onClick={() => onNavigate('cases')}
                  className="text-primary hover:underline text-sm mt-1"
                >
                  Create your first case
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map((caseItem) => (
                  <div 
                    key={caseItem.id}
                    className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{caseItem.title}</h4>
                        <p className="text-xs text-muted-foreground">{caseItem.case_type}</p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(caseItem.status)}>
                        {caseItem.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1 ${getPriorityColor(caseItem.priority)}`}>
                        <AlertCircle className="w-3 h-3" />
                        {caseItem.priority} priority
                      </span>
                      {caseItem.next_hearing_date && (
                        <span className="text-muted-foreground">
                          Next: {format(new Date(caseItem.next_hearing_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Upcoming Events</CardTitle>
            <button 
              onClick={() => onNavigate('calendar')}
              className="text-sm text-primary hover:underline"
            >
              View calendar
            </button>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming events</p>
                <button 
                  onClick={() => onNavigate('calendar')}
                  className="text-primary hover:underline text-sm mt-1"
                >
                  Schedule an event
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div 
                    key={event.id}
                    className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.start_time), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.event_type}
                      </Badge>
                    </div>
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

const StatsCard = ({ 
  icon, 
  title, 
  value, 
  trend 
}: { 
  icon: React.ReactNode; 
  title: string; 
  value: number; 
  trend: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between mb-2">
        {icon}
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{trend}</p>
      </div>
    </CardContent>
  </Card>
);

export default DashboardOverview;
