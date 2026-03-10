import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight, RotateCcw, ExternalLink, MessageCircle, CheckCircle2, MapPin,
  AlertTriangle, Lightbulb, BookOpen, ChevronDown, ChevronUp, ShieldCheck, Clock, Wrench,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
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

/* Animated confidence ring */
function ConfidenceRing({ value }: { value: number }) {
  const size = 64;
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "hsl(var(--success))" : value >= 60 ? "hsl(var(--primary))" : "hsl(var(--warning))";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <motion.span
        className="absolute text-base font-bold text-foreground"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {value}%
      </motion.span>
    </div>
  );
}

const stagger = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.15 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

const DiagnoseResult = ({ result, userArea, urgency, onRestart }: Props) => {
  const navigate = useNavigate();
  const { prefillDraftFromDiagnose } = useBookingStore();
  const [showSelfFix, setShowSelfFix] = useState(false);

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
  const mainProbability = result.probabilities[0]?.probability ?? 0;

  return (
    <div className="space-y-4 pb-28">
      {/* Mascot header */}
      <motion.div custom={0} variants={stagger} initial="hidden" animate="show" className="flex items-center gap-3 mb-2">
        <MascotIcon state="default" size="md" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {result.isEmergency ? "⚠️ Emergency Service Recommended" : "We found the right service!"}
          </p>
          <p className="text-xs text-muted-foreground">Based on your answers</p>
        </div>
      </motion.div>

      {/* Emergency alert */}
      {result.isEmergency && (
        <motion.div custom={0.5} variants={stagger} initial="hidden" animate="show"
          className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Emergency Service Recommended</p>
            <p className="text-xs text-muted-foreground">This issue may require urgent attention. Priority dispatch enabled.</p>
          </div>
        </motion.div>
      )}

      {/* Main diagnosis card */}
      <motion.div custom={1} variants={stagger} initial="hidden" animate="show"
        className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">

        {/* Confidence hero */}
        <div className="p-5 flex items-center gap-4 bg-gradient-to-r from-success/5 via-card to-card">
          <ConfidenceRing value={mainProbability} />
          <div className="flex-1 min-w-0">
            <Badge className={`text-[10px] ${confidenceColor} mb-1.5`}>{result.confidenceLabel}</Badge>
            <h3 className="text-base font-bold text-foreground leading-snug">{result.probabilities[0]?.issue ?? result.recommendedServiceName}</h3>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Probability bars */}
          {result.probabilities.length > 1 && (
            <div className="space-y-2.5 pt-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Possible Causes</p>
              {result.probabilities.map((p, i) => (
                <motion.div key={i} custom={1.5 + i * 0.2} variants={stagger} initial="hidden" animate="show" className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground">{p.issue}</span>
                    <span className="font-bold text-primary">{p.probability}%</span>
                  </div>
                  <Progress value={p.probability} className="h-1.5" />
                </motion.div>
              ))}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Estimated Cost", value: `LKR ${result.estimatedFromPrice.toLocaleString()} – ${result.estimatedMaxPrice.toLocaleString()}`, icon: <Wrench className="w-3.5 h-3.5 text-primary" /> },
              { label: "Estimated Time", value: result.estimatedDurationHours, icon: <Clock className="w-3.5 h-3.5 text-primary" /> },
              { label: "Recommended", value: result.recommendedServiceName, icon: <ShieldCheck className="w-3.5 h-3.5 text-success" /> },
              { label: "Availability", value: result.sameDayAvailable ? "Today" : "Within 24h", icon: <CheckCircle2 className="w-3.5 h-3.5 text-success" /> },
            ].map((item, i) => (
              <motion.div key={i} custom={2 + i * 0.15} variants={stagger} initial="hidden" animate="show"
                className="bg-muted/40 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  {item.icon}
                  <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
                </div>
                <p className="font-bold text-foreground text-xs leading-snug">{item.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Trust signals */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>Technicians available in {userArea}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-success">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>No work starts without your approval</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground italic">{result.helperNote}</p>
        </div>
      </motion.div>

      {/* Self-fix tips */}
      {result.selfFixTips.length > 0 && (
        <motion.div custom={3} variants={stagger} initial="hidden" animate="show"
          className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
          <button
            onClick={() => {
              setShowSelfFix(!showSelfFix);
              if (!showSelfFix) track("diagnose_self_fix_viewed", { category: result.recommendedCategoryCode });
            }}
            className="w-full p-4 flex items-center justify-between text-left active:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-warning" />
              </div>
              <span className="text-sm font-semibold text-foreground">Try This First (Self-Fix)</span>
            </div>
            {showSelfFix ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showSelfFix && (
            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
              {result.selfFixTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">{tip.tip}</p>
                    <p className="text-[11px] text-muted-foreground italic mt-0.5">{tip.disclaimer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Education tip */}
      {result.educationTip && (
        <motion.div custom={3.5} variants={stagger} initial="hidden" animate="show"
          className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">{result.educationTip}</p>
        </motion.div>
      )}

      {/* Sticky CTA */}
      <div className="sticky-cta">
        <Button variant="hero" size="xl" className="w-full" onClick={handleContinue}>
          {result.resultType === "product" ? "Browse Matching Supplies" : "Book Technician Now"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Secondary actions */}
      <motion.div custom={4} variants={stagger} initial="hidden" animate="show" className="space-y-2">
        <Button variant="outline" className="w-full h-11 rounded-xl" onClick={handleViewCategory}>
          <ExternalLink className="w-4 h-4 mr-1.5" />
          View Category
        </Button>

        <Button variant="ghost" className="w-full h-11 rounded-xl text-muted-foreground" onClick={() => { track("diagnose_restart", {}); onRestart(); }}>
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Start Over
        </Button>
      </motion.div>

      {/* WhatsApp fallback */}
      {showWhatsAppFallback && (
        <motion.div custom={4.5} variants={stagger} initial="hidden" animate="show"
          className="bg-muted/30 border border-dashed border-border/60 rounded-2xl p-4 text-center space-y-2.5">
          <p className="text-sm text-muted-foreground">Need help identifying the right service?</p>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={handleWhatsApp}>
            <MessageCircle className="w-4 h-4 mr-1.5 text-green-600" />
            Chat with LankaFix Support
          </Button>
        </motion.div>
      )}

      {/* Trust footer */}
      <div className="text-center pt-2 pb-6">
        <p className="text-[11px] text-muted-foreground">
          Prevent breakdowns. Extend device life.<br />
          <span className="font-medium text-foreground">Powered by verified LankaFix technicians.</span>
        </p>
      </div>
    </div>
  );
};

export default DiagnoseResult;
