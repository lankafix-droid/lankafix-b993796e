import { Link } from "react-router-dom";
import { Stethoscope, ArrowRight } from "lucide-react";
import MascotIcon from "@/components/brand/MascotIcon";

const DiagnoseCard = () => (
  <Link
    to="/diagnose"
    className="group bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-5 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 flex items-center gap-4"
  >
    <MascotIcon state="default" size="sm" />
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Stethoscope className="w-4 h-4 text-primary" />
        Diagnose My Problem
      </h3>
      <p className="text-xs text-muted-foreground mt-0.5">Not sure what service you need? Let us help you find the right fix.</p>
    </div>
    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
  </Link>
);

export default DiagnoseCard;
