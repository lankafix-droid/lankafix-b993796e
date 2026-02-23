import { ClipboardList, MessageSquareText, Calculator, ShieldCheck } from "lucide-react";

const steps = [
  { icon: <ClipboardList className="w-6 h-6" />, title: "Select Service", desc: "Choose category & service type" },
  { icon: <MessageSquareText className="w-6 h-6" />, title: "Answer Smart Questions", desc: "Help us understand your job" },
  { icon: <Calculator className="w-6 h-6" />, title: "Get Estimate / Quote", desc: "Transparent pricing upfront" },
  { icon: <ShieldCheck className="w-6 h-6" />, title: "Verified Completion", desc: "OTP-confirmed + warranty" },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
          How LankaFix Works
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                {step.icon}
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center">{i + 1}</span>
                <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
