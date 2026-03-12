# Technology Stack

## Complete Technical Architecture Documentation

---

## 1. Frontend Technologies

### 1.1 Core Framework

#### React 18.3.1
```typescript
// React is used throughout the application
import React from 'react';

// Example: Main application entry
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

**Features Used:**
- Functional components
- React Hooks (useState, useEffect, useCallback, useRef, useMemo)
- Context API for state management
- Suspense for code splitting

#### TypeScript 5.x
```typescript
// Strong typing throughout the codebase
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  voiceContent?: string;
  timestamp: Date;
  language?: string;
  isDocumentSummary?: boolean;
}

// Type-safe props
interface MainContentProps {
  isMobile?: boolean;
}
```

### 1.2 Build System

#### Vite 5.x
```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

**Features:**
- Lightning-fast HMR (Hot Module Replacement)
- SWC for faster TypeScript compilation
- Path aliases (@/ for src/)
- Production optimization

### 1.3 Styling

#### Tailwind CSS 3.x
```css
/* Design tokens in index.css */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --accent: 240 4.8% 95.9%;
  --muted: 240 4.8% 95.9%;
  --border: 240 5.9% 90%;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --secondary: 240 3.7% 15.9%;
}
```

```typescript
// tailwind.config.ts
export default {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... more semantic colors
      },
    },
  },
};
```

#### Class Variance Authority (CVA)
```typescript
// Component variants
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background hover:bg-accent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
  }
);
```

### 1.4 UI Component Library

#### Shadcn/UI + Radix Primitives
```typescript
// 50+ accessible UI components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { Sidebar, SidebarContent, SidebarTrigger } from '@/components/ui/sidebar';
```

**Component Categories:**
- Layout: Sidebar, Sheet, Dialog, Drawer
- Forms: Input, Select, Checkbox, Radio, Switch
- Display: Card, Badge, Avatar, Tooltip
- Navigation: Tabs, Accordion, Menu
- Feedback: Toast, Progress, Skeleton

---

## 2. Backend Technologies

### 2.1 Supabase Platform

#### Database: PostgreSQL 15
```sql
-- Example table structure
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);
```

#### Authentication
```typescript
// Supabase Auth integration
import { supabase } from '@/integrations/supabase/client';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  setUser(session?.user ?? null);
});
```

### 2.2 Edge Functions (Deno)

```typescript
// supabase/functions/legal-chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { message, sessionId, detectedLanguage } = await req.json();
  
  // Process with AI
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [...],
      stream: true,
    }),
  });

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
});
```

---

## 3. AI & Voice Technologies

### 3.1 AI Models

#### Google Gemini 2.5 Flash
```typescript
// Used for legal chat responses
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: messages,
    max_tokens: 500,
    temperature: 0.3,
    stream: true,
  }),
});
```

**Features:**
- Fast response times
- Multi-language support
- Context retention
- Streaming responses

### 3.2 Voice Technologies

#### OpenAI Text-to-Speech
```typescript
// useOpenAITTS.ts
const speak = async (text: string, language: string) => {
  const response = await supabase.functions.invoke('text-to-speech', {
    body: { text, language }
  });
  
  const audio = new Audio(`data:audio/mp3;base64,${response.audio}`);
  await audio.play();
};
```

#### OpenAI Whisper (Speech-to-Text)
```typescript
// useWhisperRecognition.ts
const transcribe = async (audioBlob: Blob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  
  const response = await supabase.functions.invoke('voice-to-text', {
    body: formData
  });
  
  return response.transcript;
};
```

#### Browser Web Speech API
```typescript
// useSpeechRecognition.ts
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'hi-IN';

recognition.onresult = (event) => {
  const transcript = Array.from(event.results)
    .map(result => result[0].transcript)
    .join('');
  onTranscript(transcript);
};
```

---

## 4. State Management

### 4.1 React Context
```typescript
// ThemeContext.tsx
const ThemeContext = createContext<ThemeContextType>(defaultContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('legalcare-theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// LanguageContext.tsx
export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(getLanguageByCode('en-IN'));
  
  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
```

### 4.2 TanStack React Query
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
```

---

## 5. Routing

### 5.1 React Router DOM v6
```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/lawyers" element={<Lawyers />} />
        <Route path="/tax-services" element={<TaxServices />} />
        <Route path="/tax-services/file-return" element={<FileReturn />} />
        {/* ... more routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 6. Dependencies Summary

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3.1 | UI framework |
| react-dom | ^18.3.1 | DOM rendering |
| react-router-dom | ^6.30.1 | Routing |
| @supabase/supabase-js | ^2.89.0 | Backend client |
| @tanstack/react-query | ^5.83.0 | Server state |
| tailwindcss | ^3.x | Styling |
| lucide-react | ^0.462.0 | Icons |
| react-markdown | ^10.1.0 | Markdown rendering |
| date-fns | ^3.6.0 | Date utilities |
| zod | ^3.25.76 | Validation |
| sonner | ^1.7.4 | Toast notifications |
| framer-motion | - | Animations |
| react-hook-form | ^7.61.1 | Form handling |
| recharts | ^2.15.4 | Charts |

### Radix UI Primitives
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-select
- @radix-ui/react-tabs
- @radix-ui/react-tooltip
- And 20+ more...

---

*This technology stack documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
