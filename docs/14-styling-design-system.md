# Styling & Design System

## Complete Design System Documentation

---

## 1. Overview

LegalCareAI uses a carefully crafted design system built on Tailwind CSS with custom design tokens. The system supports both light and dark modes with a professional legal aesthetic.

---

## 2. Design Tokens

### 2.1 Color System (index.css)

```css
/* src/index.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Background colors */
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    
    /* Card colors */
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    
    /* Popover colors */
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    
    /* Primary colors */
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    
    /* Secondary colors */
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    
    /* Muted colors */
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    
    /* Accent colors */
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    
    /* Destructive colors */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    
    /* Border and input colors */
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    
    /* Sidebar colors */
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
    
    /* Border radius */
    --radius: 0.5rem;
  }

  .dark {
    /* Background colors */
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    
    /* Card colors */
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    
    /* Popover colors */
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    
    /* Primary colors */
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    
    /* Secondary colors */
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    
    /* Muted colors */
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    
    /* Accent colors */
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    
    /* Destructive colors */
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    
    /* Border and input colors */
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    
    /* Sidebar colors */
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

/* Base styles */
@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

### 2.2 Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## 3. Typography

### 3.1 Font Families

```css
/* Primary fonts (from index.html or Google Fonts) */
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Display font */
.font-serif {
  font-family: 'Plus Jakarta Sans', serif;
}
```

### 3.2 Font Sizes

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| text-xs | 0.75rem | 1rem | Labels, badges |
| text-sm | 0.875rem | 1.25rem | Body small |
| text-base | 1rem | 1.5rem | Body |
| text-lg | 1.125rem | 1.75rem | Large body |
| text-xl | 1.25rem | 1.75rem | Subheadings |
| text-2xl | 1.5rem | 2rem | Headings |
| text-3xl | 1.875rem | 2.25rem | Page titles |

---

## 4. Spacing

### 4.1 Spacing Scale

| Class | Value | Pixels |
|-------|-------|--------|
| p-1 | 0.25rem | 4px |
| p-2 | 0.5rem | 8px |
| p-3 | 0.75rem | 12px |
| p-4 | 1rem | 16px |
| p-6 | 1.5rem | 24px |
| p-8 | 2rem | 32px |

### 4.2 Common Patterns

```tsx
// Card padding
<div className="p-4 sm:p-6 lg:p-8">

// Section spacing
<div className="space-y-4">

// Grid gaps
<div className="grid gap-4">

// Flex gaps
<div className="flex gap-2">
```

---

## 5. Responsive Design

### 5.1 Breakpoints

| Prefix | Min Width | Common Use |
|--------|-----------|------------|
| sm | 640px | Tablets portrait |
| md | 768px | Tablets landscape |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |

### 5.2 Mobile-First Pattern

```tsx
// Mobile-first responsive design
<div className="
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  gap-4
">

// Hidden on mobile
<span className="hidden sm:inline">Desktop text</span>

// Mobile-specific
<div className="p-4 sm:p-6 lg:p-8">
```

### 5.3 Mobile Detection Hook

```typescript
// src/hooks/use-mobile.tsx
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
```

---

## 6. Theme System

### 6.1 Theme Context

```typescript
// src/contexts/ThemeContext.tsx
type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
  isAnimating: boolean;
}>({
  theme: 'dark',
  toggleTheme: () => {},
  isAnimating: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('legalcare-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('legalcare-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isAnimating }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### 6.2 Theme Toggle Component

```typescript
// src/components/ThemeToggle.tsx
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative w-9 h-9 rounded-lg flex items-center justify-center
                 text-muted-foreground hover:text-foreground
                 hover:bg-accent/50 transition-colors duration-200"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className={cn(
        "absolute transition-all duration-150",
        isDark ? "opacity-0 scale-75" : "opacity-100 scale-100"
      )} />
      
      <Moon className={cn(
        "absolute transition-all duration-150",
        isDark ? "opacity-100 scale-100" : "opacity-0 scale-75"
      )} />
    </button>
  );
};
```

---

## 7. Animations

### 7.1 Built-in Animations

```css
/* Keyframes */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}
```

### 7.2 Animation Classes

```tsx
// Fade in animation
<div className="animate-fade-in">

// Pulse animation
<div className="animate-pulse">

// Bounce animation
<span className="animate-bounce">

// Spin animation
<div className="animate-spin">
```

---

## 8. Common Patterns

### 8.1 Card Pattern

```tsx
<div className="bg-card border border-border rounded-xl p-4 hover:bg-accent transition-all">
  <h3 className="font-semibold text-foreground">{title}</h3>
  <p className="text-muted-foreground text-sm">{description}</p>
</div>
```

### 8.2 Input Pattern

```tsx
<Input
  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
  placeholder="Enter text..."
/>
```

### 8.3 Button Pattern

```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Click Me
</Button>
```

### 8.4 Badge Pattern

```tsx
<Badge variant="outline" className="bg-secondary border-border text-foreground">
  Label
</Badge>
```

---

*This styling & design system documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
