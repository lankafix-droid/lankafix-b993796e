import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2IntentLayer from "@/components/v2/V2IntentLayer";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import V2TrustStrip from "@/components/v2/V2TrustStrip";
import V2HowItWorks from "@/components/v2/V2HowItWorks";
import Footer from "@/components/landing/Footer";

const V2HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <V2HeroSection />
        <V2IntentLayer />
        <V2CategoryGrid />
        <V2HowItWorks />
        <V2TrustStrip />
      </main>
      <Footer />
    </div>
  );
};

export default V2HomePage;
