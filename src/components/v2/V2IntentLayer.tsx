import { Link } from "react-router-dom";
import { Wrench, PlusCircle, Sparkles, ClipboardList, HelpCircle } from "lucide-react";
import { track } from "@/lib/analytics";

const INTENTS = [
  {
    icon: <Wrench className="w-6 h-6" />,
    label: "Repair Something",
    description: "Fix what's broken",
    color: "from-destructive/15 to-destructive/5 border-destructive/20",
    iconColor: "text-destructive",
    link: "/categories?intent=repair",
  },
  {
    icon: <PlusCircle className="w-6 h-6" />,
    label: "Install Something",
    description: "New setup or upgrade",
    color: "from-primary/15 to-primary/5 border-primary/20",
    iconColor: "text-primary",
    link: "/categories?intent=install",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    label: "Service / Clean",
    description: "Maintenance & cleaning",
    color: "from-lankafix-green/15 to-lankafix-green/5 border-lankafix-green/20",
    iconColor: "text-lankafix-green",
    link: "/categories?intent=service",
  },
  {
    icon: <ClipboardList className="w-6 h-6" />,
    label: "Inspection / Quote",
    description: "Get expert assessment",
    color: "from-warning/15 to-warning/5 border-warning/20",
    iconColor: "text-warning",
    link: "/categories?intent=inspection",
  },
  {
    icon: <HelpCircle className="w-6 h-6" />,
    label: "Not Sure",
    description: "Let us help you decide",
    color: "from-accent/15 to-accent/5 border-accent/20",
    iconColor: "text-accent",
    link: "/diagnose",
  },
];

const V2IntentLayer = () => {
  return (
    <section className="py-8 md:py-10">
      <div className="container">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">What do you need?</h2>
        <p className="text-xs text-muted-foreground mb-5">Choose your intent — we'll guide you to the right service.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {INTENTS.map((intent) => (
            <Link
              key={intent.label}
              to={intent.link}
              onClick={() => track("v2_intent_click", { intent: intent.label })}
              className={`group bg-gradient-to-br ${intent.color} border rounded-2xl p-4 md:p-5 hover:shadow-md transition-all duration-300 hover:scale-[1.02] text-center flex flex-col items-center gap-2.5`}
            >
              <div className={`${intent.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                {intent.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">{intent.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{intent.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2IntentLayer;
