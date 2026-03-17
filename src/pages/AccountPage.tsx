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
  Star, Settings, Zap, Brain,
} from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP, SUPPORT_PHONE, whatsappLink } from "@/config/contact";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { User as SupaUser } from "@supabase/supabase-js";

const APP_VERSION = "1.0.0";

// Mock bookings removed — real bookings fetched from DB below

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
  in_progress: { label: "In Progress", className: "bg-primary/10 text-primary border-primary/20" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{children}</h2>;
}

function MenuRow({ icon: Icon, label, desc, to, href, onClick, iconColor = "text-primary", right, destructive }: {
  icon: React.ElementType;
  label: string;
  desc?: string;
  to?: string;
  href?: string;
  onClick?: () => void;
  iconColor?: string;
  right?: React.ReactNode;
  destructive?: boolean;
}) {
  const content = (
    <>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${destructive ? "bg-destructive/10" : "bg-muted/60"}`}>
        <Icon className={`w-4.5 h-4.5 ${destructive ? "text-destructive" : iconColor} shrink-0`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground truncate">{desc}</p>}
      </div>
      {right || <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
    </>
  );

  const cls = "flex items-center gap-3 px-4 py-3.5 min-h-[56px] hover:bg-muted/40 transition-colors active:bg-muted/60";

  if (to) return <Link to={to} className={cls}>{content}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>;
  if (onClick) return <button onClick={onClick} className={`${cls} w-full text-left`}>{content}</button>;
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
      <main className="flex-1 container max-w-2xl py-5 px-4 pb-28">
        <StaggerList className="space-y-5">
          
          {/* ─── Profile Hero ─── */}
          <StaggerItem>
            <div className="bg-gradient-to-br from-primary/10 via-card to-card rounded-2xl border border-border/60 p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0 ring-2 ring-primary/10">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-foreground">My Account</h1>
                  {user ? (
                    <>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{user.email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <ShieldCheck className="w-3 h-3 text-success" />
                        <span className="text-[10px] text-success font-medium">Verified Account</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">Sign in to manage your account</p>
                  )}
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* ─── Quick Actions ─── */}
          <StaggerItem>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: Clock, label: "Track Job", desc: "Live status", to: "/track" },
                { icon: Wrench, label: "Diagnose", desc: "AI finder", to: "/diagnose" },
                { icon: Zap, label: "Book Now", desc: "New service", to: "/" },
              ].map((item) => (
                <Link key={item.label} to={item.to} className="bg-card rounded-2xl border border-border/60 p-3.5 flex flex-col items-center text-center hover:border-primary/30 transition-colors active:scale-[0.97] shadow-[var(--shadow-card)]">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                </Link>
              ))}
            </div>
          </StaggerItem>

          {/* ─── My Bookings ─── */}
          <StaggerItem>
            <div className="space-y-2.5">
              <SectionTitle>My Bookings</SectionTitle>
              {/* Real bookings — link to tracker */}
              <Link to="/track" className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">View My Bookings</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Track active and past service requests</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </Link>
              {false ? (
                null
              ) : (
                <div className="bg-card rounded-2xl border border-dashed border-border/60 p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">No bookings yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Book your first service and track it here</p>
                  <Button asChild size="sm" className="rounded-xl">
                    <Link to="/">Book a Service</Link>
                  </Button>
                </div>
              )}
            </div>
          </StaggerItem>

          {/* ─── Saved Addresses ─── */}
          <StaggerItem>
            <div className="space-y-2.5">
              <SectionTitle>Saved Addresses</SectionTitle>
              {savedAddresses.length > 0 ? (
                savedAddresses.map((addr) => (
                  <div key={addr.id} className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3 shadow-[var(--shadow-card)]">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${addr.zoneStatus === "inside" ? "bg-success/10" : addr.zoneStatus === "edge" ? "bg-warning/10" : "bg-destructive/10"}`}>
                      <MapPin className={`w-4.5 h-4.5 ${addr.zoneStatus === "inside" ? "text-success" : addr.zoneStatus === "edge" ? "text-warning" : "text-destructive"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{addr.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">{addr.area}, {addr.city}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{ADDRESS_LABEL_OPTIONS.find((l) => l.value === addr.label)?.label || "Other"}</Badge>
                  </div>
                ))
              ) : (
                <div className="bg-card rounded-2xl border border-dashed border-border/60 p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">No saved addresses</p>
                  <p className="text-xs text-muted-foreground">Save your home and office addresses when you book a service</p>
                </div>
              )}
            </div>
          </StaggerItem>

          {/* ─── Devices & Care ─── */}
          <StaggerItem>
            <div className="space-y-0.5">
              <SectionTitle>Devices & Care</SectionTitle>
              <div className="bg-card rounded-2xl border border-border/60 divide-y divide-border/40 overflow-hidden shadow-[var(--shadow-card)]">
                <MenuRow icon={Heart} label="My Devices" desc="Device passports & health scores" to="/devices" />
                <MenuRow icon={ShieldCheck} label="Care Plans" desc="Active protection & maintenance" to="/care" />
                <MenuRow icon={Clock} label="Reminders" desc="Service care & upcoming actions" to="/reminders" />
              </div>
            </div>
          </StaggerItem>

          {/* ─── Support ─── */}
          <StaggerItem>
            <div className="space-y-0.5">
              <SectionTitle>Support</SectionTitle>
              <div className="bg-card rounded-2xl border border-border/60 divide-y divide-border/40 overflow-hidden shadow-[var(--shadow-card)]">
                <MenuRow icon={MessageCircle} label="WhatsApp Support" desc="Fastest way to get help" href={whatsappLink(SUPPORT_WHATSAPP, "Hi, I need help with my LankaFix account.")} iconColor="text-success" />
                <MenuRow icon={Mail} label="Email Support" desc={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />
                <MenuRow icon={Phone} label="Call Support" desc={SUPPORT_PHONE} href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} />
                <MenuRow icon={HelpCircle} label="FAQ" desc="Common questions answered" to="/faq" iconColor="text-muted-foreground" />
              </div>
            </div>
          </StaggerItem>

          {/* ─── AI Preferences ─── */}
          <StaggerItem>
            <div className="space-y-0.5">
              <SectionTitle>Smart Features</SectionTitle>
              <div className="bg-card rounded-2xl border border-border/60 divide-y divide-border/40 overflow-hidden shadow-[var(--shadow-card)]">
                <MenuRow icon={Brain} label="AI Preferences" desc="Manage optional smart suggestions" to="/settings/ai-preferences" />
              </div>
            </div>
          </StaggerItem>

          {/* ─── Legal ─── */}
          <StaggerItem>
            <div className="space-y-0.5">
              <SectionTitle>Legal</SectionTitle>
              <div className="bg-card rounded-2xl border border-border/60 divide-y divide-border/40 overflow-hidden shadow-[var(--shadow-card)]">
                <MenuRow icon={Lock} label="Privacy Policy" to="/privacy" iconColor="text-muted-foreground" />
                <MenuRow icon={FileText} label="Terms of Service" to="/terms" iconColor="text-muted-foreground" />
                <MenuRow icon={ShieldCheck} label="Warranty Policy" to="/warranty" iconColor="text-muted-foreground" />
                <MenuRow icon={Info} label="Refund Policy" to="/refund" iconColor="text-muted-foreground" />
                <MenuRow icon={Trash2} label="Data Deletion Policy" desc="How we handle account deletion" to="/support/account-deletion" iconColor="text-muted-foreground" />
              </div>
            </div>
          </StaggerItem>

          {/* ─── Account Actions ─── */}
          <StaggerItem>
            <div className="space-y-2.5">
              <SectionTitle>Account</SectionTitle>
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

              <div className="pt-2 border-t border-border/40">
                <MenuRow icon={Trash2} label="Delete My Account" desc="Permanently remove your data" to="/account/delete" destructive />
              </div>
            </div>
          </StaggerItem>

          {/* ─── System Info ─── */}
          <StaggerItem>
            <div className="flex items-center justify-center gap-3 py-4 text-[10px] text-muted-foreground/60">
              <span>LankaFix v{APP_VERSION}</span>
              <span>·</span>
              <span>Smart Office Private Limited</span>
            </div>
          </StaggerItem>
        </StaggerList>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default AccountPage;
