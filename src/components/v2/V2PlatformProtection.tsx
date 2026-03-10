import { Link } from "react-router-dom";
import { ShieldCheck, Eye, KeyRound, FileCheck, Award, Lock, HeartHandshake, MessageCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const protections = [
  { icon: <ShieldCheck className="w-5 h-5" />, title: "Verified Technicians", desc: "Background-checked, certified, and rated by real customers" },
  { icon: <Eye className="w-5 h-5" />, title: "Transparent Pricing", desc: "See price ranges before booking. No hidden fees, ever" },
  { icon: <KeyRound className="w-5 h-5" />, title: "OTP Job Verification", desc: "Secure start and completion codes protect every service" },
  { icon: <FileCheck className="w-5 h-5" />, title: "Approval Before Extra Work", desc: "No surprise charges. You approve every quote before work begins" },
  { icon: <Award className="w-5 h-5" />, title: "Digital Invoice", desc: "Complete breakdown of parts, labour, and charges after service" },
  { icon: <Lock className="w-5 h-5" />, title: "Service Warranty", desc: "Parts and labour guaranteed. Come back if anything isn't right" },
  { icon: <HeartHandshake className="w-5 h-5" />, title: "LankaFix Mediation", desc: "Disputes resolved fairly by our dedicated support team" },
  { icon: <MessageCircle className="w-5 h-5" />, title: "WhatsApp Support", desc: "Reach us anytime. Real people, fast replies" },
];

const V2PlatformProtection = () => {
  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2">
            How LankaFix Protects You
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Every booking is backed by platform-level security, transparency, and accountability
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {protections.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="bg-card rounded-2xl border border-border/40 p-5 group hover:border-primary/20 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </div>
              <h3 className="font-heading font-bold text-sm text-foreground mb-1.5">{item.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Link
            to="/how-pricing-works"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-300"
          >
            Learn how LankaFix protects your booking
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default V2PlatformProtection;
