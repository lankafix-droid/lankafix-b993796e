interface LankaFixLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  showIcon?: boolean;
}

const sizes = {
  sm: { icon: "w-7 h-7", text: "text-lg", iconText: "text-[10px]" },
  md: { icon: "w-9 h-9", text: "text-xl", iconText: "text-xs" },
  lg: { icon: "w-11 h-11", text: "text-2xl", iconText: "text-sm" },
};

const LankaFixLogo = ({ size = "md", variant = "dark", showIcon = true }: LankaFixLogoProps) => {
  const s = sizes[size];
  const isLight = variant === "light";

  return (
    <div className="flex items-center gap-2">
      {showIcon && (
        <div className={`${s.icon} rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20`}>
          <span className={`text-primary-foreground font-extrabold ${s.iconText} tracking-tight`}>LF</span>
        </div>
      )}
      <span className={`font-extrabold ${s.text} tracking-tight`}>
        <span className={isLight ? "text-white" : "text-foreground"}>Lanka</span>
        <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Fix</span>
      </span>
    </div>
  );
};

export default LankaFixLogo;
