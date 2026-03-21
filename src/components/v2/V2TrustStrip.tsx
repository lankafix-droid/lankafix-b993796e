import { ShieldCheck, Eye, Award, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const badges = [
  { icon: <ShieldCheck className="w-4 h-4" />, label: "Verified Technicians" },
  { icon: <Eye className="w-4 h-4" />, label: "Upfront Pricing" },
  { icon: <Award className="w-4 h-4" />, label: "Service Warranty" },
  { icon: <Wallet className="w-4 h-4" />, label: "Pay After Service" },
];

const V2TrustStrip = () => {
  return (
    <section className="py-4 border-y border-border/20">
      <div className="container">
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
          {badges.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex items-center gap-1.5 shrink-0"
            >
              <span className="text-primary/60">{item.icon}</span>
              <span className="text-[11px] font-semibold text-foreground/70">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2TrustStrip;
