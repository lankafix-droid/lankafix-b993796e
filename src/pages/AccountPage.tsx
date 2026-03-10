import { useState, useEffect } from "react";
import PageTransition from "@/components/motion/PageTransition";
import { StaggerList, StaggerItem } from "@/components/motion/StaggerList";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocationStore, ADDRESS_LABEL_OPTIONS } from "@/store/locationStore";
import {
  User, MapPin, Clock, ShieldCheck, Phone, ChevronRight,
  Smartphone, Snowflake, Wrench, FileText, LogOut, Trash2,
  Lock, MessageCircle, Mail, Info,
} from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP, SUPPORT_PHONE, whatsappLink } from "@/config/contact";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { User as SupaUser } from "@supabase/supabase-js";

const APP_VERSION = "1.0.0";

const MOCK_BOOKINGS = [
  { id: "LF-A1B2C3", category: "AC Services", service: "Standard Service", status: "completed", date: "2026-02-28", icon: Snowflake },
  { id: "LF-D4E5F6", category: "Mobile Phone Repairs", service: "Screen Replacement", status: "in_progress", date: "2026-03-07", icon: Smartphone },
];

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
  in_progress: { label: "In Progress", className: "bg-primary/10 text-primary border-primary/20" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
};

const AccountPage = () => {
  const navigate = useNavigate();
  const { savedAddresses } = useLocationStore();
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You've been signed out successfully." });
    navigate("/");
    setLoggingOut(false);
  };

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-2xl py-6">
        <StaggerList className="space-y-6">
        <StaggerItem>
        {/* Profile header */}
        <div className="bg-card rounded-2xl border p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">My Account</h1>
            {user ? (
              <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-0.5">Manage your bookings, addresses, and preferences</p>
            )}
          </div>
        </div>
        </StaggerItem>

        <StaggerItem>
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/track" className="bg-card rounded-xl border p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Track Job</p>
              <p className="text-xs text-muted-foreground">Check live status</p>
            </div>
          </Link>
          <Link to="/diagnose" className="bg-card rounded-xl border p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
            <Wrench className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Diagnose</p>
              <p className="text-xs text-muted-foreground">AI problem finder</p>
            </div>
          </Link>
        </div>
        </StaggerItem>

        <StaggerItem>
        {/* Booking history */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Recent Bookings</h2>
          {MOCK_BOOKINGS.map((booking) => {
...
          })}
          {MOCK_BOOKINGS.length === 0 && (
            <div className="bg-muted/30 rounded-xl border border-dashed p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No bookings yet</p>
              <Button asChild size="sm" className="mt-3">
                <Link to="/">Book a Service</Link>
              </Button>
            </div>
          )}
        </div>
        </StaggerItem>

        <StaggerItem>
        {/* Saved addresses */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Saved Addresses</h2>
          {savedAddresses.length > 0 ? (
...
          ) : (
            <div className="bg-muted/30 rounded-xl border border-dashed p-6 text-center">
              <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No saved addresses</p>
              <p className="text-xs text-muted-foreground mt-1">Addresses are saved when you book a service</p>
            </div>
          )}
        </div>
        </StaggerItem>

        <StaggerItem>
        {/* Trust features */}
        <div className="bg-card rounded-xl border p-5 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Your Protection</h2>
          <div className="space-y-2.5">
...
          </div>
        </div>
        </StaggerItem>

        {/* ─── Settings, Legal & Support ─── */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Settings & Support</h2>
          <div className="bg-card rounded-xl border divide-y divide-border">
            {/* Support */}
            <a
              href={whatsappLink(SUPPORT_WHATSAPP, "Hi, I need help with my LankaFix account.")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-success" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">WhatsApp Support</p>
                <p className="text-xs text-muted-foreground">Chat with us on WhatsApp</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <Mail className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Email Support</p>
                <p className="text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <Phone className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Call Support</p>
                <p className="text-xs text-muted-foreground">{SUPPORT_PHONE}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>

            {/* Legal */}
            <Link to="/privacy" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">Privacy Policy</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link to="/terms" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">Terms of Service</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            {/* App version */}
            <div className="flex items-center gap-3 p-4">
              <Info className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">App Version</span>
              <span className="text-xs text-muted-foreground font-mono">{APP_VERSION}</span>
            </div>
          </div>
        </div>

        {/* ─── Account Actions ─── */}
        <div className="space-y-3 pb-6">
          {user && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 rounded-xl text-foreground"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">{loggingOut ? "Signing out…" : "Log Out"}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
            asChild
          >
            <Link to="/account/delete">
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Delete My Account</span>
            </Link>
          </Button>
        </div>
        </StaggerList>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default AccountPage;
