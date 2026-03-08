import Header from "@/components/layout/Header";
import V2HeroSection from "@/components/v2/V2HeroSection";
import V2IntentLayer from "@/components/v2/V2IntentLayer";
import V2CategoryGrid from "@/components/v2/V2CategoryGrid";
import V2TrustStrip from "@/components/v2/V2TrustStrip";
import V2HowItWorks from "@/components/v2/V2HowItWorks";
import V2DiagnoseAssistant from "@/components/v2/V2DiagnoseAssistant";
import Footer from "@/components/landing/Footer";

const V2HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <V2HeroSection />
        <V2IntentLayer />
        <V2CategoryGrid />

        {/* Diagnose My Problem section */}
        <section className="py-8 md:py-10">
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
