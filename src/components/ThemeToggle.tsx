import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const ThemeToggle = () => {
  const { theme, toggleTheme, isAnimating } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative w-9 h-9 rounded-lg flex items-center justify-center",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-accent/50 transition-colors duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "cursor-pointer"
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sun Icon */}
      <Sun
        size={18}
        className={cn(
          "absolute transition-all duration-150 ease-in-out",
          isDark
            ? "opacity-0 transform translate-y-2 scale-75"
            : "opacity-100 transform translate-y-0 scale-100",
          isAnimating && !isDark && "animate-pulse"
        )}
      />
      
      {/* Moon Icon */}
      <Moon
        size={18}
        className={cn(
          "absolute transition-all duration-150 ease-in-out",
          isDark
            ? "opacity-100 transform translate-y-0 scale-100"
            : "opacity-0 transform -translate-y-2 scale-75",
          isAnimating && isDark && "animate-pulse"
        )}
      />
    </button>
  );
};

export default ThemeToggle;
