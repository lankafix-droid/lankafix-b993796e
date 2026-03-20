import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface ContentSectionShellProps {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
  /** Use a stronger visual treatment for premium sections */
  premium?: boolean;
}

const ContentSectionShell = memo(function ContentSectionShell({
  title, icon, subtitle, actionLabel, onAction, children, className, premium,
}: ContentSectionShellProps) {
  return (
    <section className={cn('py-4', premium && 'py-5', className)}>
      <div className="px-4 flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h2 className={cn(
            'flex items-center gap-2 font-heading text-base font-bold text-foreground tracking-tight',
            premium && 'text-[17px]'
          )}>
            {icon}
            <span className="truncate">{title}</span>
          </h2>
          {subtitle && (
            <p className={cn(
              "text-[11px] text-muted-foreground mt-0.5 tracking-wide",
              premium && "font-medium"
            )}>
              {subtitle}
            </p>
          )}
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0 ml-2"
          >
            {actionLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
});

export default ContentSectionShell;
