import { useState } from "react";
import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2IntentLayer from "@/components/v2/V2IntentLayer";
import V2EmergencyBlock from "@/components/v2/V2EmergencyBlock";
import V2SmartRecommendations from "@/components/v2/V2SmartRecommendations";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import V2NearbyTechnicians from "@/components/v2/V2NearbyTechnicians";
import V2TrustStrip from "@/components/v2/V2TrustStrip";
import V2HowItWorks from "@/components/v2/V2HowItWorks";
import V2DiagnoseAssistant from "@/components/v2/V2DiagnoseAssistant";
import V2ServiceBundles from "@/components/v2/V2ServiceBundles";
import SuperAppShortcuts from "@/components/v2/SuperAppShortcuts";
import V2SMEBanner from "@/components/v2/V2SMEBanner";
import V2SocialProof from "@/components/v2/V2SocialProof";
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* 1. Trust + Quick access */}
        <V2HeroSection onSetupLocation={() => setShowLocationSetup(true)} />

        {/* 2. Intent selection */}
        <V2IntentLayer />

        {/* 3. Emergency services block */}
        <V2EmergencyBlock />

        {/* 4. Smart recommendations */}
        <V2SmartRecommendations />

        {/* 5. Category discovery (grouped) */}
        <V2CategoryGrid />

        {/* 6. Super-app ecosystem shortcuts */}
        <SuperAppShortcuts />

        {/* 7. Service bundles */}
        <V2ServiceBundles />

        {/* 8. Nearby technicians */}
        <V2NearbyTechnicians />

        {/* 9. Social proof + stats */}
        <V2SocialProof />

        {/* 10. Diagnose assistant */}
        <section id="diagnose" className="py-8 md:py-10">
          <div className="container max-w-2xl">
            <V2DiagnoseAssistant />
          </div>
        </section>

        {/* 11. SME banner */}
        <V2SMEBanner />

        {/* 12. How it works */}
        <V2HowItWorks />

        {/* 13. Why LankaFix trust strip */}
        <V2TrustStrip />
      </main>
      <Footer />
    </div>
  );
};

export default V2HomePage;
