import { Link } from "react-router-dom";
import { Smartphone, Shield, Package, History } from "lucide-react";
import { useDevicePassportsDB } from "@/hooks/useDevicePassportsDB";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { motion } from "framer-motion";

const SuperAppShortcuts = () => {
  const { passports } = useDevicePassportsDB();
  const { subscriptions } = useSubscriptionStore();
  const activeSubs = subscriptions.filter((s) => s.status === "active");

  const shortcuts = [
    {
      icon: Smartphone,
      label: "My Devices",
      sublabel: passports.length > 0 ? `${passports.length} registered` : "Add devices",
      to: "/home-health",
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
      label: "Service History",
      sublabel: "Past repairs",
      to: "/devices",
      gradient: "from-accent/15 to-accent/5",
      iconColor: "text-accent",
    },
  ];

  return (
    <section className="py-8">
      <div className="container">
        <motion.h2
          className="font-heading text-lg md:text-xl font-bold text-foreground mb-4"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          Manage Your Home
        </motion.h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {shortcuts.map(({ icon: Icon, label, sublabel, to, gradient, iconColor }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
            >
              <Link
                to={to}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-card-hover transition-all duration-300 text-center active:scale-[0.97]"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} ${iconColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground font-heading">{label}</div>
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
