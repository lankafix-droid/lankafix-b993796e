import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import TermsGuard from "@/components/consent/TermsGuard";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import OfflineBanner from "@/components/layout/OfflineBanner";
import ChatWidget from "./components/chat/ChatWidget";
import PilotModeBanner from "./components/ops/PilotModeBanner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PartnerRoute from "@/components/auth/PartnerRoute";
// Eager-load homepage for fast first paint
import HomePage from "./pages/V2HomePage";
import GoogleMapsProvider from "./components/maps/GoogleMapsProvider";

// Auth pages
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));

// Lazy-load all other routes
const BookingPage = lazy(() => import("./pages/V2BookingPage"));
const ConsumerBookingPage = lazy(() => import("./pages/ConsumerBookingPage"));
const QuoteApprovalPage = lazy(() => import("./pages/V2QuoteApprovalPage"));
const DiagnosePage = lazy(() => import("./pages/DiagnosePage"));
const TrackJob = lazy(() => import("./pages/TrackJob"));
const TrackerPage = lazy(() => import("./pages/TrackerPage"));
// BookingTracker removed — TrackerPage is the unified tracker with DB-first state
const WaitlistPage = lazy(() => import("./pages/WaitlistPage"));
const DemandRequestPage = lazy(() => import("./pages/DemandRequestPage"));
const SubmitRequirementPage = lazy(() => import("./pages/SubmitRequirementPage"));
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
const PartnerQuoteHistoryPage = lazy(() => import("./pages/partner/PartnerQuoteHistoryPage"));
const PartnerPerformancePage = lazy(() => import("./pages/partner/PartnerPerformancePage"));
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
const SupportCasesPage = lazy(() => import("./pages/ops/SupportCasesPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const HowPricingWorksPage = lazy(() => import("./pages/HowPricingWorksPage"));
const BundleBookingPage = lazy(() => import("./pages/BundleBookingPage"));
const SMEServicesPage = lazy(() => import("./pages/SMEServicesPage"));
const AIGrowthEnginePage = lazy(() => import("./pages/ops/AIGrowthEnginePage"));
const AIIntelligencePage = lazy(() => import("./pages/ops/AIIntelligencePage"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const CorporateServicesPage = lazy(() => import("./pages/CorporateServicesPage"));
const ExpansionRoadmapPage = lazy(() => import("./pages/ops/ExpansionRoadmapPage"));
const PartnerPremiumPage = lazy(() => import("./pages/partner/PartnerPremiumPage"));
const PartnerRespondPage = lazy(() => import("./pages/partner/PartnerRespondPage"));
const ConsumablesPage = lazy(() => import("./pages/ConsumablesPage"));
const RevenueEnginePage = lazy(() => import("./pages/ops/RevenueEnginePage"));
const MarketplaceIntelligencePage = lazy(() => import("./pages/ops/MarketplaceIntelligencePage"));
const RetentionDashboardPage = lazy(() => import("./pages/ops/RetentionDashboardPage"));
const LaunchReadinessPage = lazy(() => import("./pages/ops/LaunchReadinessPage"));
const PilotSimulationPage = lazy(() => import("./pages/ops/PilotSimulationPage"));
const ProviderReadinessPage = lazy(() => import("./pages/ops/ProviderReadinessPage"));
const RemindersPage = lazy(() => import("./pages/RemindersPage"));
const HomeHealthPage = lazy(() => import("./pages/HomeHealthPage"));
const AccountDeletionPage = lazy(() => import("./pages/AccountDeletionPage"));
const AccountDeletionPublicPage = lazy(() => import("./pages/AccountDeletionPublicPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ServiceHistoryPage = lazy(() => import("./pages/ServiceHistoryPage"));
const PilotBookingMonitorPage = lazy(() => import("./pages/ops/PilotBookingMonitorPage"));
const IncidentTrackerPage = lazy(() => import("./pages/ops/IncidentTrackerPage"));
const PartnerPilotReadinessPage = lazy(() => import("./pages/ops/PartnerPilotReadinessPage"));
const WarRoomPage = lazy(() => import("./pages/ops/WarRoomPage"));
const DispatchWarRoomPage = lazy(() => import("./pages/ops/DispatchWarRoomPage"));
const AutomationHealthPage = lazy(() => import("./pages/ops/AutomationHealthPage"));
const PilotReadinessPanel = lazy(() => import("./pages/ops/PilotReadinessPanel"));
const LaunchCommandCenterPage = lazy(() => import("./pages/ops/LaunchCommandCenterPage"));
const IncidentPlaybooksPage = lazy(() => import("./pages/ops/IncidentPlaybooksPage"));
const SelfHealingMonitorPage = lazy(() => import("./pages/ops/SelfHealingMonitorPage"));
const ChaosControlCenterPage = lazy(() => import("./pages/ops/ChaosControlCenterPage"));
const ReliabilityArchivePage = lazy(() => import("./pages/ops/ReliabilityArchivePage"));
const ExecutiveReliabilityBoardPage = lazy(() => import("./pages/ops/ExecutiveReliabilityBoardPage"));
const ReliabilityScopePlannerPage = lazy(() => import("./pages/ops/ReliabilityScopePlannerPage"));
const ReliabilityActionCenterPage = lazy(() => import("./pages/ops/ReliabilityActionCenterPage"));
const ReliabilityOperationsBoardPage = lazy(() => import("./pages/ops/ReliabilityOperationsBoardPage"));
const ReliabilityGovernanceHubPage = lazy(() => import("./pages/ops/ReliabilityGovernanceHubPage"));
const PredictiveReliabilityDashboardPage = lazy(() => import("./pages/ops/PredictiveReliabilityDashboardPage"));
const PrescriptiveReliabilityPage = lazy(() => import("./pages/ops/PrescriptiveReliabilityPage"));
const ReliabilityScenarioSimulatorPage = lazy(() => import("./pages/ops/ReliabilityScenarioSimulatorPage"));
const PrescriptiveInterventionWorkbenchPage = lazy(() => import("./pages/ops/PrescriptiveInterventionWorkbenchPage"));
const AIModuleHealthPage = lazy(() => import("./pages/ops/AIModuleHealthPage"));
const AIControlCenterPage = lazy(() => import("./pages/ops/AIControlCenterPage"));
const AIAuditLogPage = lazy(() => import("./pages/ops/AIAuditLogPage"));
const AILaunchReadinessPage = lazy(() => import("./pages/ops/AILaunchReadinessPage"));
const V2LaunchCommandCenterPage = lazy(() => import("./pages/ops/V2LaunchCommandCenterPage"));
const CategoryLaunchGatingPage = lazy(() => import("./pages/ops/CategoryLaunchGatingPage"));
const ZoneReadinessPage = lazy(() => import("./pages/ops/ZoneReadinessPage"));
const PartnerReadinessScorecardPage = lazy(() => import("./pages/ops/PartnerReadinessScorecardPage"));
const OperatorTrainingHubPage = lazy(() => import("./pages/ops/OperatorTrainingHubPage"));
const PilotTestTrackerPage = lazy(() => import("./pages/ops/PilotTestTrackerPage"));
const CommunicationReadinessPage = lazy(() => import("./pages/ops/CommunicationReadinessPage"));
const CustomerTrustAuditPage = lazy(() => import("./pages/ops/CustomerTrustAuditPage"));
const LaunchBlockersPage = lazy(() => import("./pages/ops/LaunchBlockersPage"));
const LaunchCommandCenterV2Page = lazy(() => import("./pages/ops/LaunchCommandCenterV2Page"));
const ReadinessCategoriesPage = lazy(() => import("./pages/ops/ReadinessCategoriesPage"));
const ReadinessZonesPage = lazy(() => import("./pages/ops/ReadinessZonesPage"));
const ReadinessPartnersPage = lazy(() => import("./pages/ops/ReadinessPartnersPage"));
const ReadinessCommunicationsPage = lazy(() => import("./pages/ops/ReadinessCommunicationsPage"));
const ReadinessPaymentsPage = lazy(() => import("./pages/ops/ReadinessPaymentsPage"));
const ReadinessTrustPage = lazy(() => import("./pages/ops/ReadinessTrustPage"));
const TrainingHubV2Page = lazy(() => import("./pages/ops/TrainingHubV2Page"));
const PilotValidationPage = lazy(() => import("./pages/ops/PilotValidationPage"));
const LaunchBlockersV2Page = lazy(() => import("./pages/ops/LaunchBlockersV2Page"));
const AdminSetupPage = lazy(() => import("./pages/ops/AdminSetupPage"));
const PartnerProvisioningPage = lazy(() => import("./pages/ops/PartnerProvisioningPage"));
const PartnerOnboardingReviewPage = lazy(() => import("./pages/ops/PartnerOnboardingReviewPage"));
const PilotProofDashboardPage = lazy(() => import("./pages/ops/PilotProofDashboardPage"));
const OperatorExecutionBoardPage = lazy(() => import("./pages/ops/OperatorExecutionBoardPage"));
const TrainingCompletionPage = lazy(() => import("./pages/ops/TrainingCompletionPage"));
const PilotControlPanelPage = lazy(() => import("./pages/ops/PilotControlPanelPage"));
const DemandDashboardPage = lazy(() => import("./pages/ops/DemandDashboardPage"));
const AIPreferencesPage = lazy(() => import("./pages/settings/AIPreferencesPage"));
const PropertyDashboardPage = lazy(() => import("./pages/property/PropertyDashboardPage"));
const PropertyAssetsPage = lazy(() => import("./pages/property/PropertyAssetsPage"));
const AssetDetailPage = lazy(() => import("./pages/property/AssetDetailPage"));
const InsightDetailPage = lazy(() => import("./pages/InsightDetailPage"));
const ContentIntelligenceOpsPage = lazy(() => import("./pages/ops/ContentIntelligenceOpsPage"));
const SPSIntelligenceDashboardPage = lazy(() => import("./pages/ops/SPSIntelligenceDashboardPage"));
const ConsumablesAdminPage = lazy(() => import("./pages/ops/ConsumablesAdminPage"));
const MarketplaceOverviewPage = lazy(() => import("./pages/ops/MarketplaceOverviewPage"));
const BookingDetailPage = lazy(() => import("./pages/BookingDetailPage"));
const NotificationPreferencesPage = lazy(() => import("./pages/NotificationPreferencesPage"));

// Consumables Ecosystem
const ConsumablesLandingPage = lazy(() => import("./pages/consumables/ConsumablesLandingPage"));
const ConsumablesFinderPage = lazy(() => import("./pages/consumables/ConsumablesFinderPage"));
const ConsumablesResultsPage = lazy(() => import("./pages/consumables/ConsumablesResultsPage"));
const ConsumableProductPage = lazy(() => import("./pages/consumables/ConsumableProductPage"));
const ConsumablesComparePage = lazy(() => import("./pages/consumables/ConsumablesComparePage"));
const ConsumablesRefillPage = lazy(() => import("./pages/consumables/ConsumablesRefillPage"));
const ConsumablesRefillTrackPage = lazy(() => import("./pages/consumables/ConsumablesRefillTrackPage"));
const ConsumablesRangeListPage = lazy(() => import("./pages/consumables/ConsumablesRangeListPage"));
const ConsumablesReorderPage = lazy(() => import("./pages/consumables/ConsumablesReorderPage"));
const ConsumablesBulkPage = lazy(() => import("./pages/consumables/ConsumablesBulkPage"));
const ConsumablesQRVerifyPage = lazy(() => import("./pages/consumables/ConsumablesQRVerifyPage"));
const ConsumablesCartPage = lazy(() => import("./pages/consumables/ConsumablesCartPage"));

// SPS — Smart Print Subscription
const SPSLandingPage = lazy(() => import("./pages/sps/SPSLandingPage"));
const FindMyPlanPage = lazy(() => import("./pages/sps/FindMyPlanPage"));
const SPSPlansPage = lazy(() => import("./pages/sps/SPSPlansPage"));
const SPSPlanDetailPage = lazy(() => import("./pages/sps/SPSPlanDetailPage"));
const SPSFleetPage = lazy(() => import("./pages/sps/SPSFleetPage"));
const SPSRequestPage = lazy(() => import("./pages/sps/SPSRequestPage"));
const SPSDashboardPage = lazy(() => import("./pages/sps/SPSDashboardPage"));
const SPSMeterPage = lazy(() => import("./pages/sps/SPSMeterPage"));
const SPSSupportPage = lazy(() => import("./pages/sps/SPSSupportPage"));
const SPSBillingPage = lazy(() => import("./pages/sps/SPSBillingPage"));
// Redirect helpers for legacy routes with params
const RedirectBooking = () => { const { category } = useParams(); return <Navigate to={`/book/${category}`} replace />; };
const RedirectQuote = () => { const { jobId } = useParams(); return <Navigate to={`/quote/${jobId}`} replace />; };
const RedirectCategory = () => { const { code } = useParams(); return <Navigate to={`/book/${code}`} replace />; };
const RedirectTracker = () => { const { jobId } = useParams(); return <Navigate to={`/tracker/${jobId}`} replace />; };

const queryClient = new QueryClient();

// Premium loading fallback with skeleton feel
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center safe-area-top">
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-primary/8" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" style={{ animationDuration: "0.9s" }} />
        <div className="absolute inset-2.5 rounded-full border-2 border-transparent border-b-accent animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm text-foreground font-semibold font-heading">Loading</span>
        <span className="text-[11px] text-muted-foreground">Just a moment…</span>
      </div>
    </div>
  </div>
);

// Helper wrapper for ops routes
const OpsRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GoogleMapsProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineBanner />
      <PilotModeBanner />
      <ChatWidget />
      <BrowserRouter>
        <TermsGuard>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ─── Auth Routes ─── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ─── V3 Customer Marketplace ─── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ConsumerBookingPage />} />
            <Route path="/book/:category" element={<BookingPage />} />
            <Route path="/quote/:jobId" element={<QuoteApprovalPage />} />
            <Route path="/diagnose" element={<DiagnosePage />} />
            <Route path="/tracker/:jobId" element={<TrackerPage />} />
            {/* Legacy route — redirect to canonical /tracker/:jobId */}
            <Route path="/track/:jobId" element={<RedirectTracker />} />
            <Route path="/track" element={<TrackJob />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/request/:category" element={<DemandRequestPage />} />
            <Route path="/submit/:category" element={<SubmitRequirementPage />} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/account/delete" element={<ProtectedRoute><AccountDeletionPage /></ProtectedRoute>} />
            <Route path="/support/account-deletion" element={<AccountDeletionPublicPage />} />
            <Route path="/bundle/:bundleId" element={<BundleBookingPage />} />
            <Route path="/sme" element={<SMEServicesPage />} />
            <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
            <Route path="/corporate" element={<CorporateServicesPage />} />
            <Route path="/supplies" element={<ConsumablesPage />} />

            {/* ─── Consumables Ecosystem ─── */}
            <Route path="/consumables" element={<ConsumablesLandingPage />} />
            <Route path="/consumables/finder" element={<ConsumablesFinderPage />} />
            <Route path="/consumables/results" element={<ConsumablesResultsPage />} />
            <Route path="/consumables/product/:productId" element={<ConsumableProductPage />} />
            <Route path="/consumables/compare" element={<ConsumablesComparePage />} />
            <Route path="/consumables/compatible" element={<ConsumablesRangeListPage />} />
            <Route path="/consumables/oem" element={<ConsumablesRangeListPage />} />
            <Route path="/consumables/refill" element={<ConsumablesRefillPage />} />
            <Route path="/consumables/refill/track" element={<ProtectedRoute><ConsumablesRefillTrackPage /></ProtectedRoute>} />
            <Route path="/consumables/reorder" element={<ProtectedRoute><ConsumablesReorderPage /></ProtectedRoute>} />
            <Route path="/consumables/bulk" element={<ConsumablesBulkPage />} />
            <Route path="/consumables/qr-verify" element={<ConsumablesQRVerifyPage />} />
            <Route path="/consumables/cart" element={<ProtectedRoute><ConsumablesCartPage /></ProtectedRoute>} />

            <Route path="/home-health" element={<ProtectedRoute><HomeHealthPage /></ProtectedRoute>} />
            <Route path="/reminders" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/service-history" element={<ProtectedRoute><ServiceHistoryPage /></ProtectedRoute>} />
            <Route path="/booking/:bookingId" element={<ProtectedRoute><BookingDetailPage /></ProtectedRoute>} />
            <Route path="/notification-preferences" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />

            {/* ─── Property Digital Twin ─── */}
            <Route path="/property" element={<ProtectedRoute><PropertyDashboardPage /></ProtectedRoute>} />
            <Route path="/property/:propertyId/assets" element={<ProtectedRoute><PropertyAssetsPage /></ProtectedRoute>} />
            <Route path="/property/:propertyId/asset/:assetId" element={<ProtectedRoute><AssetDetailPage /></ProtectedRoute>} />

            {/* ─── Legacy V2 redirects ─── */}
            <Route path="/v2" element={<Navigate to="/" replace />} />
            <Route path="/v2/book/:category" element={<RedirectBooking />} />
            <Route path="/v2/quote/:jobId" element={<RedirectQuote />} />

            {/* ─── Legacy V1 redirects ─── */}
            <Route path="/categories" element={<Navigate to="/" replace />} />
            <Route path="/category/:code" element={<RedirectCategory />} />

            {/* ─── Provider onboarding ─── */}
            <Route path="/join" element={<ProviderOnboardingPage />} />

            {/* ─── Partner routes (requires partner record) ─── */}
            <Route path="/partner" element={<PartnerRoute><PartnerDashboardPage /></PartnerRoute>} />
            <Route path="/partner/jobs" element={<PartnerRoute><PartnerJobsPage /></PartnerRoute>} />
            <Route path="/partner/job/:jobId" element={<PartnerRoute><PartnerJobDetailPage /></PartnerRoute>} />
            <Route path="/partner/technicians" element={<PartnerRoute><TechniciansPage /></PartnerRoute>} />
            <Route path="/partner/profile" element={<PartnerRoute><PartnerProfilePage /></PartnerRoute>} />
            <Route path="/partner/wallet" element={<PartnerRoute><PartnerWalletPage /></PartnerRoute>} />
            <Route path="/partner/quotes" element={<PartnerRoute><PartnerQuoteHistoryPage /></PartnerRoute>} />
            <Route path="/partner/performance" element={<PartnerRoute><PartnerPerformancePage /></PartnerRoute>} />
            <Route path="/partner/premium" element={<PartnerRoute><PartnerPremiumPage /></PartnerRoute>} />
            {/* Partner response portal — token-based, no auth required */}
            <Route path="/partner/respond/:token" element={<PartnerRespondPage />} />

            {/* ─── Technician routes (requires partner record) ─── */}
            <Route path="/technician" element={<PartnerRoute><TechnicianDashboardPage /></PartnerRoute>} />
            <Route path="/technician/jobs" element={<PartnerRoute><TechnicianJobsPage /></PartnerRoute>} />
            <Route path="/technician/job/:jobId" element={<PartnerRoute><TechnicianJobDetailPage /></PartnerRoute>} />
            <Route path="/technician/earnings" element={<PartnerRoute><TechnicianEarningsPage /></PartnerRoute>} />
            <Route path="/technician/parts" element={<PartnerRoute><TechnicianPartsPage /></PartnerRoute>} />
            <Route path="/technician/training" element={<PartnerRoute><TechnicianTrainingPage /></PartnerRoute>} />
            <Route path="/technician/support" element={<PartnerRoute><TechnicianSupportPage /></PartnerRoute>} />
            <Route path="/technician/safety" element={<PartnerRoute><TechnicianSafetyPage /></PartnerRoute>} />

            {/* ─── Care / Subscription ─── */}
            <Route path="/care" element={<CarePlansPage />} />
            <Route path="/care/subscribe/:planId" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
            <Route path="/care/dashboard" element={<ProtectedRoute><CareDashboardPage /></ProtectedRoute>} />
            <Route path="/care/device/:deviceId" element={<ProtectedRoute><DeviceTimelinePage /></ProtectedRoute>} />

            {/* ─── Device Passport ─── */}
            <Route path="/devices" element={<ProtectedRoute><DevicesDashboardPage /></ProtectedRoute>} />
            <Route path="/device/:passportId" element={<ProtectedRoute><DevicePassportPage /></ProtectedRoute>} />

            {/* ─── Ops Dashboard (admin only) ─── */}
            <Route path="/ops/dispatch" element={<OpsRoute><DispatchBoardPage /></OpsRoute>} />
            <Route path="/ops/finance" element={<OpsRoute><FinanceBoardPage /></OpsRoute>} />
            <Route path="/ops/subscriptions" element={<OpsRoute><SubscriptionAnalyticsPage /></OpsRoute>} />
            <Route path="/ops/diagnose-analytics" element={<OpsRoute><DiagnoseAnalyticsPage /></OpsRoute>} />
            <Route path="/ops/dispatch-analytics" element={<OpsRoute><DispatchAnalyticsPage /></OpsRoute>} />
            <Route path="/ops/control-tower" element={<OpsRoute><ControlTowerPage /></OpsRoute>} />
            <Route path="/ops/pricing" element={<OpsRoute><PricingEditorPage /></OpsRoute>} />
            <Route path="/ops/bypass-monitor" element={<OpsRoute><BypassMonitorPage /></OpsRoute>} />
            <Route path="/ops/ai-growth" element={<OpsRoute><AIGrowthEnginePage /></OpsRoute>} />
            <Route path="/ops/ai-intelligence" element={<OpsRoute><AIIntelligencePage /></OpsRoute>} />
            <Route path="/ops/expansion" element={<OpsRoute><ExpansionRoadmapPage /></OpsRoute>} />
            <Route path="/ops/revenue" element={<OpsRoute><RevenueEnginePage /></OpsRoute>} />
            <Route path="/ops/intelligence" element={<OpsRoute><MarketplaceIntelligencePage /></OpsRoute>} />
            <Route path="/ops/marketplace-overview" element={<OpsRoute><MarketplaceOverviewPage /></OpsRoute>} />
            <Route path="/ops/retention" element={<OpsRoute><RetentionDashboardPage /></OpsRoute>} />
            <Route path="/ops/launch" element={<OpsRoute><LaunchReadinessPage /></OpsRoute>} />
            <Route path="/ops/pilot-simulation" element={<OpsRoute><PilotSimulationPage /></OpsRoute>} />
            <Route path="/ops/provider-readiness" element={<OpsRoute><ProviderReadinessPage /></OpsRoute>} />
            <Route path="/ops/pilot-bookings" element={<OpsRoute><PilotBookingMonitorPage /></OpsRoute>} />
            <Route path="/ops/incidents" element={<OpsRoute><IncidentTrackerPage /></OpsRoute>} />
            <Route path="/ops/partner-readiness" element={<OpsRoute><PartnerPilotReadinessPage /></OpsRoute>} />
            <Route path="/ops/war-room" element={<OpsRoute><WarRoomPage /></OpsRoute>} />
            <Route path="/ops/dispatch-war-room" element={<OpsRoute><DispatchWarRoomPage /></OpsRoute>} />
            <Route path="/ops/support" element={<OpsRoute><SupportCasesPage /></OpsRoute>} />
            <Route path="/ops/automation-health" element={<OpsRoute><AutomationHealthPage /></OpsRoute>} />
            <Route path="/ops/pilot-readiness" element={<OpsRoute><PilotReadinessPanel /></OpsRoute>} />
            <Route path="/ops/command-center" element={<OpsRoute><LaunchCommandCenterPage /></OpsRoute>} />
            <Route path="/ops/incident-playbooks" element={<OpsRoute><IncidentPlaybooksPage /></OpsRoute>} />
            <Route path="/ops/self-healing" element={<OpsRoute><SelfHealingMonitorPage /></OpsRoute>} />
            <Route path="/ops/chaos-control" element={<OpsRoute><ChaosControlCenterPage /></OpsRoute>} />
            <Route path="/ops/reliability-archive" element={<OpsRoute><ReliabilityArchivePage /></OpsRoute>} />
            <Route path="/ops/executive-reliability" element={<OpsRoute><ExecutiveReliabilityBoardPage /></OpsRoute>} />
            <Route path="/ops/reliability-scope-planner" element={<OpsRoute><ReliabilityScopePlannerPage /></OpsRoute>} />
            <Route path="/ops/reliability-action-center" element={<OpsRoute><ReliabilityActionCenterPage /></OpsRoute>} />
            <Route path="/ops/reliability-operations-board" element={<OpsRoute><ReliabilityOperationsBoardPage /></OpsRoute>} />
            <Route path="/ops/reliability-governance-hub" element={<OpsRoute><ReliabilityGovernanceHubPage /></OpsRoute>} />
            <Route path="/ops/predictive-reliability" element={<OpsRoute><PredictiveReliabilityDashboardPage /></OpsRoute>} />
            <Route path="/ops/prescriptive-reliability" element={<OpsRoute><PrescriptiveReliabilityPage /></OpsRoute>} />
            <Route path="/ops/reliability-scenario-simulator" element={<OpsRoute><ReliabilityScenarioSimulatorPage /></OpsRoute>} />
            <Route path="/ops/reliability-scenarios" element={<OpsRoute><ReliabilityScenarioSimulatorPage /></OpsRoute>} />
            <Route path="/ops/prescriptive-interventions" element={<OpsRoute><PrescriptiveInterventionWorkbenchPage /></OpsRoute>} />
            <Route path="/ops/ai-module-health" element={<OpsRoute><AIModuleHealthPage /></OpsRoute>} />
            <Route path="/ops/ai-control-center" element={<OpsRoute><AIControlCenterPage /></OpsRoute>} />
            <Route path="/ops/ai-audit-log" element={<OpsRoute><AIAuditLogPage /></OpsRoute>} />
            <Route path="/ops/ai-launch-readiness" element={<OpsRoute><AILaunchReadinessPage /></OpsRoute>} />
            <Route path="/ops/launch-command-center" element={<OpsRoute><V2LaunchCommandCenterPage /></OpsRoute>} />
            <Route path="/ops/category-launch-gating" element={<OpsRoute><CategoryLaunchGatingPage /></OpsRoute>} />
            <Route path="/ops/zone-readiness" element={<OpsRoute><ZoneReadinessPage /></OpsRoute>} />
            <Route path="/ops/partner-readiness-scorecard" element={<OpsRoute><PartnerReadinessScorecardPage /></OpsRoute>} />
            <Route path="/ops/training-hub" element={<OpsRoute><OperatorTrainingHubPage /></OpsRoute>} />
            <Route path="/ops/pilot-test-tracker" element={<OpsRoute><PilotTestTrackerPage /></OpsRoute>} />
            <Route path="/ops/communication-readiness" element={<OpsRoute><CommunicationReadinessPage /></OpsRoute>} />
            <Route path="/ops/customer-trust-audit" element={<OpsRoute><CustomerTrustAuditPage /></OpsRoute>} />
            <Route path="/ops/launch-blockers" element={<OpsRoute><LaunchBlockersPage /></OpsRoute>} />
            <Route path="/ops/launch-command-center-v2" element={<OpsRoute><LaunchCommandCenterV2Page /></OpsRoute>} />
            <Route path="/ops/readiness-categories" element={<OpsRoute><ReadinessCategoriesPage /></OpsRoute>} />
            <Route path="/ops/readiness-zones" element={<OpsRoute><ReadinessZonesPage /></OpsRoute>} />
            <Route path="/ops/readiness-partners" element={<OpsRoute><ReadinessPartnersPage /></OpsRoute>} />
            <Route path="/ops/readiness-communications" element={<OpsRoute><ReadinessCommunicationsPage /></OpsRoute>} />
            <Route path="/ops/readiness-payments" element={<OpsRoute><ReadinessPaymentsPage /></OpsRoute>} />
            <Route path="/ops/readiness-trust" element={<OpsRoute><ReadinessTrustPage /></OpsRoute>} />
            <Route path="/ops/training-hub-v2" element={<OpsRoute><TrainingHubV2Page /></OpsRoute>} />
            <Route path="/ops/pilot-validation" element={<OpsRoute><PilotValidationPage /></OpsRoute>} />
            <Route path="/ops/launch-blockers-v2" element={<OpsRoute><LaunchBlockersV2Page /></OpsRoute>} />
            <Route path="/ops/admin-setup" element={<ProtectedRoute><AdminSetupPage /></ProtectedRoute>} />
            <Route path="/ops/partner-provisioning" element={<OpsRoute><PartnerProvisioningPage /></OpsRoute>} />
            <Route path="/ops/partner-onboarding-review" element={<OpsRoute><PartnerOnboardingReviewPage /></OpsRoute>} />
            <Route path="/ops/pilot-proof" element={<OpsRoute><PilotProofDashboardPage /></OpsRoute>} />
            <Route path="/ops/execution-board" element={<OpsRoute><OperatorExecutionBoardPage /></OpsRoute>} />
            <Route path="/ops/training-completion" element={<OpsRoute><TrainingCompletionPage /></OpsRoute>} />
            <Route path="/ops/pilot-control" element={<OpsRoute><PilotControlPanelPage /></OpsRoute>} />
            <Route path="/ops/demand-dashboard" element={<OpsRoute><DemandDashboardPage /></OpsRoute>} />
            <Route path="/ops/content-intelligence" element={<OpsRoute><ContentIntelligenceOpsPage /></OpsRoute>} />
            <Route path="/ops/sps-intelligence" element={<OpsRoute><SPSIntelligenceDashboardPage /></OpsRoute>} />
            <Route path="/ops/consumables" element={<OpsRoute><ConsumablesAdminPage /></OpsRoute>} />

            {/* ─── Content Intelligence ─── */}
            <Route path="/insights/:id" element={<InsightDetailPage />} />

            {/* ─── SPS — Smart Print Subscription ─── */}
            <Route path="/sps" element={<SPSLandingPage />} />
            <Route path="/sps/find-plan" element={<FindMyPlanPage />} />
            <Route path="/sps/plans" element={<SPSPlansPage />} />
            <Route path="/sps/plans/:planId" element={<SPSPlanDetailPage />} />
            <Route path="/sps/fleet" element={<SPSFleetPage />} />
            <Route path="/sps/request" element={<ProtectedRoute><SPSRequestPage /></ProtectedRoute>} />
            <Route path="/sps/dashboard" element={<ProtectedRoute><SPSDashboardPage /></ProtectedRoute>} />
            <Route path="/sps/meter" element={<ProtectedRoute><SPSMeterPage /></ProtectedRoute>} />
            <Route path="/sps/support" element={<ProtectedRoute><SPSSupportPage /></ProtectedRoute>} />
            <Route path="/sps/billing" element={<ProtectedRoute><SPSBillingPage /></ProtectedRoute>} />

            {/* ─── Settings Pages ─── */}
            <Route path="/settings/ai-preferences" element={<AIPreferencesPage />} />

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
        </TermsGuard>
      </BrowserRouter>
    </TooltipProvider>
    </GoogleMapsProvider>
  </QueryClientProvider>
);

export default App;
