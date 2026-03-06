import { ShieldCheck, Zap, Truck, Wrench, CheckCircle2, Headphones, MapPin, Shield } from "lucide-react";

export type MascotState = "default" | "verified" | "emergency" | "on_the_way" | "in_progress" | "completed";
export type MascotBadge = "verified" | "warranty" | "emergency" | "support" | "zone_restricted";

interface MascotIconProps {
  state?: MascotState;
  badge?: MascotBadge;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-10 h-10", ring: "w-12 h-12", badge: "w-4 h-4", badgeIcon: "w-2.5 h-2.5", icon: "w-5 h-5" },
  md: { container: "w-14 h-14", ring: "w-16 h-16", badge: "w-5 h-5", badgeIcon: "w-3 h-3", icon: "w-7 h-7" },
  lg: { container: "w-20 h-20", ring: "w-[88px] h-[88px]", badge: "w-6 h-6", badgeIcon: "w-3.5 h-3.5", icon: "w-10 h-10" },
};

const stateStyles: Record<MascotState, { bg: string; glow: string; accent: string }> = {
  default: { bg: "from-primary to-accent", glow: "", accent: "text-primary-foreground" },
  verified: { bg: "from-primary to-accent", glow: "", accent: "text-primary-foreground" },
  emergency: { bg: "from-warning to-orange-400", glow: "shadow-warning/30", accent: "text-warning-foreground" },
  on_the_way: { bg: "from-primary to-accent", glow: "shadow-primary/20", accent: "text-primary-foreground" },
  in_progress: { bg: "from-primary to-accent", glow: "", accent: "text-primary-foreground" },
  completed: { bg: "from-lankafix-green to-accent", glow: "shadow-lankafix-green/30", accent: "text-lankafix-green-foreground" },
};

const stateIcons: Record<MascotState, React.ReactNode> = {
  default: null,
  verified: <ShieldCheck />,
  emergency: <Zap />,
  on_the_way: <Truck />,
  in_progress: <Wrench />,
  completed: <CheckCircle2 />,
};

const badgeConfig: Record<MascotBadge, { bg: string; icon: React.ReactNode }> = {
  verified: { bg: "bg-lankafix-green", icon: <ShieldCheck /> },
  warranty: { bg: "bg-primary", icon: <Shield /> },
  emergency: { bg: "bg-warning", icon: <Zap /> },
  support: { bg: "bg-primary", icon: <Headphones /> },
  zone_restricted: { bg: "bg-muted-foreground", icon: <MapPin /> },
};

const MascotIcon = ({ state = "default", badge, size = "md", className = "" }: MascotIconProps) => {
  const s = sizeMap[size];
  const style = stateStyles[state];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div className={`${s.ring} rounded-full flex items-center justify-center ${style.glow ? `shadow-lg ${style.glow}` : ""}`}>
        <div className={`${s.container} rounded-full bg-gradient-to-br ${style.bg} flex items-center justify-center shadow-md relative overflow-hidden`}>
          <svg viewBox="0 0 40 40" className={s.icon} fill="none">
            <path d="M20 8 L20 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={style.accent} />
            <path d="M12.5 13.5 A11 11 0 1 0 27.5 13.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={style.accent} fill="none" />
            <text x="20" y="35" textAnchor="middle" fontSize="6" fontWeight="bold" className={style.accent} fill="currentColor" opacity="0.6">LF</text>
          </svg>
          {state !== "default" && stateIcons[state] && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border-2 border-card flex items-center justify-center">
              <div className="w-3 h-3 text-foreground">{stateIcons[state]}</div>
            </div>
          )}
        </div>
      </div>
      {badge && (
        <div className={`absolute -top-0.5 -right-0.5 ${s.badge} rounded-full ${badgeConfig[badge].bg} flex items-center justify-center shadow-sm border-2 border-card`}>
          <div className={`${s.badgeIcon} text-primary-foreground`}>{badgeConfig[badge].icon}</div>
        </div>
      )}
    </div>
  );
};

export default MascotIcon;
