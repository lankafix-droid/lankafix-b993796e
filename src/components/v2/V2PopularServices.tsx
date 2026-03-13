import { Link } from "react-router-dom";
import { Snowflake, Smartphone, Monitor, Camera, Sun, Home, Tv, ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { track } from "@/lib/analytics";

const POPULAR = [
  { icon: <Snowflake className="w-5 h-5" />, label: "AC Gas Top-Up", price: "From Rs 4,500", link: "/book/AC", gradient: "from-primary/15 to-primary/5", color: "text-primary" },
  { icon: <Smartphone className="w-5 h-5" />, label: "Phone Screen Fix", price: "From Rs 5,000", link: "/book/MOBILE", gradient: "from-destructive/15 to-destructive/5", color: "text-destructive" },
  { icon: <Monitor className="w-5 h-5" />, label: "Laptop Repair", price: "From Rs 3,000", link: "/book/IT", gradient: "from-accent/15 to-accent/5", color: "text-accent" },
  { icon: <Camera className="w-5 h-5" />, label: "CCTV Install", price: "Site visit first", link: "/book/CCTV", gradient: "from-warning/15 to-warning/5", color: "text-warning" },
  { icon: <Sun className="w-5 h-5" />, label: "Solar Panel Service", price: "Free inspection", link: "/book/SOLAR", gradient: "from-success/15 to-success/5", color: "text-success" },
  { icon: <Home className="w-5 h-5" />, label: "Smart Home Setup", price: "Project quote", link: "/book/SMART_HOME_OFFICE", gradient: "from-primary/15 to-primary/5", color: "text-primary" },
];

const V2PopularServices = () => {
  return (
    <section className="py-10 md:py-12">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
          className="mb-5"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-warning/15 to-warning/5 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-warning" />
            </div>
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">Popular Services</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-[46px]">Most booked services across Greater Colombo</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {POPULAR.map((service, i) => (
            <motion.div
              key={service.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
            >
              <Link
                to={service.link}
                onClick={() => track("v2_popular_click", { label: service.label })}
                className="group block bg-card rounded-2xl border border-border/40 p-4 hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 active:scale-[0.97]"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${service.gradient} ${service.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  {service.icon}
                </div>
                <p className="text-sm font-bold text-foreground font-heading leading-tight mb-1">{service.label}</p>
                <p className="text-[10px] font-semibold text-gradient bg-gradient-brand bg-clip-text text-transparent mb-2">{service.price}</p>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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
