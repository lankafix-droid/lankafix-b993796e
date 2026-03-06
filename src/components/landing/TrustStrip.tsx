import { ShieldCheck, Eye, Award, KeyRound, Star, Users, Wrench } from "lucide-react";

const badges = [
  { icon: <ShieldCheck className="w-5 h-5" />, label: "Verified Technicians", desc: "Background checked & certified" },
  { icon: <Eye className="w-5 h-5" />, label: "Transparent Pricing", desc: "No hidden fees, ever" },
  { icon: <KeyRound className="w-5 h-5" />, label: "OTP Protected", desc: "Secure service verification" },
  { icon: <Award className="w-5 h-5" />, label: "Warranty-backed", desc: "Every repair guaranteed" },
];

const stats = [
  { icon: <Wrench className="w-5 h-5" />, value: "5,000+", label: "Repairs Completed" },
  { icon: <Users className="w-5 h-5" />, value: "200+", label: "Verified Technicians" },
  { icon: <Star className="w-5 h-5" />, value: "4.7★", label: "Average Rating" },
];

const TrustStrip = () => {
  return (
    <section className="py-14 bg-navy">
      <div className="container space-y-10">
        {/* Trust badges */}
        <div>
          <h2 className="text-center text-lg font-bold text-navy-foreground mb-8">
            Why Sri Lankans Trust LankaFix
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {badges.map((item, i) => (
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

        {/* Social proof stats */}
        <div className="border-t border-navy-foreground/10 pt-8">
          <div className="grid grid-cols-3 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary">{stat.icon}</span>
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-navy-foreground">{stat.value}</p>
                <p className="text-xs text-navy-foreground/60 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
