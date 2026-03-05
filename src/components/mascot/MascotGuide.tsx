import MascotIcon from "@/components/brand/MascotIcon";
import { MASCOT_MESSAGES, type MascotMessageKey } from "@/brand/trustSystem";

interface MascotGuideProps {
  messageKey: MascotMessageKey;
  className?: string;
}

const MascotGuide = ({ messageKey, className = "" }: MascotGuideProps) => {
  const msg = MASCOT_MESSAGES[messageKey];

  return (
    <div className={`flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl p-4 ${className}`}>
      <MascotIcon state={msg.state} badge={msg.badge} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{msg.title}</p>
        <p className="text-xs text-muted-foreground">{msg.subtitle}</p>
      </div>
    </div>
  );
};

export default MascotGuide;
