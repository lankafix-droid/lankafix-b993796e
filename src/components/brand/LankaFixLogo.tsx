import { forwardRef } from "react";
import logoHorizontal from "@/assets/lankafix-logo-horizontal.jpg";
import logoStacked from "@/assets/lankafix-logo-stacked.jpg";
import iconDark from "@/assets/lankafix-icon-dark.jpg";
import iconLight from "@/assets/lankafix-icon-light.jpg";

interface LankaFixLogoProps {
  size?: "sm" | "md" | "lg";
  /** "dark" = dark logo for light backgrounds, "light" = light/white logo for dark backgrounds */
  variant?: "light" | "dark";
  /** "horizontal" (default header), "stacked", "icon" */
  layout?: "horizontal" | "stacked" | "icon";
}

const heights = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
};

const LankaFixLogo = forwardRef<HTMLDivElement, LankaFixLogoProps>(
  ({ size = "md", variant = "dark", layout = "horizontal" }, ref) => {
    let src: string;

    if (layout === "icon") {
      src = variant === "light" ? iconLight : iconDark;
    } else if (layout === "stacked") {
      src = logoStacked;
    } else {
      src = logoHorizontal;
    }

    return (
      <div ref={ref} className="flex items-center">
        <img
          src={src}
          alt="LankaFix by Smart Office"
          className={`${heights[size]} w-auto object-contain`}
        />
      </div>
    );
  }
);

LankaFixLogo.displayName = "LankaFixLogo";

export default LankaFixLogo;
