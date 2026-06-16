import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Briefcase, Calendar, FileText, Users, Calculator,
  Plus, LogOut, Home, ChevronRight, Bell, Settings, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import CaseManagement from '@/components/dashboard/CaseManagement';
import CalendarView from '@/components/dashboard/CalendarView';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return null;

  // Name comes from Cognito user attributes — no extra DB call needed
  const displayName = user.fullName || user.email.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Top Navigation */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-semibold">LegalCare</span>
            </div>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="AI Assistant">
              <MessageSquare className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" title="Upcoming hearings" onClick={() => setActiveTab('calendar')}>
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" title="Account settings" onClick={() => toast.info('Account settings coming soon!')}>
              <Settings className="w-5 h-5" />
            </Button>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold mb-2">
            Welcome back, {displayName}!
          </h1>
          <p className="text-muted-foreground">
            Manage your cases, schedule, and access legal resources all in one place.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickActionCard icon={<Plus className="w-5 h-5" />}     title="New Case"        onClick={() => setActiveTab('cases')} />
          <QuickActionCard icon={<Calendar className="w-5 h-5" />} title="Schedule Event"  onClick={() => setActiveTab('calendar')} />
          <QuickActionCard icon={<FileText className="w-5 h-5" />} title="Documents"       onClick={() => navigate('/documents')} />
          <QuickActionCard icon={<MessageSquare className="w-5 h-5" />} title="AI Assistant" onClick={() => navigate('/')} />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2">
              <Home className="w-4 h-4" /><span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="cases" className="gap-2">
              <Briefcase className="w-4 h-4" /><span className="hidden sm:inline">Cases</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" /><span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardOverview userId={user.id} onNavigate={setActiveTab} />
          </TabsContent>
          <TabsContent value="cases">
            <CaseManagement userId={user.id} />
          </TabsContent>
          <TabsContent value="calendar">
            <CalendarView userId={user.id} />
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLinkCard icon={<Users className="w-6 h-6 text-primary" />}      title="Find a Lawyer"       description="Connect with verified legal professionals" onClick={() => navigate('/lawyers')} />
          <QuickLinkCard icon={<Calculator className="w-6 h-6 text-primary" />} title="Tax Services"        description="Calculate taxes and access tax resources"  onClick={() => navigate('/tax-services')} />
          <QuickLinkCard icon={<FileText className="w-6 h-6 text-primary" />}   title="Document Templates"  description="Access legal document templates"           onClick={() => navigate('/documents')} />
        </div>
      </main>
    </div>
  );
};

const QuickActionCard = ({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) => (
  <button onClick={onClick} className="p-4 bg-card border border-border/50 rounded-xl hover:border-primary/50 hover:shadow-md transition-all flex flex-col items-center gap-2 group">
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">{icon}</div>
    <span className="text-sm font-medium">{title}</span>
  </button>
);

const QuickLinkCard = ({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) => (
  <button onClick={onClick} className="p-5 bg-card border border-border/50 rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-left group">
    <div className="flex items-start justify-between mb-3">
      {icon}
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
    <h3 className="font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </button>
);

export default Dashboard;
