import { ClipboardList, MessageSquareText, ShieldCheck } from "lucide-react";

const steps = [
  { icon: <ClipboardList className="w-6 h-6" />, title: "Select Your Service", desc: "Choose category & describe the issue", color: "from-primary to-primary/80" },
  { icon: <MessageSquareText className="w-6 h-6" />, title: "Describe & Schedule", desc: "Add details, pick date & time", color: "from-accent to-accent/80" },
  { icon: <ShieldCheck className="w-6 h-6" />, title: "Verified Technician Arrives", desc: "OTP-protected, warranty-backed service", color: "from-lankafix-green to-lankafix-green/80" },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-3">
          How LankaFix Works
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-12 max-w-md mx-auto">
          Simple, transparent, and trustworthy — every step of the way
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
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
