import { Link } from "react-router-dom";
import { Snowflake, Smartphone, Monitor, Tv, ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { track } from "@/lib/analytics";

const POPULAR = [
  { icon: <Snowflake className="w-5 h-5" />, label: "AC Repair & Service", price: "From Rs 2,500", duration: "60–90 min", link: "/book/AC" },
  { icon: <Smartphone className="w-5 h-5" />, label: "Phone Screen Repair", price: "From Rs 3,000", duration: "45–90 min", link: "/book/MOBILE" },
  { icon: <Monitor className="w-5 h-5" />, label: "Laptop & IT Support", price: "From Rs 2,000", duration: "60–120 min", link: "/book/IT" },
  { icon: <Tv className="w-5 h-5" />, label: "Electronics Repair", price: "Diagnosis first", duration: "60–120 min", link: "/book/CONSUMER_ELEC" },
];

const V2PopularServices = () => {
  return (
    <section className="py-8 md:py-10">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35 }}
          className="mb-5"
        >
          <h2 className="font-heading text-base md:text-lg font-bold text-foreground">Most Booked</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Top services across Greater Colombo</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {POPULAR.map((service, i) => (
            <motion.div
              key={service.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <Link
                to={service.link}
                onClick={() => track("homepage_popular_click", { label: service.label })}
                className="group block bg-card rounded-2xl border border-border/40 p-4 hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 active:scale-[0.97]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors duration-300">
                  {service.icon}
                </div>
                <p className="text-sm font-bold text-foreground font-heading leading-tight mb-1">{service.label}</p>
                <p className="text-[11px] font-semibold text-primary/80 mb-1">{service.price}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                  <Clock className="w-3 h-3" />{service.duration}
                </span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Book now <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2PopularServices;
