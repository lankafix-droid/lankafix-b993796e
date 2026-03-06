import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import PrecheckPage from "./pages/PrecheckPage";
import PricingBuilder from "./pages/PricingBuilder";
import QuotePage from "./pages/QuotePage";
import TrackerPage from "./pages/TrackerPage";
import TrackJob from "./pages/TrackJob";
import WaitlistPage from "./pages/WaitlistPage";
import DiagnosePage from "./pages/DiagnosePage";
import NotFound from "./pages/NotFound";
import DispatchBoardPage from "./pages/ops/DispatchBoardPage";
import FinanceBoardPage from "./pages/ops/FinanceBoardPage";
import PartnerDashboardPage from "./pages/partner/PartnerDashboardPage";
import ProviderOnboardingPage from "./pages/provider/ProviderOnboardingPage";
import PartnerJobsPage from "./pages/partner/PartnerJobsPage";
import PartnerJobDetailPage from "./pages/partner/PartnerJobDetailPage";
import TechniciansPage from "./pages/partner/TechniciansPage";
import PartnerProfilePage from "./pages/partner/PartnerProfilePage";
import PartnerWalletPage from "./pages/partner/PartnerWalletPage";
import TechnicianDashboardPage from "./pages/technician/TechnicianDashboardPage";
import TechnicianJobsPage from "./pages/technician/TechnicianJobsPage";
import TechnicianJobDetailPage from "./pages/technician/TechnicianJobDetailPage";
import TechnicianEarningsPage from "./pages/technician/TechnicianEarningsPage";
import TechnicianPartsPage from "./pages/technician/TechnicianPartsPage";
import TechnicianTrainingPage from "./pages/technician/TechnicianTrainingPage";
import TechnicianSupportPage from "./pages/technician/TechnicianSupportPage";
import TechnicianSafetyPage from "./pages/technician/TechnicianSafetyPage";
import CarePlansPage from "./pages/care/CarePlansPage";
import SubscribePage from "./pages/care/SubscribePage";
import CareDashboardPage from "./pages/care/CareDashboardPage";
import DeviceTimelinePage from "./pages/care/DeviceTimelinePage";
import SubscriptionAnalyticsPage from "./pages/ops/SubscriptionAnalyticsPage";
import DiagnoseAnalyticsPage from "./pages/ops/DiagnoseAnalyticsPage";
import DispatchAnalyticsPage from "./pages/ops/DispatchAnalyticsPage";
import ControlTowerPage from "./pages/ops/ControlTowerPage";
import ChatWidget from "./components/chat/ChatWidget";
import DevicesDashboardPage from "./pages/devices/DevicesDashboardPage";
import DevicePassportPage from "./pages/devices/DevicePassportPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ChatWidget />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:code" element={<CategoryPage />} />
          <Route path="/precheck/:catCode/:svcCode" element={<PrecheckPage />} />
          <Route path="/pricing/:catCode/:svcCode" element={<PricingBuilder />} />
          <Route path="/quote/:jobId" element={<QuotePage />} />
          <Route path="/tracker/:jobId" element={<TrackerPage />} />
          <Route path="/track" element={<TrackJob />} />
          <Route path="/waitlist" element={<WaitlistPage />} />
          <Route path="/diagnose" element={<DiagnosePage />} />
          {/* Provider onboarding */}
          <Route path="/join" element={<ProviderOnboardingPage />} />
          {/* Partner routes */}
          <Route path="/partner" element={<PartnerDashboardPage />} />
          <Route path="/partner/jobs" element={<PartnerJobsPage />} />
          <Route path="/partner/job/:jobId" element={<PartnerJobDetailPage />} />
          <Route path="/partner/technicians" element={<TechniciansPage />} />
          <Route path="/partner/profile" element={<PartnerProfilePage />} />
          <Route path="/partner/wallet" element={<PartnerWalletPage />} />
          {/* Technician routes */}
          <Route path="/technician" element={<TechnicianDashboardPage />} />
          <Route path="/technician/jobs" element={<TechnicianJobsPage />} />
          <Route path="/technician/job/:jobId" element={<TechnicianJobDetailPage />} />
          <Route path="/technician/earnings" element={<TechnicianEarningsPage />} />
          {/* Care / Subscription routes */}
          <Route path="/care" element={<CarePlansPage />} />
          <Route path="/care/subscribe/:planId" element={<SubscribePage />} />
          <Route path="/care/dashboard" element={<CareDashboardPage />} />
          <Route path="/care/device/:deviceId" element={<DeviceTimelinePage />} />
          {/* Device Passport routes */}
          <Route path="/devices" element={<DevicesDashboardPage />} />
          <Route path="/device/:passportId" element={<DevicePassportPage />} />
          {/* Ops routes */}
          <Route path="/ops/dispatch" element={<DispatchBoardPage />} />
          <Route path="/ops/finance" element={<FinanceBoardPage />} />
            <Route path="/ops/subscriptions" element={<SubscriptionAnalyticsPage />} />
            <Route path="/ops/diagnose-analytics" element={<DiagnoseAnalyticsPage />} />
            <Route path="/ops/dispatch-analytics" element={<DispatchAnalyticsPage />} />
            <Route path="/ops/control-tower" element={<ControlTowerPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
