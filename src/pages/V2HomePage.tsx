import { useState, lazy, Suspense } from "react";
import PageTransition from "@/components/motion/PageTransition";
import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2PopularServices from "@/components/v2/V2PopularServices";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import Footer from "@/components/landing/Footer";
import LocationSetupFlow from "@/components/v2/location/LocationSetupFlow";
import { useLocationStore } from "@/store/locationStore";

// Lazy-load below-fold sections for mobile performance
const V2NearbyTechnicians = lazy(() => import("@/components/v2/V2NearbyTechnicians"));
const V2BookAgain = lazy(() => import("@/components/v2/V2BookAgain"));
const V2WhyLankaFix = lazy(() => import("@/components/v2/V2WhyLankaFix"));
const V2HowItWorks = lazy(() => import("@/components/v2/V2HowItWorks"));
const V2SocialProof = lazy(() => import("@/components/v2/V2SocialProof"));
const V2HomeFAQ = lazy(() => import("@/components/v2/V2HomeFAQ"));
const V2SupportEntry = lazy(() => import("@/components/v2/V2SupportEntry"));
const V2TrustStrip = lazy(() => import("@/components/v2/V2TrustStrip"));

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

        {/* 2. Popular Services — high-conversion quick links */}
        <V2PopularServices />

        {/* 3. Category Grid — Phase-1 launch categories prioritized */}
        <V2CategoryGrid />

        {/* 4. Nearby Verified Technicians — trust + social proof */}
        <Suspense fallback={<SectionFallback />}>
          <V2NearbyTechnicians />
        </Suspense>

        {/* 5. Book Again — returning users only */}
        <Suspense fallback={<SectionFallback />}>
          <V2BookAgain />
        </Suspense>

        {/* 6. Why LankaFix — trust differentiators */}
        <Suspense fallback={<SectionFallback />}>
          <V2WhyLankaFix />
        </Suspense>

        {/* 7. How It Works — 4-step explainer */}
        <Suspense fallback={<SectionFallback />}>
          <V2HowItWorks />
        </Suspense>

        {/* 8. Social Proof — testimonials + stats */}
        <Suspense fallback={<SectionFallback />}>
          <V2SocialProof />
        </Suspense>

        {/* 9. FAQ */}
        <Suspense fallback={<SectionFallback />}>
          <V2HomeFAQ />
        </Suspense>

        {/* 10. Support — WhatsApp, help, track */}
        <Suspense fallback={<SectionFallback />}>
          <V2SupportEntry />
        </Suspense>

        {/* 11. Trust Strip — final confidence builder */}
        <Suspense fallback={<SectionFallback />}>
          <V2TrustStrip />
        </Suspense>
      </main>

      {/* 12. Footer */}
      <Footer />
    </PageTransition>
  );
};

export default V2HomePage;
