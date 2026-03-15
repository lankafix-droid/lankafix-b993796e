/**
 * ArrivalStatusTimeline — Visual timeline of technician movement states.
 * Extends existing booking state machine with arrival-specific milestones.
 */
import { CheckCircle2, Circle, Clock, Navigation, MapPin, Wrench, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface ArrivalStatusTimelineProps {
  bookingStatus: string;
  assignedAt?: string | null;
  startedTravelAt?: string | null;
  arrivedAt?: string | null;
  startedWorkAt?: string | null;
}

const ARRIVAL_STEPS = [
  { key: "assigned", label: "Technician assigned", icon: CheckCircle2, statuses: ["assigned", "tech_en_route", "arrived", "inspection_started", "repair_started", "in_progress", "completed"] },
  { key: "tech_en_route", label: "On the way", icon: Navigation, statuses: ["tech_en_route", "arrived", "inspection_started", "repair_started", "in_progress", "completed"] },
  { key: "arrived", label: "Arrived at location", icon: MapPin, statuses: ["arrived", "inspection_started", "repair_started", "in_progress", "completed"] },
  { key: "inspection_started", label: "Service in progress", icon: Wrench, statuses: ["inspection_started", "repair_started", "in_progress", "completed"] },
  { key: "completed", label: "Completed", icon: ShieldCheck, statuses: ["completed"] },
];

export default function ArrivalStatusTimeline({ bookingStatus, assignedAt }: ArrivalStatusTimelineProps) {
  // Only show when technician is assigned or beyond
  const showStatuses = ["assigned", "tech_en_route", "arrived", "inspection_started", "repair_started", "in_progress", "completed", "quote_submitted", "quote_approved"];
  if (!showStatuses.includes(bookingStatus)) return null;

  // Map quote statuses to inspection_started for timeline purposes
  const effectiveStatus = ["quote_submitted", "quote_approved", "quote_revised"].includes(bookingStatus)
    ? "inspection_started"
    : bookingStatus === "repair_started" ? "in_progress" : bookingStatus;

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Arrival Progress</h3>
      <div className="space-y-0">
        {ARRIVAL_STEPS.map((step, i) => {
          const completed = step.statuses.includes(effectiveStatus);
          const isCurrent = step.key === effectiveStatus;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-start gap-3 relative">
              {i < ARRIVAL_STEPS.length - 1 && (
                <div className={`absolute left-[11px] top-6 w-0.5 h-6 ${completed ? "bg-success/40" : "bg-border"}`} />
              )}
              <div className="relative z-10 mt-0.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isCurrent
                    ? "bg-primary ring-3 ring-primary/15"
                    : completed
                    ? "bg-success"
                    : "bg-muted"
                }`}>
                  {completed ? (
                    <StepIcon className={`w-3 h-3 ${isCurrent ? "text-primary-foreground" : "text-primary-foreground"}`} />
                  ) : (
                    <Circle className="w-2.5 h-2.5 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="pb-4 flex-1">
                <p className={`text-sm ${
                  isCurrent ? "font-bold text-primary" : completed ? "font-medium text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </p>
                {isCurrent && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                    </span>
                    <span className="text-[10px] text-primary font-medium">Current</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
