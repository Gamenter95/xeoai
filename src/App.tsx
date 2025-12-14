import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Businesses from "./pages/Businesses";
import BusinessDetail from "./pages/BusinessDetail";
import Embed from "./pages/Embed";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import WidgetPreview from "./pages/WidgetPreview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminPlans from "./pages/admin/AdminPlans";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/businesses" element={<Businesses />} />
            <Route path="/dashboard/businesses/:id" element={<BusinessDetail />} />
            <Route path="/dashboard/embed" element={<Embed />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/widget-preview/:businessId" element={<WidgetPreview />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
