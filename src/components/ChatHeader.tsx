import { Menu, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';

const ChatHeader = () => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground">
          <Menu size={20} />
        </SidebarTrigger>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-foreground tracking-wider">CARE</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">AI</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {!user && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/auth">
              <LogIn size={16} />
              <span className="hidden sm:inline">Login</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
};

export default ChatHeader;
