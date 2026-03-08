import { Link } from "react-router-dom";
import { Wrench, PlusCircle, Sparkles, ClipboardList, HelpCircle } from "lucide-react";
import { track } from "@/lib/analytics";

const INTENTS = [
  {
    icon: <Wrench className="w-6 h-6" />,
    label: "Repair",
    description: "Fix broken devices",
    bgClass: "bg-destructive/10",
    iconColor: "text-destructive",
    link: "/#categories",
  },
  {
    icon: <PlusCircle className="w-6 h-6" />,
    label: "Install",
    description: "Setup new systems",
    bgClass: "bg-primary/10",
    iconColor: "text-primary",
    link: "/book/CCTV",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    label: "Service",
    description: "Maintenance & cleaning",
    bgClass: "bg-success/10",
    iconColor: "text-success",
    link: "/book/AC",
  },
  {
    icon: <ClipboardList className="w-6 h-6" />,
    label: "Inspect",
    description: "Expert assessment",
    bgClass: "bg-warning/10",
    iconColor: "text-warning",
    link: "/book/SOLAR",
  },
  {
    icon: <HelpCircle className="w-6 h-6" />,
    label: "Not Sure",
    description: "We'll help diagnose",
    bgClass: "bg-accent/10",
    iconColor: "text-accent",
    link: "/#diagnose",
  },
];

const V2IntentLayer = () => {
  return (
    <section className="py-8 md:py-10">
      <div className="container">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">What do you need?</h2>
        <p className="text-xs text-muted-foreground mb-5">Choose your intent — we'll guide you to the right service</p>

        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide md:mx-0 md:px-0 md:grid md:grid-cols-5">
          {INTENTS.map((intent) => (
            <Link
              key={intent.label}
              to={intent.link}
              onClick={() => track("v2_intent_click", { intent: intent.label })}
              className="flex-shrink-0 w-[130px] md:w-auto group bg-card border rounded-2xl p-5 hover:shadow-card-hover hover:border-primary/20 transition-all duration-200 text-center flex flex-col items-center gap-3 active:scale-[0.97]"
            >
              <div className={`w-14 h-14 rounded-2xl ${intent.bgClass} ${intent.iconColor} flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                {intent.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">{intent.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{intent.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2IntentLayer;
