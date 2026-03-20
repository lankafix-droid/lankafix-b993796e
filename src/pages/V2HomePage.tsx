import { useState, lazy, Suspense } from "react";
import PageTransition from "@/components/motion/PageTransition";
import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2PopularServices from "@/components/v2/V2PopularServices";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import SuperAppShortcuts from "@/components/v2/SuperAppShortcuts";
import SPSPromoBanner from "@/components/v2/SPSPromoBanner";
import Footer from "@/components/landing/Footer";
import LocationSetupFlow from "@/components/v2/location/LocationSetupFlow";
import { useLocationStore } from "@/store/locationStore";
import SmartCampaignSection from "@/components/campaigns/SmartCampaignSection";
import ContentIntelligenceLayer from "@/components/content/ContentIntelligenceLayer";

// Lazy-load below-fold sections for mobile performance
const V2TrustStrip = lazy(() => import("@/components/v2/V2TrustStrip"));
const V2NearbyTechnicians = lazy(() => import("@/components/v2/V2NearbyTechnicians"));
const V2BookAgain = lazy(() => import("@/components/v2/V2BookAgain"));
const V2WhyLankaFix = lazy(() => import("@/components/v2/V2WhyLankaFix"));
const V2HowItWorks = lazy(() => import("@/components/v2/V2HowItWorks"));
const V2SocialProof = lazy(() => import("@/components/v2/V2SocialProof"));
const V2HomeFAQ = lazy(() => import("@/components/v2/V2HomeFAQ"));
const V2SupportEntry = lazy(() => import("@/components/v2/V2SupportEntry"));

const SectionFallback = () => <div className="h-24" aria-hidden />;

const V2HomePage = () => {
  const { locationSetupComplete } = useLocationStore();
  const [showLocationSetup, setShowLocationSetup] = useState(false);

  if (showLocationSetup && !locationSetupComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <div className="container max-w-md py-6">
            <LocationSetupFlow
              onComplete={() => setShowLocationSetup(false)}
              onSkip={() => setShowLocationSetup(false)}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* 1. Hero — search, location, emergency, trust pills */}
        <V2HeroSection onSetupLocation={() => setShowLocationSetup(true)} />

        {/* 1.5 Smart Campaign Engine */}
        <SmartCampaignSection />

        {/* 2. Trust Strip — immediate confidence builder */}
        <Suspense fallback={<SectionFallback />}>
          <V2TrustStrip />
        </Suspense>

        {/* 3. Popular Services — high-conversion quick links */}
        <V2PopularServices />

        {/* 3.5 Super App Shortcuts — Devices, Care Plans, SPS, Supplies */}
        <SuperAppShortcuts />

        {/* 3.7 SPS Promo Banner */}
        <SPSPromoBanner />

        {/* 4. Book Again — returning users only */}
        <Suspense fallback={<SectionFallback />}>
          <V2BookAgain />
        </Suspense>

        {/* 5. Category Grid — Launch → More Solutions → Coming Soon */}
        <V2CategoryGrid />

        {/* 5.5 Content Intelligence Layer */}
        <ContentIntelligenceLayer />

        {/* 6. Nearby Verified Technicians — trust + social proof */}
        <Suspense fallback={<SectionFallback />}>
          <V2NearbyTechnicians />
        </Suspense>

        {/* 7. Why LankaFix — trust differentiators */}
        <Suspense fallback={<SectionFallback />}>
          <V2WhyLankaFix />
        </Suspense>

        {/* 8. How It Works — 5-step booking explainer */}
        <Suspense fallback={<SectionFallback />}>
          <V2HowItWorks />
        </Suspense>

        {/* 9. Support — WhatsApp, help, track */}
        <Suspense fallback={<SectionFallback />}>
          <V2SupportEntry />
        </Suspense>

        {/* 10. Social Proof — testimonials */}
        <Suspense fallback={<SectionFallback />}>
          <V2SocialProof />
        </Suspense>

        {/* 11. FAQ */}
        <Suspense fallback={<SectionFallback />}>
          <V2HomeFAQ />
        </Suspense>
      </main>

      {/* 12. Footer */}
      <Footer />
    </PageTransition>
  );
};

export default V2HomePage;
