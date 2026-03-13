import { useState } from "react";
import PageTransition from "@/components/motion/PageTransition";
import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2EmergencyBlock from "@/components/v2/V2EmergencyBlock";
import V2PopularServices from "@/components/v2/V2PopularServices";
import V2BookAgain from "@/components/v2/V2BookAgain";
import V2SmartRecommendations from "@/components/v2/V2SmartRecommendations";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import AISmartSearch from "@/components/ai/AISmartSearch";
import V2NearbyTechnicians from "@/components/v2/V2NearbyTechnicians";
import V2DiagnoseAssistant from "@/components/v2/V2DiagnoseAssistant";
import V2WhyLankaFix from "@/components/v2/V2WhyLankaFix";
import V2HowItWorks from "@/components/v2/V2HowItWorks";
import V2PlatformProtection from "@/components/v2/V2PlatformProtection";
import V2SocialProof from "@/components/v2/V2SocialProof";
import V2SeasonalPromos from "@/components/v2/V2SeasonalPromos";
import V2ServiceBundles from "@/components/v2/V2ServiceBundles";
import SuperAppShortcuts from "@/components/v2/SuperAppShortcuts";
import V2SMEBanner from "@/components/v2/V2SMEBanner";
import V2HomeFAQ from "@/components/v2/V2HomeFAQ";
import V2SupportEntry from "@/components/v2/V2SupportEntry";
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
        {/* 1. Hero — cinematic banner + search + availability + trust pills */}
        <V2HeroSection onSetupLocation={() => setShowLocationSetup(true)} />

        {/* 2. Emergency — high-urgency quick access */}
        <V2EmergencyBlock />

        {/* 3. Popular services — most booked, quick conversion */}
        <V2PopularServices />

        {/* 4. Book again — repeat bookings for returning users */}
        <V2BookAgain />

        {/* 5. Smart recommendations — personalized device-based suggestions */}
        <V2SmartRecommendations />

        {/* 6. Category grid — all 7 launch categories + coming soon */}
        <V2CategoryGrid />

        {/* 7. AI Smart Search — natural language discovery */}
        <AISmartSearch />

        {/* 8. Nearby verified technicians */}
        <V2NearbyTechnicians />

        {/* 9. Why LankaFix — trust differentiators */}
        <V2WhyLankaFix />

        {/* 10. How it works — simple 4-step explainer */}
        <V2HowItWorks />

        {/* 11. Social proof — testimonials + stats + guarantee */}
        <V2SocialProof />

        {/* 12. Platform protection — trust grid */}
        <V2PlatformProtection />

        {/* 13. AI Diagnose assistant */}
        <section id="diagnose" className="py-10 md:py-12">
          <div className="container max-w-2xl">
            <V2DiagnoseAssistant />
          </div>
        </section>

        {/* 14. Seasonal promotions */}
        <V2SeasonalPromos />

        {/* 15. Service bundles */}
        <V2ServiceBundles />

        {/* 16. Super-app shortcuts — devices, care plans, history */}
        <SuperAppShortcuts />

        {/* 17. SME / Business section */}
        <V2SMEBanner />

        {/* 18. FAQ — common questions answered */}
        <V2HomeFAQ />

        {/* 19. Support entry — WhatsApp, FAQ, Track */}
        <V2SupportEntry />

        {/* 20. Trust strip — final confidence builder */}
        <V2TrustStrip />
      </main>
      <Footer />
    </PageTransition>
  );
};

export default V2HomePage;
