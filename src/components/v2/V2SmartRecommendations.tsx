import { Link } from "react-router-dom";
import { Snowflake, Wrench, Printer, Camera, Shield, Laptop, Router, ArrowRight, Sparkles, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useDevicePassportsDB } from "@/hooks/useDevicePassportsDB";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { track } from "@/lib/analytics";

interface Recommendation {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  link: string;
  gradient: string;
  iconColor: string;
}

const V2SmartRecommendations = () => {
  const { passports } = useDevicePassportsDB();
  const { subscriptions } = useSubscriptionStore();

  // Build personalized recommendations based on user data
  const recommendations: Recommendation[] = [];

  // Check device-specific recommendations
  const acDevices = passports.filter(p => p.deviceCategory === "AC");
  const laptopDevices = passports.filter(p => p.deviceCategory === "IT");
  const cctvDevices = passports.filter(p => p.deviceCategory === "CCTV");
  const printerDevices = passports.filter(p => p.deviceCategory === "COPIER");

  if (acDevices.length > 0) {
    const ac = acDevices[0];
    if (ac.healthScore < 80) {
      recommendations.push({
        id: "ac-service",
        icon: <Snowflake className="w-5 h-5" />,
        title: `Your ${ac.deviceNickname || "AC"} may need service`,
        description: `Health score is ${ac.healthScore}%. A routine service can improve cooling and efficiency.`,
        action: "Schedule Service",
        link: "/book/AC",
        gradient: "from-primary/15 to-primary/5",
        iconColor: "text-primary",
      });
    }
  }

  if (cctvDevices.length > 0) {
    recommendations.push({
      id: "cctv-inspect",
      icon: <Camera className="w-5 h-5" />,
      title: "CCTV inspection recommended",
      description: "Regular checks ensure all cameras are recording properly and storage is healthy.",
      action: "Book Inspection",
      link: "/book/CCTV",
      gradient: "from-warning/15 to-warning/5",
      iconColor: "text-warning",
    });
  }

  if (printerDevices.length > 0) {
    recommendations.push({
      id: "printer-supplies",
      icon: <Printer className="w-5 h-5" />,
      title: "Reorder printer supplies",
      description: "Keep your printer running smoothly with genuine toner and cartridges.",
      action: "Buy Supplies",
      link: "/supplies",
      gradient: "from-accent/15 to-accent/5",
      iconColor: "text-accent",
    });
  }

  // Check subscription/care plan recommendations
  const activeSubs = subscriptions.filter(s => s.status === "active");
  if (passports.length > 0 && activeSubs.length === 0) {
    recommendations.push({
      id: "care-plan",
      icon: <Shield className="w-5 h-5" />,
      title: "Protect your devices with a Care Plan",
      description: "Priority service, extended warranty, and discounted rates for all registered devices.",
      action: "View Plans",
      link: "/care",
      gradient: "from-success/15 to-success/5",
      iconColor: "text-success",
    });
  }

  if (laptopDevices.length > 0) {
    const laptop = laptopDevices[0];
    if (laptop.totalServicesPerformed === 0) {
      recommendations.push({
        id: "laptop-health",
        icon: <Laptop className="w-5 h-5" />,
        title: `${laptop.deviceNickname || "Your laptop"} has no care history`,
        description: "Schedule a health check to catch potential issues early.",
        action: "Book Checkup",
        link: "/book/IT",
        gradient: "from-primary/15 to-primary/5",
        iconColor: "text-primary",
      });
    }
  }

  // Default recommendations if user has no devices
  if (recommendations.length === 0) {
    recommendations.push(
      {
        id: "add-device",
        icon: <Plus className="w-5 h-5" />,
        title: "Register your first device",
        description: "Add your AC, laptop, or phone to get service reminders and track maintenance history.",
        action: "Add Device",
        link: "/home-health",
        gradient: "from-primary/15 to-primary/5",
        iconColor: "text-primary",
      },
      {
        id: "ac-service-general",
        icon: <Snowflake className="w-5 h-5" />,
        title: "Is your AC running efficiently?",
        description: "Most ACs in Sri Lanka need servicing every 6 months. Don't wait for a breakdown.",
        action: "Schedule Service",
        link: "/book/AC",
        gradient: "from-primary/15 to-primary/5",
        iconColor: "text-primary",
      },
      {
        id: "wifi-check",
        icon: <Router className="w-5 h-5" />,
        title: "WiFi running slow?",
        description: "A network audit can boost speed and fix dead zones in your home or office.",
        action: "Get Help",
        link: "/book/NETWORK",
        gradient: "from-accent/15 to-accent/5",
        iconColor: "text-accent",
      },
    );
  }

  // Limit to 3 recommendations
  const displayRecs = recommendations.slice(0, 3);

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">Smart Recommendations</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-10">Personalized suggestions based on your devices and service history</p>
        </motion.div>

        <div className="space-y-3">
          {displayRecs.map((rec, i) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
            >
              <Link
                to={rec.link}
                onClick={() => track("v2_smart_rec_click", { recommendation: rec.id })}
                className="group flex items-start gap-4 bg-card rounded-2xl border border-border/60 p-5 hover:border-primary/30 hover:shadow-card-hover transition-all duration-300 active:scale-[0.99]"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${rec.gradient} ${rec.iconColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  {rec.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-sm text-foreground mb-0.5">{rec.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">{rec.description}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                    {rec.action}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2SmartRecommendations;
