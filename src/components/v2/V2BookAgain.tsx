import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyBookings } from "@/hooks/useBookingFromDB";
import { ArrowRight, RotateCcw, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { categories } from "@/data/categories";

const CATEGORY_LABELS: Record<string, string> = {};
categories.forEach(c => { CATEGORY_LABELS[c.code] = c.name; });

const V2BookAgain = () => {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useMyBookings();

  // Only show for logged-in users with completed bookings
  const completedBookings = (bookings || [])
    .filter(b => b.status === "completed")
    .slice(0, 3);

  if (!user || isLoading || completedBookings.length === 0) return null;

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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
              <RotateCcw className="w-4.5 h-4.5 text-primary" />
            </div>
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">Book Again</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-[46px]">Quick rebook from your recent services</p>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {completedBookings.map((booking, i) => {
            const catLabel = CATEGORY_LABELS[booking.category_code] || booking.category_code;
            const completedDate = booking.completed_at
              ? new Date(booking.completed_at).toLocaleDateString("en-LK", { month: "short", day: "numeric" })
              : null;

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                className="flex-shrink-0"
              >
                <Link
                  to={`/book/${booking.category_code}`}
                  onClick={() => track("homepage_book_again_click", { category: booking.category_code })}
                  className="block w-[200px] bg-card rounded-2xl border border-border/40 p-4 hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 group active:scale-[0.97]"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span className="text-[10px] font-semibold text-success">Completed</span>
                  </div>
                  <p className="text-sm font-bold text-foreground font-heading leading-tight mb-1">{catLabel}</p>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    {booking.service_type?.replace(/_/g, " ") || "General service"}
                  </p>
                  {completedDate && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mb-3">
                      <Clock className="w-3 h-3" /> {completedDate}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                    Book Again <ArrowRight className="w-3.5 h-3.5" />
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

export default V2BookAgain;
