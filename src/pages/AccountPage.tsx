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
  Lock, MessageCircle, Mail, Info, Heart, HelpCircle,
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold text-foreground mb-3">{children}</h2>;
}

function MenuRow({ icon: Icon, label, desc, to, href, iconColor = "text-primary", right }: {
  icon: React.ElementType;
  label: string;
  desc?: string;
  to?: string;
  href?: string;
  iconColor?: string;
  right?: React.ReactNode;
}) {
  const content = (
    <>
      <Icon className={`w-5 h-5 ${iconColor} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground truncate">{desc}</p>}
      </div>
      {right || <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    </>
  );

  const cls = "flex items-center gap-3 p-4 min-h-[56px] hover:bg-muted/50 transition-colors active:bg-muted/70";

  if (to) return <Link to={to} className={cls}>{content}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>;
  return <div className={cls}>{content}</div>;
}

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
      <main className="flex-1 container max-w-2xl py-6 px-4 pb-28">
        <StaggerList className="space-y-6">
          {/* Profile header */}
          <StaggerItem>
            <div className="bg-card rounded-2xl border border-border/60 p-6 flex items-center gap-4 shadow-[var(--shadow-card)]">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground">My Account</h1>
                {user ? (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{user.email}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">Manage your bookings and preferences</p>
                )}
              </div>
            </div>
          </StaggerItem>

          {/* Quick actions */}
          <StaggerItem>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/track" className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3 hover:border-primary/30 transition-colors active:scale-[0.98] shadow-[var(--shadow-card)]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Track Job</p>
                  <p className="text-xs text-muted-foreground">Live status</p>
                </div>
              </Link>
              <Link to="/diagnose" className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3 hover:border-primary/30 transition-colors active:scale-[0.98] shadow-[var(--shadow-card)]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Diagnose</p>
                  <p className="text-xs text-muted-foreground">AI problem finder</p>
                </div>
              </Link>
            </div>
          </StaggerItem>

          {/* Booking history */}
          <StaggerItem>
            <div className="space-y-3">
              <SectionTitle>Recent Bookings</SectionTitle>
              {MOCK_BOOKINGS.map((booking) => {
                const statusStyle = STATUS_STYLES[booking.status] || STATUS_STYLES.pending;
                const Icon = booking.icon;
                return (
                  <div key={booking.id} className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-4 shadow-[var(--shadow-card)]">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{booking.category}</p>
                        <Badge variant="outline" className={`text-[10px] ${statusStyle.className}`}>
                          {statusStyle.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{booking.service} · {booking.date}</p>
                      <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{booking.id}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
              {MOCK_BOOKINGS.length === 0 && (
                <div className="bg-card rounded-2xl border border-dashed border-border/60 p-10 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No bookings yet</p>
                  <Button asChild size="sm" className="mt-4 rounded-xl">
                    <Link to="/">Book a Service</Link>
                  </Button>
                </div>
              )}
            </div>
          </StaggerItem>

          {/* Saved addresses */}
          <StaggerItem>
            <div className="space-y-3">
              <SectionTitle>Saved Addresses</SectionTitle>
              {savedAddresses.length > 0 ? (
                savedAddresses.map((addr) => (
                  <div key={addr.id} className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3 shadow-[var(--shadow-card)]">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      addr.zoneStatus === "inside" ? "bg-success/10" :
                      addr.zoneStatus === "edge" ? "bg-warning/10" : "bg-destructive/10"
                    }`}>
                      <MapPin className={`w-5 h-5 ${
                        addr.zoneStatus === "inside" ? "text-success" :
                        addr.zoneStatus === "edge" ? "text-warning" : "text-destructive"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{addr.displayName}</p>
                      <p className="text-xs text-muted-foreground">{addr.area}, {addr.city}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {ADDRESS_LABEL_OPTIONS.find((l) => l.value === addr.label)?.label || "Other"}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="bg-card rounded-2xl border border-dashed border-border/60 p-8 text-center">
                  <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No saved addresses</p>
                  <p className="text-xs text-muted-foreground mt-1">Addresses are saved when you book a service</p>
                </div>
              )}
            </div>
          </StaggerItem>

          {/* Trust features */}
          <StaggerItem>
            <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]">
              <SectionTitle>Your Protection</SectionTitle>
              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, label: "Verified Technicians", desc: "Background-checked and certified professionals" },
                  { icon: FileText, label: "Quote Approval Required", desc: "No work begins without your explicit approval" },
                  { icon: Phone, label: "OTP Job Verification", desc: "Secure job start and completion codes" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>

          {/* ─── Settings, Legal & Support ─── */}
          <StaggerItem>
            <div className="space-y-3">
              <SectionTitle>Settings & Support</SectionTitle>
              <div className="bg-card rounded-2xl border border-border/60 divide-y divide-border/50 overflow-hidden shadow-[var(--shadow-card)]">
                <MenuRow
                  icon={MessageCircle}
                  label="WhatsApp Support"
                  desc="Chat with us on WhatsApp"
                  href={whatsappLink(SUPPORT_WHATSAPP, "Hi, I need help with my LankaFix account.")}
                  iconColor="text-success"
                />
                <MenuRow
                  icon={Mail}
                  label="Email Support"
                  desc={SUPPORT_EMAIL}
                  href={`mailto:${SUPPORT_EMAIL}`}
                />
                <MenuRow
                  icon={Phone}
                  label="Call Support"
                  desc={SUPPORT_PHONE}
                  href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                />

                <div className="h-px bg-border/30" />

                <MenuRow icon={HelpCircle} label="FAQ" desc="Common questions answered" to="/faq" iconColor="text-muted-foreground" />
                <MenuRow icon={Heart} label="My Devices & Care" desc="Device passports & plans" to="/devices" iconColor="text-primary" />
                <MenuRow icon={Lock} label="Privacy Policy" to="/privacy" iconColor="text-muted-foreground" />
                <MenuRow icon={FileText} label="Terms of Service" to="/terms" iconColor="text-muted-foreground" />

                <div className="h-px bg-border/30" />

                <MenuRow
                  icon={Info}
                  label="App Version"
                  iconColor="text-muted-foreground"
                  right={<span className="text-xs text-muted-foreground font-mono">{APP_VERSION}</span>}
                />
              </div>
            </div>
          </StaggerItem>

          {/* ─── Account Actions ─── */}
          <StaggerItem>
            <div className="space-y-3 pb-8">
              {user && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-13 rounded-xl text-foreground border-border/60"
                  disabled={loggingOut}
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">{loggingOut ? "Signing out…" : "Log Out"}</span>
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-13 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
                asChild
              >
                <Link to="/account/delete">
                  <Trash2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Delete My Account</span>
                </Link>
              </Button>
            </div>
          </StaggerItem>
        </StaggerList>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default AccountPage;
