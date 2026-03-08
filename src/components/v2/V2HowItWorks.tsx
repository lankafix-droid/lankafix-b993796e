import { MousePointerClick, UserCheck, ShieldCheck, FileCheck } from "lucide-react";

const steps = [
  { icon: <MousePointerClick className="w-5 h-5" />, title: "Diagnose Problem", desc: "Describe your issue or pick a service", num: "1" },
  { icon: <FileCheck className="w-5 h-5" />, title: "See Price Range", desc: "Get transparent pricing before you commit", num: "2" },
  { icon: <UserCheck className="w-5 h-5" />, title: "Confirm Booking", desc: "Verified technician matched to your job", num: "3" },
  { icon: <ShieldCheck className="w-5 h-5" />, title: "Technician Assigned", desc: "Track arrival, approve quote, pay after completion", num: "4" },
];

const V2HowItWorks = () => {
  return (
    <section className="py-14 md:py-18 bg-card">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">How LankaFix Works</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Simple, transparent, trusted — 4 easy steps
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-center space-y-3 group">
              <div className="relative inline-block">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  {step.icon}
                </div>
                <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {step.num}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{step.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reassurance */}
        <p className="text-center text-xs text-muted-foreground mt-10 max-w-sm mx-auto">
          Don't worry if you're unsure — LankaFix will help confirm the issue. No work starts without your approval.
        </p>
      </div>
    </section>
  );
};

export default V2HowItWorks;
