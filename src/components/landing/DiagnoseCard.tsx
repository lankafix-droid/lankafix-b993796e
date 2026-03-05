import { Link } from "react-router-dom";
import { Stethoscope, ArrowRight, HelpCircle } from "lucide-react";
import { track } from "@/lib/analytics";

const DiagnoseCard = () => (
  <Link
    to="/diagnose"
    onClick={() => track("diagnose_card_click")}
    aria-label="Diagnose my problem — guided wizard"
    className="group bg-gradient-to-br from-primary/5 via-primary/8 to-primary/12 rounded-2xl border border-primary/20 p-6 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 flex items-center gap-5"
  >
    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
      <Stethoscope className="w-7 h-7 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-bold text-foreground text-base flex items-center gap-2">
        Diagnose My Problem
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        Answer 4 questions • Get the right service
      </p>
      <p className="text-xs text-primary mt-1.5 font-medium">
        Quick guided wizard — takes about 30 seconds
      </p>
    </div>
    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
  </Link>
);

export default DiagnoseCard;
