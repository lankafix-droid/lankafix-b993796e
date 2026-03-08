import { MousePointerClick, UserCheck, ShieldCheck, FileCheck } from "lucide-react";

const steps = [
  { icon: <MousePointerClick className="w-6 h-6" />, title: "Select Service", desc: "Pick your service or describe the problem", color: "from-primary to-primary/80" },
  { icon: <UserCheck className="w-6 h-6" />, title: "Get Verified Technician", desc: "Best-matched, verified tech dispatched to you", color: "from-success to-success/80" },
  { icon: <FileCheck className="w-6 h-6" />, title: "Approve & Track Job", desc: "Approve the quote, track progress in real-time", color: "from-warning to-warning/80" },
  { icon: <ShieldCheck className="w-6 h-6" />, title: "Pay After Completion", desc: "Pay only after the job is done to your satisfaction", color: "from-accent to-accent/80" },
];

const V2HowItWorks = () => {
  return (
    <section className="py-12 md:py-16 bg-card">
      <div className="container">
        <h2 className="text-lg md:text-xl font-bold text-foreground text-center mb-1">
          How LankaFix Works
        </h2>
        <p className="text-xs text-muted-foreground text-center mb-10 max-w-sm mx-auto">
          Simple, transparent, trusted — 4 easy steps
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-center space-y-3 group">
              <div className="relative inline-block">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} text-primary-foreground mx-auto flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                  {step.icon}
                </div>
                <span className="absolute -top-1.5 -right-1.5 text-[10px] font-bold bg-card text-primary border-2 border-primary/20 w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {i + 1}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-xs">{step.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2HowItWorks;
