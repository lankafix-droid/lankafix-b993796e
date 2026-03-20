import { Link } from "react-router-dom";
import { Printer, ArrowRight, BadgeCheck, Headphones, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const highlights = [
  { icon: BadgeCheck, text: "SmartFix Certified" },
  { icon: TrendingUp, text: "From Rs 1,490/mo" },
  { icon: Headphones, text: "Support Included" },
];

const SPSPromoBanner = () => {
  return (
    <section className="py-4">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            to="/sps"
            className="group block rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-chart-1/6 overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:border-primary/35 active:scale-[0.98]"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/12 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Printer className="w-6 h-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">New</span>
                  </div>
                  <h3 className="font-heading text-base font-bold text-foreground leading-snug mb-1">
                    Smart Print Subscription
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Get a certified printer with support, maintenance & consumables — all in one monthly plan.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-4">
                    {highlights.map(({ icon: Icon, text }) => (
                      <span key={text} className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground/80">
                        <Icon className="w-3 h-3 text-primary/70" />
                        {text}
                      </span>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2.5 transition-all duration-300">
                    Explore Plans <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default SPSPromoBanner;
