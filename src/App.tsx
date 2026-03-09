import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import HomePage from "./pages/V2HomePage";
import BookingPage from "./pages/V2BookingPage";
import QuoteApprovalPage from "./pages/V2QuoteApprovalPage";
import DiagnosePage from "./pages/DiagnosePage";
import TrackJob from "./pages/TrackJob";
import TrackerPage from "./pages/TrackerPage";
import WaitlistPage from "./pages/WaitlistPage";
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
import PricingEditorPage from "./pages/ops/PricingEditorPage";
import ChatWidget from "./components/chat/ChatWidget";
import DevicesDashboardPage from "./pages/devices/DevicesDashboardPage";
import DevicePassportPage from "./pages/devices/DevicePassportPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import WarrantyPage from "./pages/WarrantyPage";
import RefundPage from "./pages/RefundPage";
import AccountPage from "./pages/AccountPage";
import BypassMonitorPage from "./pages/ops/BypassMonitorPage";
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import HowPricingWorksPage from "./pages/HowPricingWorksPage";
import BundleBookingPage from "./pages/BundleBookingPage";
import SMEServicesPage from "./pages/SMEServicesPage";
import AIGrowthEnginePage from "./pages/ops/AIGrowthEnginePage";
import ReferralPage from "./pages/ReferralPage";
import CorporateServicesPage from "./pages/CorporateServicesPage";
import ExpansionRoadmapPage from "./pages/ops/ExpansionRoadmapPage";
import PartnerPremiumPage from "./pages/partner/PartnerPremiumPage";
import ConsumablesPage from "./pages/ConsumablesPage";
import RevenueEnginePage from "./pages/ops/RevenueEnginePage";

// Redirect helpers for legacy routes with params
const RedirectBooking = () => { const { category } = useParams(); return <Navigate to={`/book/${category}`} replace />; };
const RedirectQuote = () => { const { jobId } = useParams(); return <Navigate to={`/quote/${jobId}`} replace />; };
const RedirectCategory = () => { const { code } = useParams(); return <Navigate to={`/book/${code}`} replace />; };

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ChatWidget />
      <BrowserRouter>
        <Routes>
          {/* ─── V3 Customer Marketplace ─── */}
          <Route path="/" element={<HomePage />} />
          <Route path="/book/:category" element={<BookingPage />} />
          <Route path="/quote/:jobId" element={<QuoteApprovalPage />} />
          <Route path="/diagnose" element={<DiagnosePage />} />
          <Route path="/tracker/:jobId" element={<TrackerPage />} />
          <Route path="/track/:jobId" element={<TrackerPage />} />
          <Route path="/track" element={<TrackJob />} />
          <Route path="/waitlist" element={<WaitlistPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/bundle/:bundleId" element={<BundleBookingPage />} />
          <Route path="/sme" element={<SMEServicesPage />} />
          <Route path="/referral" element={<ReferralPage />} />
          <Route path="/corporate" element={<CorporateServicesPage />} />
          <Route path="/supplies" element={<ConsumablesPage />} />

          {/* ─── Legacy V2 redirects ─── */}
          <Route path="/v2" element={<Navigate to="/" replace />} />
          <Route path="/v2/book/:category" element={<RedirectBooking />} />
          <Route path="/v2/quote/:jobId" element={<RedirectQuote />} />

          {/* ─── Legacy V1 redirects ─── */}
          <Route path="/categories" element={<Navigate to="/" replace />} />
          <Route path="/category/:code" element={<RedirectCategory />} />

          {/* ─── Provider onboarding ─── */}
          <Route path="/join" element={<ProviderOnboardingPage />} />

          {/* ─── Partner routes ─── */}
          <Route path="/partner" element={<PartnerDashboardPage />} />
          <Route path="/partner/jobs" element={<PartnerJobsPage />} />
          <Route path="/partner/job/:jobId" element={<PartnerJobDetailPage />} />
          <Route path="/partner/technicians" element={<TechniciansPage />} />
          <Route path="/partner/profile" element={<PartnerProfilePage />} />
          <Route path="/partner/wallet" element={<PartnerWalletPage />} />

          {/* ─── Technician routes ─── */}
          <Route path="/technician" element={<TechnicianDashboardPage />} />
          <Route path="/technician/jobs" element={<TechnicianJobsPage />} />
          <Route path="/technician/job/:jobId" element={<TechnicianJobDetailPage />} />
          <Route path="/technician/earnings" element={<TechnicianEarningsPage />} />
          <Route path="/technician/parts" element={<TechnicianPartsPage />} />
          <Route path="/technician/training" element={<TechnicianTrainingPage />} />
          <Route path="/technician/support" element={<TechnicianSupportPage />} />
          <Route path="/technician/safety" element={<TechnicianSafetyPage />} />

          {/* ─── Care / Subscription ─── */}
          <Route path="/care" element={<CarePlansPage />} />
          <Route path="/care/subscribe/:planId" element={<SubscribePage />} />
          <Route path="/care/dashboard" element={<CareDashboardPage />} />
          <Route path="/care/device/:deviceId" element={<DeviceTimelinePage />} />

          {/* ─── Device Passport ─── */}
          <Route path="/devices" element={<DevicesDashboardPage />} />
          <Route path="/device/:passportId" element={<DevicePassportPage />} />

          {/* ─── Ops Dashboard ─── */}
          <Route path="/ops/dispatch" element={<DispatchBoardPage />} />
          <Route path="/ops/finance" element={<FinanceBoardPage />} />
          <Route path="/ops/subscriptions" element={<SubscriptionAnalyticsPage />} />
          <Route path="/ops/diagnose-analytics" element={<DiagnoseAnalyticsPage />} />
          <Route path="/ops/dispatch-analytics" element={<DispatchAnalyticsPage />} />
          <Route path="/ops/control-tower" element={<ControlTowerPage />} />
          <Route path="/ops/pricing" element={<PricingEditorPage />} />
          <Route path="/ops/bypass-monitor" element={<BypassMonitorPage />} />
          <Route path="/ops/ai-growth" element={<AIGrowthEnginePage />} />
          <Route path="/ops/expansion" element={<ExpansionRoadmapPage />} />

          {/* ─── Content Pages ─── */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/how-pricing-works" element={<HowPricingWorksPage />} />

          {/* ─── Legal ─── */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/warranty" element={<WarrantyPage />} />
          <Route path="/refund" element={<RefundPage />} />
          <Route path="*" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
