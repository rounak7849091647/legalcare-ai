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
import Emulator from "./pages/Emulator";
import AudioUnlocker from "./components/AudioUnlocker";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AudioUnlocker />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/emulator" element={<Emulator />} />
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
