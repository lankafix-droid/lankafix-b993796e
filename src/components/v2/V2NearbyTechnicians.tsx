import { Star, Clock, ShieldCheck, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const TECHNICIANS = [
  { name: "Nimal Perera", specialty: "AC Specialist", rating: 4.8, jobs: 132, eta: "20–30 min", avatar: "NP" },
  { name: "Kamal Silva", specialty: "Mobile Repair", rating: 4.9, jobs: 215, eta: "15–25 min", avatar: "KS" },
  { name: "Ruwan Fernando", specialty: "CCTV & Networking", rating: 4.7, jobs: 98, eta: "25–40 min", avatar: "RF" },
  { name: "Saman Jayawardena", specialty: "Laptop & IT", rating: 4.6, jobs: 176, eta: "30–45 min", avatar: "SJ" },
];

const V2NearbyTechnicians = () => {
  return (
    <section className="py-10 md:py-14 bg-secondary/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-1">Technicians Near You</h2>
          <p className="text-xs text-muted-foreground mb-6">Verified professionals ready to help</p>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide md:mx-0 md:px-0 md:grid md:grid-cols-4">
          {TECHNICIANS.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
              className="flex-shrink-0 w-[200px] md:w-auto bg-card rounded-2xl border border-border/60 p-5 space-y-3 hover:shadow-card-hover hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-brand text-primary-foreground flex items-center justify-center text-sm font-bold font-heading shrink-0">
                  {tech.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-foreground truncate font-heading">{tech.name}</p>
                    <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{tech.specialty}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="font-bold text-foreground">{tech.rating}</span>
                </span>
                <span className="font-medium">{tech.jobs} jobs</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                  <Clock className="w-3 h-3 text-primary" />
                  ETA {tech.eta}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-primary" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2NearbyTechnicians;
