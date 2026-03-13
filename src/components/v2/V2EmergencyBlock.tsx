/** ARCHIVED — removed during homepage optimization. Emergency CTA consolidated into Hero section. */
import { Link } from "react-router-dom";
import { Zap, Snowflake, ArrowRight, Clock, Smartphone, Laptop } from "lucide-react";
import { motion } from "framer-motion";
import { track } from "@/lib/analytics";

// Only show emergency services for operational categories
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
    icon: <Smartphone className="w-5 h-5" />,
    label: "Urgent Phone Repair",
    desc: "Cracked screen or water damage? Get same-day repair.",
    eta: "Same day",
    link: "/book/MOBILE",
    category: "MOBILE",
  },
  {
    icon: <Laptop className="w-5 h-5" />,
    label: "Urgent IT Support",
    desc: "System down or data at risk? Quick remote or on-site help.",
    eta: "Under 2 hours",
    link: "/book/IT",
    category: "IT",
  },
];

const V2EmergencyBlock = () => {
  return (
    <section className="py-10 md:py-12">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-destructive" />
            </div>
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">Need Urgent Help?</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-[46px]">Fast response for critical issues · Priority technician allocation</p>
        </motion.div>

        <div className="grid gap-3.5 md:grid-cols-3">
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
                className="group block bg-card rounded-2xl border border-destructive/12 overflow-hidden hover:border-destructive/25 hover:shadow-card-hover transition-all duration-300 active:scale-[0.98]"
              >
                <div className="h-1.5 bg-gradient-to-r from-destructive via-destructive/80 to-destructive/40" />

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-destructive/8 text-destructive flex items-center justify-center shrink-0 group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors duration-300">
                      {service.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-sm text-foreground mb-1.5">{service.label}</h3>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-3.5">{service.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-destructive">
                          <Clock className="w-3 h-3" />
                          {service.eta}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-destructive/8 flex items-center justify-center group-hover:bg-destructive group-hover:text-destructive-foreground text-destructive transition-colors duration-300">
                          <ArrowRight className="w-4 h-4" />
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
