import { ShieldCheck, Eye, Award, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const reasons = [
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Verified Professionals",
    desc: "Every technician is background-checked, skill-tested, and rated by real customers.",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Transparent Pricing",
    desc: "See price ranges upfront. Approve every charge before work begins. No hidden fees.",
  },
  {
    icon: <Award className="w-5 h-5" />,
    title: "Warranty on Every Job",
    desc: "Parts and labour guaranteed. If something isn't right, we make it right — free.",
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    title: "Pay After Completion",
    desc: "No advance payment for most services. Pay cash or online only after the job is done.",
  },
];

const V2WhyLankaFix = () => {
  return (
    <section className="py-14 md:py-18">
      <div className="container max-w-3xl">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-1.5">
            Why LankaFix?
          </h2>
          <p className="text-sm text-muted-foreground">
            Safer and more organized than finding technicians on your own
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              className="bg-card rounded-2xl border border-border/40 p-5"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center mb-3">
                {reason.icon}
              </div>
              <h3 className="font-heading font-bold text-sm text-foreground mb-1">{reason.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{reason.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2WhyLankaFix;
