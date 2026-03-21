import { useState, useEffect } from "react";
import { Star, Shield, Banknote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TESTIMONIALS = [
  { name: "Kasun P.", location: "Nugegoda", service: "AC Repair", rating: 5, text: "Technician arrived in 45 minutes, fixed my AC, and the price was exactly what was quoted. First time I didn't feel cheated.", avatar: "KP" },
  { name: "Nisha F.", location: "Dehiwala", service: "Phone Screen", rating: 5, text: "Samsung screen replaced in under an hour. OTP verification gave me real confidence. Will use again.", avatar: "NF" },
  { name: "Rajeev S.", location: "Rajagiriya", service: "CCTV Installation", rating: 5, text: "6-camera setup in one day. The milestone payment system made an Rs 85,000 project feel safe.", avatar: "RS" },
  { name: "Amali W.", location: "Battaramulla", service: "Laptop Repair", rating: 4, text: "Data recovery was successful. I was worried about my thesis files. The technician was professional throughout.", avatar: "AW" },
  { name: "Dinesh K.", location: "Maharagama", service: "Solar Panel", rating: 5, text: "Thorough site inspection, detailed quote, flawless installation. Transparent from start to finish.", avatar: "DK" },
];

const V2SocialProof = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((p) => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <section className="py-12 md:py-16">
      <div className="container space-y-10">
        {/* Testimonials */}
        <div>
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-1">Real Reviews</h2>
            <p className="text-xs text-muted-foreground">From homes and businesses across Colombo</p>
          </motion.div>

          <div className="max-w-lg mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="bg-card rounded-2xl border border-border/40 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading font-bold text-xs">
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.location} · {t.service}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-warning text-warning" />
                    ))}
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">"{t.text}"</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center gap-1.5 mt-4">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${i === active ? "w-5 bg-primary/60" : "w-2 bg-border"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Guarantee cards */}
        <div className="grid md:grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-primary/4 border border-primary/10 rounded-2xl p-5 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-foreground mb-1">LankaFix Guarantee</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Verified technicians, OTP security, transparent quotes, and service warranty on every job.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="bg-success/4 border border-success/10 rounded-2xl p-5 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-success/8 text-success flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-foreground mb-1">Pay After Service</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                No advance payment for most services. Cash or online — pay only after the job is done and verified.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default V2SocialProof;
