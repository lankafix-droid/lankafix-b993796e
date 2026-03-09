import { useState } from "react";
import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2IntentLayer from "@/components/v2/V2IntentLayer";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import V2NearbyTechnicians from "@/components/v2/V2NearbyTechnicians";
import V2TrustStrip from "@/components/v2/V2TrustStrip";
import V2HowItWorks from "@/components/v2/V2HowItWorks";
import V2DiagnoseAssistant from "@/components/v2/V2DiagnoseAssistant";
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
        <V2HeroSection onSetupLocation={() => setShowLocationSetup(true)} />
        <V2IntentLayer />
        <V2CategoryGrid />
        <V2NearbyTechnicians />

        {/* Diagnose section */}
        <section id="diagnose" className="py-8 md:py-10">
          <div className="container max-w-2xl">
            <V2DiagnoseAssistant />
          </div>
        </section>

        <V2HowItWorks />
        <V2TrustStrip />
      </main>
      <Footer />
    </div>
  );
};

export default V2HomePage;
