import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Clock, Shield, MapPin } from "lucide-react";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from "@/types/booking";
import { motion, AnimatePresence } from "framer-motion";
import MascotIcon from "@/components/brand/MascotIcon";
import { EmptyState } from "@/components/ui/EmptyState";

const TrackJob = () => {
  const [jobIdInput, setJobIdInput] = useState("");
  const navigate = useNavigate();
  const { getRecentBookings } = useBookingStore();

  const recentBookings = getRecentBookings();

  const handleTrack = () => {
    if (jobIdInput.trim()) {
      navigate(`/tracker/${jobIdInput.trim().toUpperCase()}`);
    }
  };

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-b from-primary/5 via-background to-background pt-10 pb-6">
          <div className="container max-w-lg px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-6"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1.5">Track Your Job</h1>
              <p className="text-sm text-muted-foreground">Enter your Job ID for real-time status</p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative mb-5"
            >
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={jobIdInput}
                    onChange={(e) => setJobIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                    placeholder="e.g. LF-A1B2C3"
                    className="w-full pl-12 pr-4 h-13 rounded-2xl border border-border/60 bg-card text-foreground text-base font-medium shadow-[var(--shadow-card)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  />
                </div>
                <Button
                  variant="hero"
                  className="rounded-2xl px-6 h-13"
                  onClick={handleTrack}
                  disabled={!jobIdInput.trim()}
                >
                  Track
                </Button>
              </div>
            </motion.div>

            {/* Trust pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1.5 bg-card border border-border/60 rounded-full px-3 py-1.5 shadow-sm">
                <Shield className="w-3.5 h-3.5 text-primary" /> Live Updates
              </span>
              <span className="inline-flex items-center gap-1.5 bg-card border border-border/60 rounded-full px-3 py-1.5 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-primary" /> GPS Tracking
              </span>
            </motion.div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="container max-w-lg px-4 py-6 pb-28">
          <AnimatePresence>
            {recentBookings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted-foreground" /> Recent Bookings
                </h2>
                <div className="space-y-3">
                  {recentBookings.map((b, i) => (
                    <motion.div
                      key={b.jobId}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 + i * 0.08 }}
                    >
                      <Link
                        to={`/tracker/${b.jobId}`}
                        className="flex items-center justify-between bg-card rounded-2xl border border-border/60 p-4 hover:shadow-md hover:border-primary/20 transition-all group active:scale-[0.98] shadow-[var(--shadow-card)]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MascotIcon state="default" size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm">{b.jobId}</p>
                            <p className="text-xs text-muted-foreground truncate">{b.categoryName} • {b.serviceName}</p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">{new Date(b.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge className={`text-xs ${BOOKING_STATUS_COLORS[b.status]}`}>
                            {BOOKING_STATUS_LABELS[b.status]}
                          </Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {recentBookings.length === 0 && (
            <EmptyState
              icon={Clock}
              title="No Recent Bookings"
              description="Your booking history will appear here once you book a service."
              actionLabel="Browse Services"
              onAction={() => navigate("/")}
            />
          )}
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default TrackJob;
