import { ShieldCheck, Eye, Award, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const badges = [
  { icon: <ShieldCheck className="w-5 h-5" />, label: "Verified Technicians", desc: "Background-checked & skill-tested" },
  { icon: <Eye className="w-5 h-5" />, label: "Transparent Pricing", desc: "No hidden charges, quote before work" },
  { icon: <Award className="w-5 h-5" />, label: "Warranty-Backed Service", desc: "Service guarantee on every job" },
  { icon: <Wallet className="w-5 h-5" />, label: "Pay After Service", desc: "No advance payment required" },
];

const V2TrustStrip = () => {
  return (
    <section className="py-6 md:py-8 bg-secondary/30 border-y border-border/30">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex items-start gap-2.5"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                {item.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground leading-tight">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2TrustStrip;
