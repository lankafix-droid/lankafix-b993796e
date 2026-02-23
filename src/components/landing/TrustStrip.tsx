import { ShieldCheck, Eye, MapPin, Award } from "lucide-react";

const items = [
  { icon: <ShieldCheck className="w-5 h-5" />, label: "Verified Technicians" },
  { icon: <Eye className="w-5 h-5" />, label: "Transparent Pricing" },
  { icon: <MapPin className="w-5 h-5" />, label: "Digital Job Tracking" },
  { icon: <Award className="w-5 h-5" />, label: "Warranty-backed Repairs" },
];

const TrustStrip = () => {
  return (
    <section className="py-12 border-y bg-muted/50">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
