/** ARCHIVED — removed during homepage optimization. Candidate for reuse on secondary pages. */
import { Link } from "react-router-dom";
import { Snowflake, Wrench, Printer, Camera, Shield, Laptop, ArrowRight, Sparkles, Plus, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useDevicePassportsDB } from "@/hooks/useDevicePassportsDB";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { track } from "@/lib/analytics";

type Priority = "critical" | "recommended" | "helpful";

interface Recommendation {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  link: string;
  gradient: string;
  iconColor: string;
  priority: Priority;
}

const PRIORITY_LABELS: Record<Priority, { label: string; className: string } | null> = {
  critical: { label: "Priority", className: "bg-destructive/10 text-destructive border border-destructive/15" },
  recommended: { label: "Recommended", className: "bg-warning/10 text-warning border border-warning/15" },
  helpful: null,
};

const V2SmartRecommendations = () => {
  const { passports } = useDevicePassportsDB();
  const { subscriptions } = useSubscriptionStore();

  const recommendations: Recommendation[] = [];

  // Device data
  const acDevices = passports.filter(p => p.deviceCategory === "AC");
  const laptopDevices = passports.filter(p => p.deviceCategory === "IT");
  const cctvDevices = passports.filter(p => p.deviceCategory === "CCTV");
  const printerDevices = passports.filter(p => p.deviceCategory === "COPIER");

  // 1. Critical / overdue — low health AC
  if (acDevices.length > 0) {
    const ac = acDevices[0];
    if (ac.healthScore < 60) {
      recommendations.push({
        id: "ac-critical",
        icon: <AlertTriangle className="w-5 h-5" />,
        title: `Your ${ac.deviceNickname || "AC"} needs attention`,
        description: `Health score is ${ac.healthScore}%. Most ACs in Sri Lanka need servicing every 6 months to stay efficient and avoid costly breakdowns.`,
        action: "Schedule Service",
        link: "/book/AC",
        gradient: "from-destructive/15 to-destructive/5",
        iconColor: "text-destructive",
        priority: "critical",
      });
    } else if (ac.healthScore < 80) {
      recommendations.push({
        id: "ac-service",
        icon: <Snowflake className="w-5 h-5" />,
        title: `Your ${ac.deviceNickname || "AC"} may need service`,
        description: `Health score is ${ac.healthScore}%. A routine service can improve cooling efficiency and reduce electricity bills.`,
        action: "Schedule Service",
        link: "/book/AC",
        gradient: "from-primary/15 to-primary/5",
        iconColor: "text-primary",
        priority: "recommended",
      });
    }
  }

  // 2. No care plan for registered devices
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
      priority: "recommended",
    });
  }

  // 3. CCTV inspection
  if (cctvDevices.length > 0) {
    recommendations.push({
      id: "cctv-inspect",
      icon: <Camera className="w-5 h-5" />,
      title: "CCTV inspection recommended",
      description: "Security cameras should be checked regularly to ensure recording and storage work properly. Don't wait for a failure.",
      action: "Book Inspection",
      link: "/book/CCTV",
      gradient: "from-warning/15 to-warning/5",
      iconColor: "text-warning",
      priority: "recommended",
    });
  }

  // 4. Laptop with no service history
  if (laptopDevices.length > 0) {
    const laptop = laptopDevices[0];
    if (laptop.totalServicesPerformed === 0) {
      recommendations.push({
        id: "laptop-health",
        icon: <Laptop className="w-5 h-5" />,
        title: `${laptop.deviceNickname || "Your laptop"} has no care history`,
        description: "Schedule a health check to catch potential issues early — dust, thermal paste, battery health.",
        action: "Book Checkup",
        link: "/book/IT",
        gradient: "from-primary/15 to-primary/5",
        iconColor: "text-primary",
        priority: "recommended",
      });
    }
  }

  // 5. Printer supplies
  if (printerDevices.length > 0) {
    recommendations.push({
      id: "printer-supplies",
      icon: <Printer className="w-5 h-5" />,
      title: "Reorder printer supplies",
      description: "Printers that sit unused often need preventive servicing. Keep yours running with genuine toner and regular maintenance.",
      action: "Buy Supplies",
      link: "/supplies",
      gradient: "from-accent/15 to-accent/5",
      iconColor: "text-accent",
      priority: "helpful",
    });
  }

  // Non-device category recommendations — only operational categories
  const nonDeviceRecs: Recommendation[] = [
    {
      id: "cctv-inspect-general",
      icon: <Camera className="w-5 h-5" />,
      title: "Secure your home or office with CCTV",
      description: "Professional CCTV installation with verified technicians. Site inspection included.",
      action: "Book CCTV",
      link: "/book/CCTV",
      gradient: "from-warning/15 to-warning/5",
      iconColor: "text-warning",
      priority: "helpful",
    },
    {
      id: "mobile-repair",
      icon: <Wrench className="w-5 h-5" />,
      title: "Phone issues? Get same-day repair",
      description: "Screen replacement, battery swap, or software fix. Verified mobile repair technicians.",
      action: "Book Repair",
      link: "/book/MOBILE",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary",
      priority: "helpful",
    },
    {
      id: "it-support-general",
      icon: <Laptop className="w-5 h-5" />,
      title: "Computer running slow?",
      description: "Virus removal, OS reinstall, or hardware upgrade. On-site or remote IT support.",
      action: "Get Help",
      link: "/book/IT",
      gradient: "from-accent/15 to-accent/5",
      iconColor: "text-accent",
      priority: "helpful",
    },
  ];

  // Default recommendations for new users (no devices)
  if (recommendations.length === 0) {
    recommendations.push({
      id: "add-device",
      icon: <Plus className="w-5 h-5" />,
      title: "Register your first device",
      description: "Add your AC, laptop, or phone to get service reminders and track maintenance history.",
      action: "Add Device",
      link: "/home-health",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary",
      priority: "recommended",
    });
    recommendations.push({
      id: "ac-service-general",
      icon: <Snowflake className="w-5 h-5" />,
      title: "Is your AC running efficiently?",
      description: "Most ACs in Sri Lanka need servicing every 6 months. Don't wait for a breakdown.",
      action: "Schedule Service",
      link: "/book/AC",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary",
      priority: "helpful",
    });
  }

  // Fill remaining slots with non-device recs
  const neededHelpful = 3 - recommendations.length;
  if (neededHelpful > 0) {
    const usedIds = new Set(recommendations.map(r => r.id));
    const available = nonDeviceRecs.filter(r => !usedIds.has(r.id));
    recommendations.push(...available.slice(0, neededHelpful));
  }

  // Sort by priority
  const priorityOrder: Record<Priority, number> = { critical: 0, recommended: 1, helpful: 2 };
  const sorted = [...recommendations].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const displayRecs = sorted.slice(0, 3);

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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-accent" />
            </div>
            <div>
              <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">Smart Recommendations</h2>
            </div>
          </div>
          <p className="text-xs text-muted-foreground ml-[46px]">Personalized suggestions based on your devices and service history</p>
        </motion.div>

        <div className="space-y-3.5">
          {displayRecs.map((rec, i) => {
            const priorityLabel = PRIORITY_LABELS[rec.priority];
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
              >
                <Link
                  to={rec.link}
                  onClick={() => track("v2_smart_rec_click", { recommendation: rec.id, priority: rec.priority })}
                  className="group flex items-start gap-4 bg-card rounded-2xl border border-border/50 p-5 hover:border-primary/25 hover:shadow-card-hover transition-all duration-300 active:scale-[0.99]"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rec.gradient} ${rec.iconColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    {rec.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-heading font-bold text-sm text-foreground leading-snug">{rec.title}</h3>
                      {priorityLabel && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${priorityLabel.className}`}>
                          {priorityLabel.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{rec.description}</p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:gap-2.5 transition-all">
                      {rec.action}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default V2SmartRecommendations;
