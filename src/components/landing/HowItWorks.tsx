import { ClipboardList, MessageSquareText, Calculator, ShieldCheck } from "lucide-react";

const steps = [
  { icon: <ClipboardList className="w-6 h-6" />, title: "Select Service", desc: "Choose category & service type", color: "from-primary to-primary/80" },
  { icon: <MessageSquareText className="w-6 h-6" />, title: "Smart Diagnosis", desc: "Answer questions or talk to FixBuddy", color: "from-accent to-accent/80" },
  { icon: <Calculator className="w-6 h-6" />, title: "Get Estimate", desc: "Transparent pricing upfront", color: "from-lankafix-green to-lankafix-green/80" },
  { icon: <ShieldCheck className="w-6 h-6" />, title: "Verified Completion", desc: "OTP-confirmed + warranty", color: "from-primary to-accent" },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-3">
          How LankaFix Works
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-12 max-w-md mx-auto">
          Simple, transparent, and trustworthy — every step of the way
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center space-y-4 group">
              <div className="relative">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} text-primary-foreground mx-auto flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 text-xs font-bold bg-card text-primary border-2 border-primary/20 w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                  {i + 1}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
