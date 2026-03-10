import { Link } from "react-router-dom";
import { Zap, Snowflake, Droplets, ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { track } from "@/lib/analytics";

const EMERGENCY_SERVICES = [
  {
    icon: <Snowflake className="w-5 h-5" />,
    label: "Emergency AC Repair",
    desc: "AC not working in this heat? Priority technician dispatched fast.",
    eta: "Under 90 min",
    link: "/book/AC",
    category: "AC",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    label: "Emergency Electrical",
    desc: "Power trip, sparking, or electrical failure? Don't wait.",
    eta: "Under 60 min",
    link: "/book/ELECTRICAL",
    category: "ELECTRICAL",
  },
  {
    icon: <Droplets className="w-5 h-5" />,
    label: "Emergency Plumbing",
    desc: "Water leak or burst pipe? Urgent plumber allocation available.",
    eta: "Under 60 min",
    link: "/book/PLUMBING",
    category: "PLUMBING",
  },
];

const V2EmergencyBlock = () => {
  return (
    <section className="py-8 md:py-10">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
          className="mb-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-destructive" />
            </div>
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">Need Urgent Help?</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-10">Fast response for critical issues · Priority technician allocation</p>
        </motion.div>

        <div className="grid gap-3 md:grid-cols-3">
          {EMERGENCY_SERVICES.map((service, i) => (
            <motion.div
              key={service.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <Link
                to={service.link}
                onClick={() => track("v2_emergency_service_click", { category: service.category })}
                className="group block bg-card rounded-2xl border border-destructive/15 overflow-hidden hover:border-destructive/30 hover:shadow-card-hover transition-all duration-300 active:scale-[0.98]"
              >
                {/* Red accent top bar */}
                <div className="h-1 bg-gradient-to-r from-destructive to-destructive/60" />
                
                <div className="p-5">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors duration-300">
                      {service.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-sm text-foreground mb-1">{service.label}</h3>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{service.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
                          <Clock className="w-3 h-3" />
                          {service.eta}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center group-hover:bg-destructive group-hover:text-destructive-foreground text-destructive transition-colors duration-300">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2EmergencyBlock;
