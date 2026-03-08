import { Star, Clock, ShieldCheck, ChevronRight } from "lucide-react";

const TECHNICIANS = [
  { name: "Nimal Perera", specialty: "AC Specialist", rating: 4.8, jobs: 132, eta: "20–30 min", avatar: "NP" },
  { name: "Kamal Silva", specialty: "Mobile Repair", rating: 4.9, jobs: 215, eta: "15–25 min", avatar: "KS" },
  { name: "Ruwan Fernando", specialty: "CCTV & Networking", rating: 4.7, jobs: 98, eta: "25–40 min", avatar: "RF" },
  { name: "Saman Jayawardena", specialty: "Laptop & IT", rating: 4.6, jobs: 176, eta: "30–45 min", avatar: "SJ" },
];

const V2NearbyTechnicians = () => {
  return (
    <section className="py-8 md:py-10">
      <div className="container">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">Technicians Near You</h2>
        <p className="text-xs text-muted-foreground mb-5">Verified professionals ready to help</p>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide md:mx-0 md:px-0 md:grid md:grid-cols-4">
          {TECHNICIANS.map((tech) => (
            <div
              key={tech.name}
              className="flex-shrink-0 w-[200px] md:w-auto bg-card rounded-2xl border p-4 space-y-3 hover:shadow-card-hover hover:border-primary/20 transition-all"
            >
              {/* Avatar + Verified */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {tech.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-foreground truncate">{tech.name}</p>
                    <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{tech.specialty}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="font-semibold text-foreground">{tech.rating}</span>
                </span>
                <span>{tech.jobs} jobs</span>
              </div>

              {/* ETA */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  ETA {tech.eta}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2NearbyTechnicians;
