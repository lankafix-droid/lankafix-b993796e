import { Link } from "react-router-dom";
import { mockBooking } from "@/data/mockData";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, MessageCircle, Star, Upload, CheckCircle2, Circle, Clock } from "lucide-react";

const statusColors: Record<string, string> = {
  requested: "bg-muted text-muted-foreground",
  assigned: "bg-primary/10 text-primary",
  tech_en_route: "bg-warning/10 text-warning",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  requested: "Requested",
  assigned: "Assigned",
  tech_en_route: "Tech En Route",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const BookingTracker = () => {
  const b = mockBooking;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{b.jobId}</h1>
              <p className="text-sm text-muted-foreground">{b.categoryName} • {b.serviceName}</p>
            </div>
            <Badge className={statusColors[b.status] || "bg-muted text-muted-foreground"}>
              {statusLabels[b.status] || b.status}
            </Badge>
          </div>

          {/* Timeline */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Status Timeline</h3>
            <div className="space-y-0">
              {b.timeline.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                    )}
                    {i < b.timeline.length - 1 && (
                      <div className={`w-0.5 h-8 ${step.completed ? "bg-success/30" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {step.time && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {step.time}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technician Card */}
          {b.technician && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Assigned Technician</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {b.technician.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{b.technician.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                    <span>{b.technician.rating}</span>
                    <span>•</span>
                    <span>ETA: {b.technician.eta}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Evidence */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Evidence & Photos</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <Upload className="w-5 h-5" />
              </div>
              <div className="aspect-square rounded-lg bg-muted/50 border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground">
                + Upload
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Upload before/after photos for your records</p>
          </div>

          {/* Completion (mock) */}
          <div className="bg-card rounded-xl border p-5 mb-4 opacity-50">
            <h3 className="text-sm font-semibold text-foreground mb-2">Completion</h3>
            <p className="text-xs text-muted-foreground mb-3">Available after job completion</p>
            <div className="flex gap-3">
              <Button variant="success" size="sm" disabled>Confirm with OTP</Button>
              <Button variant="outline" size="sm" disabled>Leave Review</Button>
            </div>
          </div>

          {/* View Quote */}
          <Button variant="outline" className="w-full" asChild>
            <Link to="/quote">View Quote Details</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookingTracker;
