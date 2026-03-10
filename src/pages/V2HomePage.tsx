import { useState } from "react";
import PageTransition from "@/components/motion/PageTransition";
import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2SeasonalPromos from "@/components/v2/V2SeasonalPromos";
import V2IntentLayer from "@/components/v2/V2IntentLayer";
import V2EmergencyBlock from "@/components/v2/V2EmergencyBlock";
import V2SmartRecommendations from "@/components/v2/V2SmartRecommendations";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import V2NearbyTechnicians from "@/components/v2/V2NearbyTechnicians";
import V2HowItWorks from "@/components/v2/V2HowItWorks";
import V2DiagnoseAssistant from "@/components/v2/V2DiagnoseAssistant";
import V2ServiceBundles from "@/components/v2/V2ServiceBundles";
import AISmartSearch from "@/components/ai/AISmartSearch";
import AIPhotoDiagnosis from "@/components/ai/AIPhotoDiagnosis";
import SuperAppShortcuts from "@/components/v2/SuperAppShortcuts";
import V2SMEBanner from "@/components/v2/V2SMEBanner";
import V2SocialProof from "@/components/v2/V2SocialProof";
import V2PlatformProtection from "@/components/v2/V2PlatformProtection";
import V2TrustStrip from "@/components/v2/V2TrustStrip";
import Footer from "@/components/landing/Footer";
import LocationSetupFlow from "@/components/v2/location/LocationSetupFlow";
import { useLocationStore } from "@/store/locationStore";

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
        {/* 1. Hero — Cinematic banner + search + availability */}
        <V2HeroSection onSetupLocation={() => setShowLocationSetup(true)} />

        {/* 2. AI Smart Search — natural language discovery */}
        <AISmartSearch />

        {/* 3. Emergency — high-urgency section */}
        <V2EmergencyBlock />

        {/* 4. Smart recommendations — AI-powered suggestions */}
        <V2SmartRecommendations />

        {/* 5. Category discovery — main service grid */}
        <V2CategoryGrid />

        {/* 6. Super-app shortcuts — ecosystem entry points */}
        <SuperAppShortcuts />

        {/* 7. Seasonal promotions */}
        <V2SeasonalPromos />

        {/* 8. Service bundles */}
        <V2ServiceBundles />

        {/* 9. Nearby technicians — marketplace trust */}
        <V2NearbyTechnicians />

        {/* 10. Social proof — testimonials + stats */}
        <V2SocialProof />

        {/* 11. Diagnose assistant — AI chat CTA */}
        <section id="diagnose" className="py-10 md:py-12">
          <div className="container max-w-2xl">
            <V2DiagnoseAssistant />
          </div>
        </section>

        {/* 12. SME section */}
        <V2SMEBanner />

        {/* 13. How it works — simple explainer */}
        <V2HowItWorks />

        {/* 14. Platform protection — trust grid */}
        <V2PlatformProtection />

        {/* 15. Trust strip — final confidence */}
        <V2TrustStrip />
      </main>
      <Footer />
    </PageTransition>
  );
};

export default V2HomePage;
