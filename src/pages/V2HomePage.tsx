import { useState, lazy, Suspense } from "react";
import PageTransition from "@/components/motion/PageTransition";
import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2PopularServices from "@/components/v2/V2PopularServices";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import Footer from "@/components/landing/Footer";
import LocationSetupFlow from "@/components/v2/location/LocationSetupFlow";
import { useLocationStore } from "@/store/locationStore";

// Lazy-load below-fold sections for performance
const V2BookAgain = lazy(() => import("@/components/v2/V2BookAgain"));
const V2NearbyTechnicians = lazy(() => import("@/components/v2/V2NearbyTechnicians"));
const V2WhyLankaFix = lazy(() => import("@/components/v2/V2WhyLankaFix"));
const V2HowItWorks = lazy(() => import("@/components/v2/V2HowItWorks"));
const V2SocialProof = lazy(() => import("@/components/v2/V2SocialProof"));
const V2HomeFAQ = lazy(() => import("@/components/v2/V2HomeFAQ"));
const V2SupportEntry = lazy(() => import("@/components/v2/V2SupportEntry"));
const V2TrustStrip = lazy(() => import("@/components/v2/V2TrustStrip"));

const SectionFallback = () => <div className="h-32" />;

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
        {/* 1. Hero — search, location, emergency CTA, trust pills */}
        <V2HeroSection onSetupLocation={() => setShowLocationSetup(true)} />

        {/* 2. Popular services — most booked, quick conversion */}
        <V2PopularServices />

        {/* 3. Book again — returning users */}
        <Suspense fallback={<SectionFallback />}>
          <V2BookAgain />
        </Suspense>

        {/* 4. Category grid — all launch categories */}
        <V2CategoryGrid />

        {/* 5. Nearby verified technicians */}
        <Suspense fallback={<SectionFallback />}>
          <V2NearbyTechnicians />
        </Suspense>

        {/* 6. Why LankaFix — trust differentiators */}
        <Suspense fallback={<SectionFallback />}>
          <V2WhyLankaFix />
        </Suspense>

        {/* 7. How it works — 4-step explainer */}
        <Suspense fallback={<SectionFallback />}>
          <V2HowItWorks />
        </Suspense>

        {/* 8. Social proof — testimonials + stats */}
        <Suspense fallback={<SectionFallback />}>
          <V2SocialProof />
        </Suspense>

        {/* 9. FAQ */}
        <Suspense fallback={<SectionFallback />}>
          <V2HomeFAQ />
        </Suspense>

        {/* 10. Support entry */}
        <Suspense fallback={<SectionFallback />}>
          <V2SupportEntry />
        </Suspense>

        {/* 11. Trust strip — final confidence builder */}
        <Suspense fallback={<SectionFallback />}>
          <V2TrustStrip />
        </Suspense>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default V2HomePage;
