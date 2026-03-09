import { useState, useEffect } from "react";
import { Star, CheckCircle2, Users, TrendingUp, Shield, Banknote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TESTIMONIALS = [
  { name: "Kasun P.", location: "Nugegoda", service: "AC Repair", rating: 5, text: "Technician arrived in 45 minutes, fixed my AC, and the price was exactly what was quoted. First time I didn't feel cheated!", avatar: "KP" },
  { name: "Nisha F.", location: "Dehiwala", service: "Phone Screen", rating: 5, text: "My Samsung screen was replaced in under an hour. OTP verification gave me confidence. Will definitely use again.", avatar: "NF" },
  { name: "Rajeev S.", location: "Rajagiriya", service: "CCTV Installation", rating: 5, text: "6-camera setup completed in one day. The milestone payment system made a LKR 85,000 project feel safe. Excellent work!", avatar: "RS" },
  { name: "Amali W.", location: "Battaramulla", service: "Laptop Repair", rating: 4, text: "Data recovery was successful! I was worried about my thesis files. The technician was professional and kept me updated.", avatar: "AW" },
  { name: "Dinesh K.", location: "Maharagama", service: "Solar Panel Service", rating: 5, text: "Site inspection was thorough, quote was detailed, and installation was flawless. Transparent from start to finish.", avatar: "DK" },
];

const LIVE_ACTIVITIES = [
  "AC service completed in Colombo 7",
  "Phone screen replaced in Dehiwala",
  "CCTV installation started in Rajagiriya",
  "Laptop repair booked in Nugegoda",
  "Solar inspection completed in Battaramulla",
  "AC gas top-up done in Mount Lavinia",
  "WiFi setup completed in Kaduwela",
  "Printer repair booked in Colombo 3",
];

const V2SocialProof = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [liveActivity, setLiveActivity] = useState(0);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setActiveTestimonial((p) => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const showTimer = setTimeout(() => setShowActivity(true), 3000);
    const cycleTimer = setInterval(() => {
      setShowActivity(false);
      setTimeout(() => {
        setLiveActivity((p) => (p + 1) % LIVE_ACTIVITIES.length);
        setShowActivity(true);
      }, 500);
    }, 6000);
    return () => { clearTimeout(showTimer); clearInterval(cycleTimer); };
  }, []);

  const t = TESTIMONIALS[activeTestimonial];

  return (
    <section className="py-12 md:py-16">
      <div className="container space-y-10">
        {/* Live Activity Toast */}
        <AnimatePresence>
          {showActivity && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: -10, x: "-50%" }}
              transition={{ duration: 0.4 }}
              className="fixed bottom-20 left-1/2 z-40 bg-card border border-border/60 rounded-full px-5 py-2.5 shadow-lg flex items-center gap-2.5 max-w-[90vw]"
            >
              <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
              <p className="text-xs font-medium text-foreground whitespace-nowrap">{LIVE_ACTIVITIES[liveActivity]}</p>
              <span className="text-[10px] text-muted-foreground">just now</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Users className="w-5 h-5" />, value: "2,500+", label: "Happy Customers", color: "text-primary" },
            { icon: <CheckCircle2 className="w-5 h-5" />, value: "8,000+", label: "Jobs Completed", color: "text-success" },
            { icon: <Star className="w-5 h-5" />, value: "4.8/5", label: "Average Rating", color: "text-warning" },
            { icon: <TrendingUp className="w-5 h-5" />, value: "94%", label: "Repeat Customers", color: "text-primary" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="bg-card rounded-2xl border border-border/60 p-5 text-center"
            >
              <div className={`${stat.color} flex justify-center mb-2`}>{stat.icon}</div>
              <p className="font-heading text-xl md:text-2xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div>
          <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-1 text-center">What Our Customers Say</h2>
          <p className="text-xs text-muted-foreground text-center mb-6">Real reviews from real Sri Lankan customers</p>

          <div className="max-w-lg mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="bg-card rounded-2xl border border-border/60 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-sm text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.location} · {t.service}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.text}"</p>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-4">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === activeTestimonial ? "w-6 bg-primary" : "w-3 bg-border"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* LankaFix Guarantee + Pay After Service */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground mb-1">LankaFix Guarantee</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every job backed by verified technicians, OTP security, transparent quotes, and service warranty. If something goes wrong, we make it right.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-success/5 border border-success/20 rounded-2xl p-6 flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground mb-1">Pay After Service</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Prefer cash? No problem. Pay the technician after the job is done and verified. No advance payment required for most services. 
                <span className="text-[11px] block mt-1 text-muted-foreground/70">Online payment also available</span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default V2SocialProof;
