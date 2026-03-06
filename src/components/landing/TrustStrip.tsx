import { ShieldCheck, Eye, MapPin, Award, KeyRound } from "lucide-react";

const items = [
  { icon: <ShieldCheck className="w-5 h-5" />, label: "Verified Technicians", desc: "Background checked & certified" },
  { icon: <Eye className="w-5 h-5" />, label: "Transparent Pricing", desc: "No hidden fees, ever" },
  { icon: <KeyRound className="w-5 h-5" />, label: "OTP Protected", desc: "Secure service verification" },
  { icon: <Award className="w-5 h-5" />, label: "Warranty-backed", desc: "Every repair guaranteed" },
];

const TrustStrip = () => {
  return (
    <section className="py-14 bg-navy">
      <div className="container">
        <h2 className="text-center text-lg font-bold text-navy-foreground mb-8">
          Why Sri Lankans Trust LankaFix
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0 shadow-brand">
                <span className="text-primary-foreground">{item.icon}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-navy-foreground">{item.label}</span>
                <p className="text-xs text-navy-foreground/60 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
