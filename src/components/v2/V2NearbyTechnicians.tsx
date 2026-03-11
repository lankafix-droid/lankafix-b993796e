import { Star, Clock, ShieldCheck, ChevronRight, MapPin, Users, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useOnlinePartners } from "@/hooks/usePartners";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, { text: string; dot: string }> = {
  "Available now": { text: "text-success", dot: "bg-success" },
  "Nearby": { text: "text-primary", dot: "bg-primary" },
  "Next slot today": { text: "text-warning", dot: "bg-warning" },
};

function getAvailabilityLabel(status: string, jobCount: number | null): string {
  if (status === "online" && (jobCount || 0) === 0) return "Available now";
  if (status === "online") return "Nearby";
  if (status === "busy") return "Next slot today";
  return "Nearby";
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}

function getEtaEstimate(responseMin: number | null): string {
  const base = responseMin || 25;
  const lo = Math.max(10, base - 5);
  const hi = base + 10;
  return `${lo}–${hi} min`;
}

function getPrimarySpecialty(categories: string[], specializations: string[]): string {
  const SPEC_LABELS: Record<string, string> = {
    AC: "AC Specialist", MOBILE: "Mobile & Electronics", IT: "IT & Laptop Support",
    CCTV: "CCTV & Security", SOLAR: "Solar Solutions", ELECTRICAL: "Electrical",
    PLUMBING: "Plumbing", ELECTRONICS: "Electronics Repair", NETWORK: "Networking",
    COPIER: "Copier & Printer", SMART_HOME_OFFICE: "Smart Home", CONSUMER_ELEC: "Electronics",
    POWER_BACKUP: "Power Backup", APPLIANCE_INSTALL: "Appliance Install",
  };
  for (const cat of categories) {
    if (SPEC_LABELS[cat]) return SPEC_LABELS[cat];
  }
  if (specializations.length > 0) return specializations[0].replace(/_/g, " ");
  return "Verified Technician";
}

function getZoneLabel(zones: string[]): string {
  if (!zones.length) return "Colombo";
  const ZONE_LABELS: Record<string, string> = {
    col_01: "Colombo 1", col_02: "Colombo 2", col_03: "Colombo 3", col_04: "Colombo 4",
    col_05: "Colombo 5", col_06: "Colombo 6", col_07: "Colombo 7", col_08: "Colombo 8",
    col_09: "Colombo 9", col_10: "Colombo 10", col_11: "Colombo 11",
    nugegoda: "Nugegoda", dehiwala: "Dehiwala", rajagiriya: "Rajagiriya",
    battaramulla: "Battaramulla", maharagama: "Maharagama", kotte: "Kotte",
    nawala: "Nawala", thalawathugoda: "Thalawathugoda", malabe: "Malabe",
    boralesgamuwa: "Boralesgamuwa", piliyandala: "Piliyandala", moratuwa: "Moratuwa",
    mount_lavinia: "Mt. Lavinia", kolonnawa: "Kolonnawa", kaduwela: "Kaduwela",
  };
  return ZONE_LABELS[zones[0]] || zones[0].replace(/_/g, " ");
}

const V2NearbyTechnicians = () => {
  const { data: partners, isLoading, error } = useOnlinePartners();

  // Only show verified, active partners — limit to 6
  const technicians = (partners || [])
    .filter(p => p.verification_status === "verified")
    .slice(0, 6);

  // No verified providers available — production-safe fallback
  if (!isLoading && technicians.length === 0) {
    return (
      <section className="py-10 md:py-14 bg-secondary/20">
        <div className="container">
          <div className="mb-6">
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-1">Technicians Near You</h2>
            <p className="text-xs text-muted-foreground">Verified professionals active across Greater Colombo</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/40 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6 text-warning" />
            </div>
            <p className="text-sm font-semibold text-foreground">No verified providers available right now</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Our team is actively onboarding verified technicians in your area.
              You can still book a service and we'll assign the best available provider.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-14 bg-secondary/20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-1">Technicians Near You</h2>
          <p className="text-xs text-muted-foreground">Verified professionals active across Greater Colombo</p>
        </motion.div>

        <div className="flex gap-3.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[240px] md:w-auto bg-card rounded-2xl border border-border/40 p-5 space-y-3.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          ) : (
            technicians.map((tech, i) => {
              const availLabel = getAvailabilityLabel(tech.availability_status, tech.current_job_count ?? 0);
              const statusStyle = STATUS_STYLES[availLabel] || { text: "text-muted-foreground", dot: "bg-muted-foreground" };
              return (
                <motion.div
                  key={tech.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
                  className="flex-shrink-0 w-[240px] md:w-auto bg-card rounded-2xl border border-border/40 p-5 space-y-3.5 hover:shadow-card-hover hover:border-primary/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {tech.profile_photo_url ? (
                        <img src={tech.profile_photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-brand text-primary-foreground flex items-center justify-center text-sm font-bold font-heading shrink-0">
                          {getInitials(tech.full_name)}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${statusStyle.dot} border-2 border-card`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-foreground truncate font-heading">{tech.full_name}</p>
                        <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {getPrimarySpecialty(tech.categories_supported, tech.specializations || [])}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span className="font-bold text-foreground">{(tech.rating_average || 0).toFixed(1)}</span>
                    </span>
                    <span className="font-medium">{tech.completed_jobs_count || 0} jobs</span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-primary" />
                      {getZoneLabel(tech.service_zones || [])}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/30">
                    <div className="flex flex-col">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <Clock className="w-3 h-3" />
                        ETA {getEtaEstimate(tech.average_response_time_minutes)}
                      </span>
                      <span className={`text-[10px] font-bold mt-0.5 ${statusStyle.text}`}>
                        {availLabel}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default V2NearbyTechnicians;
