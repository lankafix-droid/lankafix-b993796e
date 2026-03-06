import logoHorizontal from "@/assets/lankafix-logo-horizontal.jpg";

interface LankaFixLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  showIcon?: boolean;
}

const heights = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
};

const LankaFixLogo = ({ size = "md", variant = "dark" }: LankaFixLogoProps) => {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logoHorizontal}
        alt="LankaFix by Smart Office"
        className={`${heights[size]} w-auto object-contain ${variant === "light" ? "brightness-0 invert" : ""}`}
      />
    </div>
  );
};

export default LankaFixLogo;
