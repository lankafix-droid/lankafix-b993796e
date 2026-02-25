import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Clock } from "lucide-react";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from "@/types/booking";

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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-10 max-w-lg">
          <h1 className="text-3xl font-bold text-foreground mb-2">Track Your Job</h1>
          <p className="text-muted-foreground mb-8">Enter your Job ID to view status and details</p>

          <div className="flex gap-2 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={jobIdInput}
                onChange={(e) => setJobIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                placeholder="e.g. LF-A1B2C3"
                className="w-full pl-10 pr-3 py-3 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button variant="hero" onClick={handleTrack} disabled={!jobIdInput.trim()}>
              Track
            </Button>
          </div>

          {recentBookings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" /> Recent Bookings
              </h2>
              <div className="space-y-2">
                {recentBookings.map((b) => (
                  <Link
                    key={b.jobId}
                    to={`/tracker/${b.jobId}`}
                    className="flex items-center justify-between bg-card rounded-xl border p-4 hover:shadow-md hover:border-primary/20 transition-all group"
                  >
                    <div>
                      <p className="font-semibold text-foreground text-sm">{b.jobId}</p>
                      <p className="text-xs text-muted-foreground">{b.categoryName} • {b.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${BOOKING_STATUS_COLORS[b.status]}`}>
                        {BOOKING_STATUS_LABELS[b.status]}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrackJob;
