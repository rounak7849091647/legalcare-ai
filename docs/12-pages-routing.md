# Pages & Routing

## Complete Route Documentation

---

## 1. Overview

LegalCareAI uses React Router DOM v6 for client-side routing. All routes are defined in the main App.tsx file.

---

## 2. Route Configuration

### 2.1 App.tsx Routes

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Page imports
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Lawyers from "./pages/Lawyers";
import TaxServices from "./pages/TaxServices";
import Community from "./pages/Community";
import Discussion from "./pages/Discussion";
import NotFound from "./pages/NotFound";

// Tax sub-pages
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

const queryClient = new QueryClient();

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Main routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/lawyers" element={<Lawyers />} />
                <Route path="/tax-services" element={<TaxServices />} />
                <Route path="/community" element={<Community />} />
                <Route path="/discussion" element={<Discussion />} />
                
                {/* Tax sub-routes */}
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
                
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
```

---

## 3. Page Components

### 3.1 Index Page (Home)

```typescript
// src/pages/Index.tsx
const Index = () => {
  return (
    <>
      <SEOHead
        title="LegalCareAI - AI-Powered Legal Intelligence for India"
        description="Get instant legal guidance with LegalCareAI..."
        canonicalUrl="/"
        structuredData={[faqStructuredData, serviceStructuredData]}
      />
      
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          
          <SidebarInset className="flex flex-col flex-1">
            <ChatHeader />
            <MainContent />
          </SidebarInset>
        </div>
      </SidebarProvider>
      
      <DisclaimerPopup />
    </>
  );
};
```

### 3.2 Auth Page

```typescript
// src/pages/Auth.tsx
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email, password
      });
      if (!error) navigate('/dashboard');
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      });
      if (!error) toast.success('Check your email!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-xl border">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <img src="/favicon.ico" alt="LegalCareAI" className="w-8 h-8" />
          <span className="text-lg font-semibold">LegalCareAI</span>
        </div>
        
        {/* Form */}
        <form onSubmit={handleAuth}>
          {/* Fields */}
        </form>
        
        {/* Toggle */}
        <button onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Sign Up' : 'Sign In'}
        </button>
      </div>
    </div>
  );
};
```

### 3.3 Dashboard Page

```typescript
// src/pages/Dashboard.tsx
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    });
  }, [navigate]);

  return (
    <PageLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <DashboardOverview />
        </TabsContent>
        <TabsContent value="cases">
          <CaseManagement />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};
```

### 3.4 Documents Page

```typescript
// src/pages/Documents.tsx
const Documents = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDocument, setSelectedDocument] = useState<DocumentTemplate | null>(null);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <PageLayout>
      <SEOHead
        title="Legal Document Templates - LegalCareAI"
        description="100+ free legal document templates..."
        canonicalUrl="/documents"
      />
      
      {/* Category filters */}
      {/* Search bar */}
      {/* Document grid */}
      {/* Preview dialog */}
    </PageLayout>
  );
};
```

### 3.5 Lawyers Page

```typescript
// src/pages/Lawyers.tsx
const Lawyers = () => {
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedPractice, setSelectedPractice] = useState('All Practice Areas');

  const filteredLawyers = useMemo(() => {
    return lawyers.filter(lawyer => {
      const matchesState = selectedState === 'All States' || lawyer.state === selectedState;
      const matchesCity = selectedCity === 'All Cities' || lawyer.city === selectedCity;
      const matchesPractice = selectedPractice === 'All Practice Areas' || 
        lawyer.practiceAreas.includes(selectedPractice);
      return matchesState && matchesCity && matchesPractice;
    });
  }, [selectedState, selectedCity, selectedPractice]);

  return (
    <PageLayout>
      <SEOHead
        title="Find a Lawyer in India - 10M+ Verified Lawyers"
        canonicalUrl="/lawyers"
      />
      
      {/* Stats */}
      {/* Filters */}
      {/* Lawyer cards */}
    </PageLayout>
  );
};
```

### 3.6 Tax Services Page

```typescript
// src/pages/TaxServices.tsx
const taxServices = [
  { title: 'File ITR', path: '/tax-services/file-return', icon: FileText },
  { title: 'Upload Form 16', path: '/tax-services/upload-form16', icon: Upload },
  { title: 'CA-Assisted Filing', path: '/tax-services/ca-filing', icon: UserCheck },
  { title: 'Tax Planning', path: '/tax-services/tax-planning', icon: Target },
  { title: 'Refund Status', path: '/tax-services/refund-status', icon: Search },
  { title: 'TDS Solution', path: '/tax-services/tds-solution', icon: Receipt },
  { title: 'NRI Taxes', path: '/tax-services/nri-taxes', icon: Globe },
  { title: 'Tax Advisory', path: '/tax-services/tax-advisory', icon: Lightbulb },
  { title: 'Capital Gains', path: '/tax-services/capital-gains', icon: TrendingUp },
  { title: 'Tax Notices', path: '/tax-services/tax-notices', icon: AlertTriangle },
  { title: 'Connect Expert', path: '/tax-services/connect-expert', icon: Users },
];

const TaxServices = () => {
  return (
    <PageLayout>
      <SEOHead title="Tax Services - LegalCareAI" canonicalUrl="/tax-services" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {taxServices.map((service) => (
          <Link key={service.path} to={service.path}>
            <Card>
              <service.icon />
              <h3>{service.title}</h3>
            </Card>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
};
```

---

## 4. Route Summary

| Route | Page | Auth Required | SEO Indexed |
|-------|------|---------------|-------------|
| / | Index | No | Yes |
| /auth | Auth | No | No |
| /dashboard | Dashboard | Yes | No |
| /documents | Documents | No | Yes |
| /lawyers | Lawyers | No | Yes |
| /tax-services | TaxServices | No | Yes |
| /community | Community | No | Yes |
| /discussion | Discussion | No | Yes |
| /tax-services/* | Tax sub-pages | No | Yes |
| * | NotFound | No | No |

---

## 5. Navigation Components

### 5.1 NavLink Component

```typescript
// src/components/NavLink.tsx
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive }) =>
          cn(className, isActive && activeClassName)
        }
        {...props}
      />
    );
  },
);
```

### 5.2 PageLayout Component

```typescript
// src/components/PageLayout.tsx
interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <SidebarInset className="flex flex-col flex-1">
          <ChatHeader />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
```

---

*This pages & routing documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
