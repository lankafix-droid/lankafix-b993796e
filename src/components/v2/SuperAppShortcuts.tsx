import { Link } from "react-router-dom";
import { Smartphone, Shield, Package, History, ChevronRight } from "lucide-react";
import { useDevicePassportsDB } from "@/hooks/useDevicePassportsDB";
import { useSubscriptionStore } from "@/store/subscriptionStore";

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
    },
    {
      icon: Shield,
      label: "Care Plans",
      sublabel: activeSubs.length > 0 ? `${activeSubs.length} active` : "Protect devices",
      to: "/care",
    },
    {
      icon: Package,
      label: "Supplies",
      sublabel: "Parts & accessories",
      to: "/supplies",
    },
    {
      icon: History,
      label: "Service History",
      sublabel: "Past repairs",
      to: "/devices",
    },
  ];

  return (
    <section className="py-6">
      <div className="container max-w-3xl">
        <h2 className="text-lg font-semibold text-foreground mb-4">Manage Your Home</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {shortcuts.map(({ icon: Icon, label, sublabel, to }) => (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors text-center"
            >
              <Icon className="w-6 h-6 text-primary" />
              <div>
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="text-[10px] text-muted-foreground">{sublabel}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuperAppShortcuts;
