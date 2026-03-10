import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  hint?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className, hint }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center py-14 px-6",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-primary/40" />
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-2">{description}</p>
      {hint && (
        <p className="text-[11px] text-muted-foreground/70 max-w-xs mb-5">💡 {hint}</p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-sm font-semibold rounded-xl h-11 px-6 active:scale-[0.97] transition-transform"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
