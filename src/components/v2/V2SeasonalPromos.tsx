/** ARCHIVED — removed during homepage optimization. Candidate for reuse on promotions page. */
import { Link } from "react-router-dom";
import { Droplets, Sun, Sparkles, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { track } from "@/lib/analytics";

const now = new Date();
const month = now.getMonth(); // 0-indexed

// Seasonal promotions relevant to Sri Lankan calendar & climate
const ALL_PROMOS = [
  {
    id: "monsoon-prep",
    icon: <Droplets className="w-5 h-5" />,
    title: "Monsoon Prep Sale",
    description: "Get your home ready before the rains — electrical safety checks, plumbing inspections, and roof leak prevention.",
    cta: "Book Monsoon Check",
    link: "/book/PLUMBING",
    gradient: "from-primary to-primary/80",
    months: [4, 5, 9, 10], // May, Jun, Oct, Nov
  },
  {
    id: "new-year-offer",
    icon: <Sparkles className="w-5 h-5" />,
    title: "Avurudu Home Refresh",
    description: "Start the Sinhala & Tamil New Year with a fully serviced home. AC, electrical, and deep clean bundles at special rates.",
    cta: "View Offers",
    link: "/book/AC",
    gradient: "from-warning to-accent",
    months: [2, 3], // Mar, Apr
  },
  {
    id: "summer-ac",
    icon: <Sun className="w-5 h-5" />,
    title: "Beat the Heat — AC Service",
    description: "Peak season for AC breakdowns. Book a preventive service now and avoid the queue.",
    cta: "Service My AC",
    link: "/book/AC",
    gradient: "from-destructive to-warning",
    months: [1, 2, 6, 7], // Feb, Mar, Jul, Aug
  },
  {
    id: "back-to-school",
    icon: <Zap className="w-5 h-5" />,
    title: "Back to School IT Check",
    description: "Laptops, printers, and WiFi ready for the new term. Quick diagnostics and repairs available.",
    cta: "Book IT Checkup",
    link: "/book/IT",
    gradient: "from-primary to-accent",
    months: [0, 8], // Jan, Sep
  },
];

// Show promos matching current month, fallback to first two
const getActivePromos = () => {
  const seasonal = ALL_PROMOS.filter(p => p.months.includes(month));
  if (seasonal.length >= 2) return seasonal.slice(0, 2);
  if (seasonal.length === 1) {
    const fallback = ALL_PROMOS.find(p => !p.months.includes(month));
    return fallback ? [seasonal[0], fallback] : seasonal;
  }
  return ALL_PROMOS.slice(0, 2);
};

const V2SeasonalPromos = () => {
  const promos = getActivePromos();

  return (
    <section className="py-8">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
          className="mb-4"
        >
          <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">Seasonal Offers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Limited-time deals for Sri Lankan homes and businesses</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promos.map((promo, i) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Link
                to={promo.link}
                onClick={() => track("v2_seasonal_promo_click", { promo: promo.id })}
                className="group block rounded-2xl overflow-hidden border border-border/60 hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 active:scale-[0.99]"
              >
                <div className={`bg-gradient-to-r ${promo.gradient} p-5 md:p-6`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground shrink-0">
                      {promo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-primary-foreground text-sm md:text-base mb-1 drop-shadow-sm">
                        {promo.title}
                      </h3>
                      <p className="text-[11px] md:text-xs text-primary-foreground/80 leading-relaxed mb-3">
                        {promo.description}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-foreground bg-primary-foreground/15 backdrop-blur-sm rounded-full px-4 py-2 group-hover:bg-primary-foreground/25 transition-colors">
                        {promo.cta}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
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

export default V2SeasonalPromos;
