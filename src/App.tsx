import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import OfflineBanner from "@/components/layout/OfflineBanner";
import ChatWidget from "./components/chat/ChatWidget";

// Eager-load homepage for fast first paint
import HomePage from "./pages/V2HomePage";

// Lazy-load all other routes
const BookingPage = lazy(() => import("./pages/V2BookingPage"));
const QuoteApprovalPage = lazy(() => import("./pages/V2QuoteApprovalPage"));
const DiagnosePage = lazy(() => import("./pages/DiagnosePage"));
const TrackJob = lazy(() => import("./pages/TrackJob"));
const TrackerPage = lazy(() => import("./pages/TrackerPage"));
const WaitlistPage = lazy(() => import("./pages/WaitlistPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DispatchBoardPage = lazy(() => import("./pages/ops/DispatchBoardPage"));
const FinanceBoardPage = lazy(() => import("./pages/ops/FinanceBoardPage"));
const PartnerDashboardPage = lazy(() => import("./pages/partner/PartnerDashboardPage"));
const ProviderOnboardingPage = lazy(() => import("./pages/provider/ProviderOnboardingPage"));
const PartnerJobsPage = lazy(() => import("./pages/partner/PartnerJobsPage"));
const PartnerJobDetailPage = lazy(() => import("./pages/partner/PartnerJobDetailPage"));
const TechniciansPage = lazy(() => import("./pages/partner/TechniciansPage"));
const PartnerProfilePage = lazy(() => import("./pages/partner/PartnerProfilePage"));
const PartnerWalletPage = lazy(() => import("./pages/partner/PartnerWalletPage"));
const TechnicianDashboardPage = lazy(() => import("./pages/technician/TechnicianDashboardPage"));
const TechnicianJobsPage = lazy(() => import("./pages/technician/TechnicianJobsPage"));
const TechnicianJobDetailPage = lazy(() => import("./pages/technician/TechnicianJobDetailPage"));
const TechnicianEarningsPage = lazy(() => import("./pages/technician/TechnicianEarningsPage"));
const TechnicianPartsPage = lazy(() => import("./pages/technician/TechnicianPartsPage"));
const TechnicianTrainingPage = lazy(() => import("./pages/technician/TechnicianTrainingPage"));
const TechnicianSupportPage = lazy(() => import("./pages/technician/TechnicianSupportPage"));
const TechnicianSafetyPage = lazy(() => import("./pages/technician/TechnicianSafetyPage"));
const CarePlansPage = lazy(() => import("./pages/care/CarePlansPage"));
const SubscribePage = lazy(() => import("./pages/care/SubscribePage"));
const CareDashboardPage = lazy(() => import("./pages/care/CareDashboardPage"));
const DeviceTimelinePage = lazy(() => import("./pages/care/DeviceTimelinePage"));
const SubscriptionAnalyticsPage = lazy(() => import("./pages/ops/SubscriptionAnalyticsPage"));
const DiagnoseAnalyticsPage = lazy(() => import("./pages/ops/DiagnoseAnalyticsPage"));
const DispatchAnalyticsPage = lazy(() => import("./pages/ops/DispatchAnalyticsPage"));
const ControlTowerPage = lazy(() => import("./pages/ops/ControlTowerPage"));
const PricingEditorPage = lazy(() => import("./pages/ops/PricingEditorPage"));
const DevicesDashboardPage = lazy(() => import("./pages/devices/DevicesDashboardPage"));
const DevicePassportPage = lazy(() => import("./pages/devices/DevicePassportPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const WarrantyPage = lazy(() => import("./pages/WarrantyPage"));
const RefundPage = lazy(() => import("./pages/RefundPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const BypassMonitorPage = lazy(() => import("./pages/ops/BypassMonitorPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const HowPricingWorksPage = lazy(() => import("./pages/HowPricingWorksPage"));
const BundleBookingPage = lazy(() => import("./pages/BundleBookingPage"));
const SMEServicesPage = lazy(() => import("./pages/SMEServicesPage"));
const AIGrowthEnginePage = lazy(() => import("./pages/ops/AIGrowthEnginePage"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const CorporateServicesPage = lazy(() => import("./pages/CorporateServicesPage"));
const ExpansionRoadmapPage = lazy(() => import("./pages/ops/ExpansionRoadmapPage"));
const PartnerPremiumPage = lazy(() => import("./pages/partner/PartnerPremiumPage"));
const ConsumablesPage = lazy(() => import("./pages/ConsumablesPage"));
const RevenueEnginePage = lazy(() => import("./pages/ops/RevenueEnginePage"));
const HomeHealthPage = lazy(() => import("./pages/HomeHealthPage"));
const AccountDeletionPage = lazy(() => import("./pages/AccountDeletionPage"));

// Redirect helpers for legacy routes with params
const RedirectBooking = () => { const { category } = useParams(); return <Navigate to={`/book/${category}`} replace />; };
const RedirectQuote = () => { const { jobId } = useParams(); return <Navigate to={`/quote/${jobId}`} replace />; };
const RedirectCategory = () => { const { code } = useParams(); return <Navigate to={`/book/${code}`} replace />; };

const queryClient = new QueryClient();

// Loading fallback with skeleton
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
      <span className="text-sm text-muted-foreground font-medium">Loading…</span>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineBanner />
      <ChatWidget />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/home-health" element={<HomeHealthPage />} />

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
            <Route path="/partner/premium" element={<PartnerPremiumPage />} />

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
            <Route path="/ops/revenue" element={<RevenueEnginePage />} />

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
          </Routes>
        </Suspense>
        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
