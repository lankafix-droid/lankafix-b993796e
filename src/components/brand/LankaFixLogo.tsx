import { forwardRef } from "react";
import logoLight from "@/assets/lankafix-logo-light.jpg";
import logoDark from "@/assets/lankafix-logo-dark.jpg";

interface LankaFixLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}

const heights = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
};

const LankaFixLogo = forwardRef<HTMLDivElement, LankaFixLogoProps>(
  ({ size = "md", variant = "dark" }, ref) => {
    return (
      <div ref={ref} className="flex items-center">
        <img
          src={variant === "light" ? logoDark : logoLight}
          alt="LankaFix by Smart Office"
          className={`${heights[size]} w-auto object-contain`}
        />
      </div>
    );
  }
);

LankaFixLogo.displayName = "LankaFixLogo";

export default LankaFixLogo;
