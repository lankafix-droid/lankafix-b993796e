/** ARCHIVED — removed during homepage optimization. Candidate for reuse on account dashboard. */
import { Link } from "react-router-dom";
import { Smartphone, Shield, Package, History, HeartPulse } from "lucide-react";
import { useDevicePassportsDB } from "@/hooks/useDevicePassportsDB";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { motion } from "framer-motion";

const SuperAppShortcuts = () => {
  const { passports } = useDevicePassportsDB();
  const { subscriptions } = useSubscriptionStore();
  const activeSubs = subscriptions.filter((s) => s.status === "active");

  const shortcuts = [
    {
      icon: HeartPulse,
      label: "Home Health",
      sublabel: "Device overview",
      to: "/home-health",
      gradient: "from-destructive/15 to-destructive/5",
      iconColor: "text-destructive",
    },
    {
      icon: Smartphone,
      label: "My Devices",
      sublabel: passports.length > 0 ? `${passports.length} registered` : "Add devices",
      to: "/devices",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary",
    },
    {
      icon: Shield,
      label: "Care Plans",
      sublabel: activeSubs.length > 0 ? `${activeSubs.length} active` : "Protect devices",
      to: "/care",
      gradient: "from-success/15 to-success/5",
      iconColor: "text-success",
    },
    {
      icon: Package,
      label: "Supplies",
      sublabel: "Parts & accessories",
      to: "/supplies",
      gradient: "from-warning/15 to-warning/5",
      iconColor: "text-warning",
    },
    {
      icon: History,
      label: "History",
      sublabel: "Past repairs",
      to: "/devices",
      gradient: "from-accent/15 to-accent/5",
      iconColor: "text-accent",
    },
  ];

  return (
    <section className="py-10">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">Manage Your Home</h2>
          <p className="text-xs text-muted-foreground mt-1">Your devices, care plans, and service history — all in one place</p>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide md:mx-0 md:px-0 md:grid md:grid-cols-5">
          {shortcuts.map(({ icon: Icon, label, sublabel, to, gradient, iconColor }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              className="flex-shrink-0 w-[108px] md:w-auto"
            >
              <Link
                to={to}
                className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/25 hover:shadow-card-hover transition-all duration-300 text-center active:scale-[0.96]"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} ${iconColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground font-heading leading-tight">{label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuperAppShortcuts;
