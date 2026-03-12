import { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  Calculator, 
  Home,
  Settings,
  LogIn,
  LogOut,
  LayoutDashboard,
  User,
  MessageSquare,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const SettingsDialog = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { theme, toggleTheme } = useTheme();
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage();
  const [fontSize, setFontSize] = useState('medium');
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <SidebarMenuButton className="hover:bg-sidebar-accent">
          <Settings size={18} className="text-muted-foreground" />
          {!isCollapsed && <span className="text-sm">Settings</span>}
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
          <p className="text-sm text-muted-foreground">Customize your LegalCareAI experience</p>
        </DialogHeader>
        <div className="space-y-1 py-2">
          {/* Appearance Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h3>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
                  <div>
                    <Label className="text-sm font-medium">Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
                  </div>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={() => toggleTheme()} />
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Font Size</Label>
                    <p className="text-xs text-muted-foreground">Adjust text size across the app</p>
                  </div>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Language Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language & Region</h3>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Globe size={16} className="text-primary" />
                  Language
                </Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">Voice input and AI responses will use this language</p>
                <Select value={currentLanguage.code} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.nativeName} ({lang.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications & Sounds</h3>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Get notified about case updates</p>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Sound Effects</Label>
                    <p className="text-xs text-muted-foreground">Play sounds for messages and alerts</p>
                  </div>
                  <Switch checked={soundEffects} onCheckedChange={setSoundEffects} />
                </div>
              </div>
            </div>
          </div>

          {/* Chat Preferences */}
          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chat Preferences</h3>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto-save Conversations</Label>
                  <p className="text-xs text-muted-foreground">Automatically save chat history</p>
                </div>
                <Switch checked={autoSave} onCheckedChange={setAutoSave} />
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h3>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium">LegalCareAI</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-xs text-muted-foreground text-center">
                  © 2025 LegalCareAI. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const handleAIAssistantClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Force page reload to reset chat state
    window.location.href = '/';
  };

  const mainItems = [
    { title: 'AI Assistant', icon: Home, href: '/', onClick: handleAIAssistantClick },
  ];

  const serviceItems = [
    { title: 'Documents', icon: FileText, href: '/documents' },
    { title: 'Lawyers', icon: Users, href: '/lawyers' },
    { title: 'Tax Services', icon: Calculator, href: '/tax-services' },
    { title: 'Discussion', icon: MessageSquare, href: '/discussion' },
    { title: 'Community', icon: Globe, href: '/community' },
  ];

  // Dashboard items - only shown when logged in
  const dashboardItems = [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  ];

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-2">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <Link to="/" className="flex flex-col pl-1">
              <h1 className="text-lg font-semibold text-foreground tracking-tight">LegalCareAI</h1>
              <p className="text-xs text-muted-foreground">Legal Intelligence</p>
            </Link>
          )}
          <SidebarTrigger className={`text-muted-foreground hover:text-foreground ${isCollapsed ? 'h-8 w-8' : ''}`} />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
            {!isCollapsed && 'MAIN'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={currentPath === item.href}
                    className="hover:bg-sidebar-accent"
                  >
                    <a 
                      href={item.href} 
                      onClick={item.onClick}
                      className="flex items-center gap-3"
                    >
                      <item.icon size={18} className="text-muted-foreground" />
                      {!isCollapsed && (
                        <span className="text-sm">{item.title}</span>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Dashboard - Only visible when logged in */}
        {user && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
              {!isCollapsed && 'MY ACCOUNT'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dashboardItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={currentPath === item.href || currentPath.startsWith('/dashboard')}
                      className="hover:bg-sidebar-accent"
                    >
                      <Link to={item.href} className="flex items-center gap-3">
                        <item.icon size={18} className="text-primary" />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">{item.title}</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Services */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
            {!isCollapsed && 'SERVICES'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {serviceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={currentPath === item.href}
                    className="hover:bg-sidebar-accent"
                  >
                    <Link to={item.href} className="flex items-center gap-3">
                      <item.icon size={18} className="text-muted-foreground" />
                      {!isCollapsed && (
                        <span className="text-sm">{item.title}</span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          {/* User info when logged in */}
          {user && !isCollapsed && (
            <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-sidebar-accent/50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {user.email}
                </p>
                <p className="text-[10px] text-muted-foreground">Logged in</p>
              </div>
            </div>
          )}
          
          {user ? (
            // Logged in: Show sign out
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleSignOut}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut size={18} className="text-muted-foreground" />
                {!isCollapsed && <span className="text-sm">Sign Out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            // Not logged in: Show login
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="hover:bg-sidebar-accent">
                <Link to="/auth" className="flex items-center gap-3">
                  <LogIn size={18} className="text-muted-foreground" />
                  {!isCollapsed && (
                    <span className="text-sm">Login / Sign Up</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          <SidebarMenuItem>
            <SettingsDialog isCollapsed={isCollapsed} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
