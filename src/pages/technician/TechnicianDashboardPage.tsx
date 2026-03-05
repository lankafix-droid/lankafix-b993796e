import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingStore } from "@/store/bookingStore";
import { MOCK_TECHNICIANS } from "@/data/mockPartnerData";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { Briefcase, CheckCircle2, Wrench, User, Star } from "lucide-react";

const CURRENT_TECH = MOCK_TECHNICIANS[0]; // Mock: logged in as T001

export default function TechnicianDashboardPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);

  useEffect(() => { track("technician_dashboard_view"); }, []);

  const myJobs = bookings; // In real app, filter by tech ID
  const newJobs = myJobs.filter((b) => ["matching", "awaiting_partner_confirmation", "assigned"].includes(b.status));
  const activeJobs = myJobs.filter((b) => ["tech_en_route", "arrived", "inspection_started", "repair_started", "in_progress"].includes(b.status));
  const completedJobs = myJobs.filter((b) => ["completed", "rated"].includes(b.status));

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{CURRENT_TECH.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="w-3 h-3" /> {CURRENT_TECH.rating} • {CURRENT_TECH.jobsCompleted} jobs
            </div>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">Online</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-4 text-center">
              <Briefcase className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-2xl font-bold">{newJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-4 text-center">
              <Wrench className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{activeJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold">{completedJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </CardContent>
          </Card>
        </div>

        <Button className="w-full" onClick={() => navigate("/technician/jobs")}>
          View All Jobs
        </Button>
      </div>
    </div>
  );
}
