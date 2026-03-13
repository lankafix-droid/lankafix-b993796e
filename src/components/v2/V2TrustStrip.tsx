import { ShieldCheck, Eye, Award, FileText, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const badges = [
  { icon: <ShieldCheck className="w-4 h-4" />, label: "Verified Technicians" },
  { icon: <Eye className="w-4 h-4" />, label: "Transparent Pricing" },
  { icon: <Award className="w-4 h-4" />, label: "Warranty-Backed Repairs" },
  { icon: <FileText className="w-4 h-4" />, label: "Digital Invoices" },
  { icon: <MapPin className="w-4 h-4" />, label: "Colombo Service Coverage" },
];

const V2TrustStrip = () => {
  return (
    <section className="py-8 md:py-10 bg-secondary/30 border-t border-border/30">
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {badges.map((item, i) => (
            <motion.span
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
            >
              <span className="text-primary">{item.icon}</span>
              {item.label}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2TrustStrip;
