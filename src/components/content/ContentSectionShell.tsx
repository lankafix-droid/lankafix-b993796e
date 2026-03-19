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
}

const ContentSectionShell = memo(function ContentSectionShell({
  title, icon, subtitle, actionLabel, onAction, children, className,
}: ContentSectionShellProps) {
  return (
    <section className={cn('py-4', className)}>
      <div className="px-4 flex items-center justify-between mb-2.5">
        <div>
          <h2 className="flex items-center gap-1.5 font-heading text-base font-bold text-foreground">
            {icon}
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-0.5 text-xs font-semibold text-primary"
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
