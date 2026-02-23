import Header from "@/components/layout/Header";
import HeroSection from "@/components/landing/HeroSection";
import GeoStrip from "@/components/landing/GeoStrip";
import CategoryGrid from "@/components/landing/CategoryGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import TrustStrip from "@/components/landing/TrustStrip";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <GeoStrip />
        <CategoryGrid />
        <HowItWorks />
        <TrustStrip />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
