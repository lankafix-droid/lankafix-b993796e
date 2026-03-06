import { Link } from "react-router-dom";
import { Stethoscope, ArrowRight, HelpCircle } from "lucide-react";
import { track } from "@/lib/analytics";
import mascotImg from "@/assets/lankafix-mascot.jpg";

const DiagnoseCard = () => (
  <Link
    to="/diagnose"
    onClick={() => track("diagnose_card_click")}
    aria-label="Diagnose my problem — guided wizard"
    className="group bg-gradient-to-br from-primary/5 via-accent/5 to-lankafix-green/5 rounded-2xl border border-primary/15 p-6 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 flex items-center gap-5"
  >
    <img
      src={mascotImg}
      alt="LankaFix FixBuddy mascot"
      className="w-16 h-16 rounded-xl object-cover shadow-md shrink-0 group-hover:scale-105 transition-transform duration-300"
    />
    <div className="flex-1 min-w-0">
      <h3 className="font-bold text-foreground text-base flex items-center gap-2">
        Diagnose My Problem
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        Answer 4 questions • Get the right service instantly
      </p>
      <p className="text-xs text-primary mt-1.5 font-medium">
        FixBuddy will guide you — takes about 30 seconds
      </p>
    </div>
    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
  </Link>
);

export default DiagnoseCard;
