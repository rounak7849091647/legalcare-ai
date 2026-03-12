# Appendix C: Complete Source Code - Context Providers

## Full Implementation of React Context Providers

**LegalCareAI - Proprietary Source Code**  
**Copyright © 2024-2026 LegalCareAI. All Rights Reserved.**

---

## 1. Language Context Provider

**File**: `src/contexts/LanguageContext.tsx`  
**Lines**: 48  
**Purpose**: Multi-language support with persistent preferences

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, Language, getLanguageByCode } from '@/lib/languages';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (code: string) => void;
  availableLanguages: Language[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'care-language-preference';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(
    getLanguageByCode(DEFAULT_LANGUAGE)
  );

  // Load saved language preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      setCurrentLanguage(getLanguageByCode(saved));
    }
  }, []);

  const setLanguage = (code: string) => {
    const language = getLanguageByCode(code);
    setCurrentLanguage(language);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const availableLanguages = Object.values(SUPPORTED_LANGUAGES);

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
```

---

## 2. Theme Context Provider

**File**: `src/contexts/ThemeContext.tsx`  
**Lines**: 66  
**Purpose**: Dark/light mode with system preference detection

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isAnimating: boolean;
}

const defaultContext: ThemeContextType = {
  theme: 'dark',
  toggleTheme: () => {},
  isAnimating: false,
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

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
  
  const [isAnimating, setIsAnimating] = useState(false);

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
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 150);
    }
    
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isAnimating }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
```

---

## 3. App.tsx - Root Application

**File**: `src/App.tsx`  
**Lines**: 72  
**Purpose**: Application root with providers and routing

```typescript
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Documents from "./pages/Documents";
import Lawyers from "./pages/Lawyers";
import TaxServices from "./pages/TaxServices";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
// Tax service pages
import FileReturn from "./pages/tax/FileReturn";
import UploadForm16 from "./pages/tax/UploadForm16";
import CAAssistedFiling from "./pages/tax/CAAssistedFiling";
import TaxPlanning from "./pages/tax/TaxPlanning";
import RefundStatus from "./pages/tax/RefundStatus";
import TDSSolution from "./pages/tax/TDSSolution";
import NRITaxes from "./pages/tax/NRITaxes";
import TaxAdvisory from "./pages/tax/TaxAdvisory";
import CapitalGains from "./pages/tax/CapitalGains";
import TaxNotices from "./pages/tax/TaxNotices";
import ConnectExpert from "./pages/tax/ConnectExpert";
import Discussion from "./pages/Discussion";
import Community from "./pages/Community";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/lawyers" element={<Lawyers />} />
            <Route path="/tax-services" element={<TaxServices />} />
            <Route path="/tax-services/file-return" element={<FileReturn />} />
            <Route path="/tax-services/upload-form16" element={<UploadForm16 />} />
            <Route path="/tax-services/ca-filing" element={<CAAssistedFiling />} />
            <Route path="/tax-services/tax-planning" element={<TaxPlanning />} />
            <Route path="/tax-services/refund-status" element={<RefundStatus />} />
            <Route path="/tax-services/tds-solution" element={<TDSSolution />} />
            <Route path="/tax-services/nri-taxes" element={<NRITaxes />} />
            <Route path="/tax-services/tax-advisory" element={<TaxAdvisory />} />
            <Route path="/tax-services/capital-gains" element={<CapitalGains />} />
            <Route path="/tax-services/tax-notices" element={<TaxNotices />} />
            <Route path="/tax-services/connect-expert" element={<ConnectExpert />} />
            <Route path="/discussion" element={<Discussion />} />
            <Route path="/community" element={<Community />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
```

---

## 4. Main Entry Point

**File**: `src/main.tsx`  
**Lines**: ~15  
**Purpose**: React DOM rendering entry point

```typescript
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
```

---

## Provider Architecture

```
<HelmetProvider>           ─── SEO/Meta management
  <QueryClientProvider>    ─── React Query data fetching
    <ThemeProvider>        ─── Light/Dark mode
      <LanguageProvider>   ─── Multi-language support
        <TooltipProvider>  ─── UI tooltips
          <BrowserRouter>  ─── Client-side routing
            <Routes />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
</HelmetProvider>
```

---

## Context Summary

| Context | Purpose | Storage |
|---------|---------|---------|
| ThemeContext | Dark/light mode | localStorage |
| LanguageContext | Language preference | localStorage |
| QueryClient | Server state caching | Memory |
| HelmetProvider | SEO metadata | DOM |

**Total Context Code**: ~200 lines

---

*This documentation is confidential and proprietary. Unauthorized reproduction is prohibited.*
