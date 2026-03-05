import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, RotateCcw, ExternalLink, MessageCircle, CheckCircle2, MapPin } from "lucide-react";
import MascotIcon from "@/components/brand/MascotIcon";
import { track } from "@/lib/analytics";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";
import { useBookingStore } from "@/store/bookingStore";
import { categories } from "@/data/categories";
import type { DiagnoseRecommendation } from "@/engines/diagnoseEngine";

interface Props {
  result: DiagnoseRecommendation;
  userArea: string;
  urgency: string;
  onRestart: () => void;
}

const DiagnoseResult = ({ result, userArea, urgency, onRestart }: Props) => {
  const navigate = useNavigate();
  const { prefillDraftFromDiagnose } = useBookingStore();

  const handleContinue = () => {
    track("diagnose_continue_booking", {
      category: result.recommendedCategoryCode,
      service: result.recommendedServiceCode,
      resultType: result.resultType,
    });
    track("diagnose_to_booking_conversion", {
      category: result.recommendedCategoryCode,
      service: result.recommendedServiceCode,
    });

    if (result.resultType === "product") {
      // Map problem to intent query param
      const intentMap: Record<string, string> = {
        need_toner: "toner", need_ink: "ink", need_printer: "printer", need_accessories: "accessories",
      };
      const intent = intentMap[result.recommendedServiceCode] || "toner";
      navigate(`/category/print_supplies?intent=${intent}`);
    } else {
      const cat = categories.find(c => c.code === result.recommendedCategoryCode);
      prefillDraftFromDiagnose({
        categoryCode: result.recommendedCategoryCode,
        categoryName: cat?.name || "",
        serviceCode: result.recommendedServiceCode,
        serviceName: result.recommendedServiceName,
        urgency,
        zone: userArea,
        recommendedMode: result.recommendedMode,
      });
      navigate(`/precheck/${result.recommendedCategoryCode}/${result.recommendedServiceCode}`);
    }
  };

  const handleViewCategory = () => {
    track("diagnose_view_category", { category: result.recommendedCategoryCode });
    navigate(`/category/${result.recommendedCategoryCode.toLowerCase()}`);
  };

  const handleWhatsApp = () => {
    track("diagnose_whatsapp_click", { category: result.recommendedCategoryCode });
    window.open(
      whatsappLink(SUPPORT_WHATSAPP, `Hi, I need help with ${result.recommendedServiceName}`),
      "_blank"
    );
  };

  const confidenceColor =
    result.confidenceLabel === "Best Match" ? "bg-success/10 text-success border-success/20" :
    result.confidenceLabel === "Recommended" ? "bg-primary/10 text-primary border-primary/20" :
    "bg-warning/10 text-warning border-warning/20";

  const showWhatsAppFallback = result.confidenceLabel === "General Inspection";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Mascot */}
      <div className="flex items-center gap-3 mb-2">
        <MascotIcon state="default" size="md" />
        <div>
          <p className="text-sm font-semibold text-foreground">We found the right service!</p>
          <p className="text-xs text-muted-foreground">Based on your answers</p>
        </div>
      </div>

      {/* Result card */}
      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Recommended Service</p>
            <h3 className="text-lg font-bold text-foreground">{result.recommendedServiceName}</h3>
          </div>
          <Badge className={`text-xs ${confidenceColor}`}>{result.confidenceLabel}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Starting from</p>
            <p className="font-bold text-foreground">LKR {result.estimatedFromPrice.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Availability</p>
            <p className="font-bold text-foreground">
              {result.sameDayAvailable ? "Today" : "Within 24h"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>Technicians available in {userArea}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-success">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>No work starts without your approval</span>
        </div>

        <p className="text-xs text-muted-foreground italic">{result.helperNote}</p>
      </div>

      {/* Actions */}
      <Button variant="hero" size="xl" className="w-full" onClick={handleContinue} aria-label="Continue to booking">
        {result.resultType === "product" ? "Browse Matching Supplies" : "Continue to Booking"}
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>

      <Button variant="outline" className="w-full" onClick={handleViewCategory} aria-label="View all services in category">
        <ExternalLink className="w-4 h-4 mr-1.5" />
        View Category
      </Button>

      <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { track("diagnose_restart", {}); onRestart(); }} aria-label="Start over">
        <RotateCcw className="w-4 h-4 mr-1.5" />
        Start Over
      </Button>

      {/* WhatsApp fallback */}
      {showWhatsAppFallback && (
        <div className="bg-muted/30 border border-dashed rounded-2xl p-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Need help identifying the right service?</p>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} aria-label="Chat on WhatsApp">
            <MessageCircle className="w-4 h-4 mr-1.5 text-green-600" />
            Chat with LankaFix Support on WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
};

export default DiagnoseResult;
