import { Search, FileCheck, UserCheck, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  { icon: <Search className="w-5 h-5" />, title: "Describe Your Issue", desc: "Tell us what's wrong or pick a service category" },
  { icon: <FileCheck className="w-5 h-5" />, title: "See Pricing", desc: "Get a transparent price range before you commit" },
  { icon: <UserCheck className="w-5 h-5" />, title: "Get Matched", desc: "A verified technician is assigned to your job" },
  { icon: <ShieldCheck className="w-5 h-5" />, title: "Approve & Pay", desc: "Approve the final quote. Pay only after completion" },
];

const V2HowItWorks = () => {
  return (
    <section className="py-14 md:py-20 bg-card border-t border-border/20">
      <div className="container max-w-2xl">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-1.5">How It Works</h2>
          <p className="text-sm text-muted-foreground">Four steps. No surprises.</p>
        </motion.div>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-4 relative"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[23px] top-[48px] w-px h-[calc(100%-16px)] bg-border/50" />
              )}
              
              <div className="relative z-10 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-primary/8 text-primary flex items-center justify-center">
                  {step.icon}
                </div>
                <span className="absolute -top-1 -right-1 text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center bg-primary text-primary-foreground font-heading">
                  {i + 1}
                </span>
              </div>

              <div className="pb-8">
                <h3 className="font-heading font-bold text-sm text-foreground mb-0.5">{step.title}</h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-center text-xs text-muted-foreground/70 mt-4 max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          Not sure what's wrong? No worries — we'll help you figure it out. No work starts without your approval.
        </motion.p>
      </div>
    </section>
  );
};

export default V2HowItWorks;
