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
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-8",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-muted-foreground/60" />
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">{title}</h3>
      <p className="text-[var(--text-sm)] text-muted-foreground max-w-xs leading-relaxed mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-gradient-brand text-primary-foreground shadow-brand font-semibold rounded-xl h-11 px-6"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
