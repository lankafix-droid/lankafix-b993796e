import mascotImg from "@/assets/lankafix-mascot.jpg";
import { MASCOT_MESSAGES, type MascotMessageKey } from "@/brand/trustSystem";

interface MascotGuideProps {
  messageKey: MascotMessageKey;
  className?: string;
}

const MascotGuide = ({ messageKey, className = "" }: MascotGuideProps) => {
  const msg = MASCOT_MESSAGES[messageKey];

  return (
    <div className={`flex items-center gap-3 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-xl p-4 ${className}`}>
      <img
        src={mascotImg}
        alt="FixBuddy"
        className="w-11 h-11 rounded-full object-cover shadow-md border-2 border-card shrink-0"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{msg.title}</p>
        <p className="text-xs text-muted-foreground">{msg.subtitle}</p>
      </div>
    </div>
  );
};

export default MascotGuide;
