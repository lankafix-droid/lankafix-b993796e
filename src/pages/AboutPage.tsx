import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import { ShieldCheck, Users, Zap, Heart, MapPin, Target, Award, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const STATS = [
  { value: "9", label: "Service Categories" },
  { value: "50+", label: "Verified Technicians" },
  { value: "24/7", label: "Emergency Support" },
  { value: "100%", label: "OTP Verified Jobs" },
];

const VALUES = [
  { icon: <ShieldCheck className="w-6 h-6" />, title: "Trust First", desc: "Every technician is verified, every job is OTP-secured, and every price is transparent. No hidden fees, no surprises." },
  { icon: <Heart className="w-6 h-6" />, title: "Built for Sri Lanka", desc: "We understand the frustration of finding reliable technicians. We built LankaFix because we experienced it ourselves." },
  { icon: <Users className="w-6 h-6" />, title: "Fair for Everyone", desc: "Customers get transparent pricing and warranty. Technicians get fair pay, steady work, and professional tools." },
  { icon: <Zap className="w-6 h-6" />, title: "Speed & Reliability", desc: "Same-day service for repairs, emergency support around the clock, and real-time job tracking so you're never left guessing." },
];

const TIMELINE = [
  { year: "The Problem", text: "Finding a trustworthy technician in Sri Lanka meant asking neighbours, hoping for the best, and often getting overcharged with no warranty." },
  { year: "The Idea", text: "What if there was one app where you could book verified technicians, see transparent prices, and get a real warranty — all from your phone?" },
  { year: "LankaFix", text: "We built Sri Lanka's first managed tech service marketplace. Not a directory. Not a listing site. A platform that controls quality from booking to completion." },
  { year: "Today", text: "Serving Greater Colombo with 9 service categories, verified technicians, and a commitment to making every repair trustworthy and transparent." },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-navy py-16 md:py-24">
          <div className="container max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex justify-center mb-6">
                <LankaFixLogo size="lg" variant="light" layout="icon" />
              </div>
              <h1 className="font-heading text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                We're Fixing How<br />Sri Lanka Gets Things Fixed
              </h1>
              <p className="text-base md:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
                LankaFix is Sri Lanka's first managed tech service marketplace — built to bring trust, transparency, and real warranty to every repair and installation.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="-mt-8 relative z-10">
          <div className="container max-w-3xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                  className="bg-card rounded-2xl border border-border/60 p-5 text-center shadow-sm"
                >
                  <p className="font-heading text-2xl md:text-3xl font-extrabold text-primary">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-16 md:py-20">
          <div className="container max-w-3xl">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-8 text-center">Our Story</h2>
            <div className="space-y-6">
              {TIMELINE.map((item, i) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    {i < TIMELINE.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2" />}
                  </div>
                  <div className="pb-6">
                    <p className="font-heading font-bold text-sm text-primary mb-1">{item.year}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 bg-secondary/50">
          <div className="container max-w-4xl">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2 text-center">What We Stand For</h2>
            <p className="text-sm text-muted-foreground text-center mb-10">The principles behind every LankaFix interaction</p>
            <div className="grid md:grid-cols-2 gap-6">
              {VALUES.map((v, i) => (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="bg-card rounded-2xl border border-border/60 p-6 hover:shadow-card-hover transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {v.icon}
                  </div>
                  <h3 className="font-heading font-bold text-foreground mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Service Area */}
        <section className="py-16">
          <div className="container max-w-3xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2">Currently Serving Greater Colombo</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xl mx-auto">
              We're starting where we can deliver the best experience. Colombo 1-15, Dehiwala, Mount Lavinia, Nugegoda, Maharagama, Kottawa, Kaduwela, Battaramulla, Rajagiriya, and surrounding areas.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Expanding to Kandy, Galle, and more cities soon. <Link to="/waitlist" className="text-primary font-semibold hover:underline">Join the waitlist →</Link>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-navy">
          <div className="container max-w-2xl text-center">
            <Award className="w-10 h-10 text-primary mx-auto mb-4" style={{ color: "hsl(211, 80%, 60%)" }} />
            <h2 className="font-heading text-xl md:text-2xl font-bold text-white mb-3">Ready to Experience the Difference?</h2>
            <p className="text-sm text-white/50 mb-8">Book your first service and see why Sri Lankans are choosing LankaFix.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="rounded-full font-heading font-bold">
                <Link to="/">Book a Service <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full font-heading font-bold border-white/20 text-white hover:bg-white/10">
                <Link to="/join">Become a Partner</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
