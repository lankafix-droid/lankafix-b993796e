import { Link } from "react-router-dom";
import { Wrench, PlusCircle, Sparkles, ClipboardList, HelpCircle } from "lucide-react";
import { track } from "@/lib/analytics";
import { motion } from "framer-motion";

const INTENTS = [
  {
    icon: <Wrench className="w-6 h-6" />,
    label: "Repair",
    description: "Fix broken devices",
    gradient: "from-destructive/15 to-destructive/5",
    iconColor: "text-destructive",
    link: "/#categories",
  },
  {
    icon: <PlusCircle className="w-6 h-6" />,
    label: "Install",
    description: "Setup new systems",
    gradient: "from-primary/15 to-primary/5",
    iconColor: "text-primary",
    link: "/book/CCTV",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    label: "Service",
    description: "Maintenance & cleaning",
    gradient: "from-success/15 to-success/5",
    iconColor: "text-success",
    link: "/book/AC",
  },
  {
    icon: <ClipboardList className="w-6 h-6" />,
    label: "Inspect",
    description: "Expert assessment",
    gradient: "from-warning/15 to-warning/5",
    iconColor: "text-warning",
    link: "/book/SOLAR",
  },
  {
    icon: <HelpCircle className="w-6 h-6" />,
    label: "Not Sure",
    description: "We'll help diagnose",
    gradient: "from-accent/15 to-accent/5",
    iconColor: "text-accent",
    link: "/#diagnose",
  },
];

const V2IntentLayer = () => {
  return (
    <section className="py-10 md:py-14">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-1">What do you need?</h2>
          <p className="text-xs text-muted-foreground mb-7">Choose your intent — we'll guide you to the right service</p>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide md:mx-0 md:px-0 md:grid md:grid-cols-5">
          {INTENTS.map((intent, i) => (
            <motion.div
              key={intent.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
            >
              <Link
                to={intent.link}
                onClick={() => track("v2_intent_click", { intent: intent.label })}
                className="flex-shrink-0 w-[120px] md:w-auto group bg-card border border-border/50 rounded-2xl p-4 pb-5 hover:shadow-card-hover hover:border-primary/25 transition-all duration-300 text-center flex flex-col items-center gap-3 active:scale-[0.96]"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${intent.gradient} ${intent.iconColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  {intent.icon}
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-foreground leading-tight">{intent.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{intent.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2IntentLayer;
