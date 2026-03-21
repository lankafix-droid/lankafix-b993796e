import { useState, lazy, Suspense } from "react";
import PageTransition from "@/components/motion/PageTransition";
import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2PopularServices from "@/components/v2/V2PopularServices";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import Footer from "@/components/landing/Footer";
import LocationSetupFlow from "@/components/v2/location/LocationSetupFlow";
import { useLocationStore } from "@/store/locationStore";
import SmartCampaignSection from "@/components/campaigns/SmartCampaignSection";
import ContentIntelligenceLayer from "@/components/content/ContentIntelligenceLayer";
import AtmosphereGlow from "@/components/atmosphere/AtmosphereGlow";

// Lazy-load below-fold sections
const V2TrustStrip = lazy(() => import("@/components/v2/V2TrustStrip"));
const V2NearbyTechnicians = lazy(() => import("@/components/v2/V2NearbyTechnicians"));
const V2BookAgain = lazy(() => import("@/components/v2/V2BookAgain"));
const V2WhyLankaFix = lazy(() => import("@/components/v2/V2WhyLankaFix"));
const V2HowItWorks = lazy(() => import("@/components/v2/V2HowItWorks"));
const V2SocialProof = lazy(() => import("@/components/v2/V2SocialProof"));
const V2HomeFAQ = lazy(() => import("@/components/v2/V2HomeFAQ"));
const V2SupportEntry = lazy(() => import("@/components/v2/V2SupportEntry"));

const SectionFallback = () => <div className="h-16" aria-hidden />;

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
    <PageTransition className="min-h-screen flex flex-col bg-background relative">
      <AtmosphereGlow />
      <Header />
      <main className="flex-1 relative z-[1]">
        {/* 1. Hero — search, location, trust */}
        <V2HeroSection onSetupLocation={() => setShowLocationSetup(true)} />

        {/* 2. Trust strip — immediate confidence */}
        <Suspense fallback={<SectionFallback />}>
          <V2TrustStrip />
        </Suspense>

        {/* 3. Popular services — high-conversion */}
        <V2PopularServices />

        {/* 4. Book again — returning users */}
        <Suspense fallback={<SectionFallback />}>
          <V2BookAgain />
        </Suspense>

        {/* 5. Smart campaigns — contextual */}
        <SmartCampaignSection />

        {/* 6. All categories */}
        <V2CategoryGrid />

        {/* 7. Content intelligence */}
        <ContentIntelligenceLayer />

        {/* 8. How it works */}
        <Suspense fallback={<SectionFallback />}>
          <V2HowItWorks />
        </Suspense>

        {/* 9. Nearby technicians */}
        <Suspense fallback={<SectionFallback />}>
          <V2NearbyTechnicians />
        </Suspense>

        {/* 10. Why LankaFix */}
        <Suspense fallback={<SectionFallback />}>
          <V2WhyLankaFix />
        </Suspense>

        {/* 11. Social proof + guarantees */}
        <Suspense fallback={<SectionFallback />}>
          <V2SocialProof />
        </Suspense>

        {/* 12. FAQ */}
        <Suspense fallback={<SectionFallback />}>
          <V2HomeFAQ />
        </Suspense>

        {/* 13. Support */}
        <Suspense fallback={<SectionFallback />}>
          <V2SupportEntry />
        </Suspense>
      </main>

      <Footer />
    </PageTransition>
  );
};

export default V2HomePage;
