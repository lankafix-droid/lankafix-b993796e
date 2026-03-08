import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Clock, Shield, MapPin } from "lucide-react";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from "@/types/booking";
import { motion, AnimatePresence } from "framer-motion";
import MascotIcon from "@/components/brand/MascotIcon";

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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-b from-primary/5 via-background to-background pt-12 pb-8">
          <div className="container max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Track Your Job</h1>
              <p className="text-muted-foreground">Enter your Job ID to view real-time status</p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative mb-6"
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
                    className="w-full pl-12 pr-4 h-14 rounded-2xl border bg-card text-foreground text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  />
                </div>
                <Button
                  variant="hero"
                  size="xl"
                  className="rounded-2xl px-6 h-14"
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
              className="flex items-center justify-center gap-3 text-xs text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1 bg-card border rounded-full px-3 py-1.5 shadow-sm">
                <Shield className="w-3.5 h-3.5 text-primary" /> Live Updates
              </span>
              <span className="inline-flex items-center gap-1 bg-card border rounded-full px-3 py-1.5 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-primary" /> GPS Tracking
              </span>
            </motion.div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="container max-w-lg py-6">
          <AnimatePresence>
            {recentBookings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
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
                        className="flex items-center justify-between bg-card rounded-2xl border p-4 hover:shadow-md hover:border-primary/20 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <MascotIcon state="default" size="sm" />
                          <div>
                            <p className="font-semibold text-foreground text-sm">{b.jobId}</p>
                            <p className="text-xs text-muted-foreground">{b.categoryName} • {b.serviceName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(b.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center py-12"
            >
              <MascotIcon state="default" size="lg" className="mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground text-sm">No recent bookings yet</p>
              <Button asChild variant="outline" className="mt-4 rounded-xl">
                <Link to="/">Browse Services</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrackJob;
