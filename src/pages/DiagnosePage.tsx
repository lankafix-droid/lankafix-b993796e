import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Search, Stethoscope, Zap } from "lucide-react";
import { categories } from "@/data/categories";
import MascotIcon from "@/components/brand/MascotIcon";
import type { CategoryCode } from "@/types/booking";

interface Symptom {
  text: string;
  categoryCode: CategoryCode;
  serviceCode: string;
  serviceName: string;
}

const SYMPTOMS: Symptom[] = [
  { text: "AC not cooling", categoryCode: "AC", serviceCode: "AC_REPAIR", serviceName: "AC Repair / Diagnosis" },
  { text: "AC leaking water", categoryCode: "AC", serviceCode: "AC_REPAIR", serviceName: "AC Repair / Diagnosis" },
  { text: "AC making noise", categoryCode: "AC", serviceCode: "AC_REPAIR", serviceName: "AC Repair / Diagnosis" },
  { text: "AC gas low / needs recharge", categoryCode: "AC", serviceCode: "AC_GAS_TOPUP", serviceName: "Gas Top-Up" },
  { text: "CCTV camera offline", categoryCode: "CCTV", serviceCode: "CCTV_REPAIR", serviceName: "CCTV Repair" },
  { text: "CCTV no remote access", categoryCode: "CCTV", serviceCode: "CCTV_REMOTE_VIEW", serviceName: "Remote Viewing Setup" },
  { text: "Phone screen cracked", categoryCode: "MOBILE", serviceCode: "MOBILE_SCREEN", serviceName: "Screen Replacement" },
  { text: "Phone battery draining fast", categoryCode: "MOBILE", serviceCode: "MOBILE_BATTERY", serviceName: "Battery Replacement" },
  { text: "Phone not charging", categoryCode: "MOBILE", serviceCode: "MOBILE_GENERAL", serviceName: "General Repair / Diagnosis" },
  { text: "Laptop very slow", categoryCode: "IT", serviceCode: "IT_REMOTE", serviceName: "Remote IT Support" },
  { text: "WiFi not working", categoryCode: "IT", serviceCode: "IT_NETWORK", serviceName: "Network Setup / Repair" },
  { text: "Printer not printing", categoryCode: "PRINT_SUPPLIES", serviceCode: "PS_PRINTER_REPAIR", serviceName: "Printer Repair" },
  { text: "Need toner cartridge", categoryCode: "PRINT_SUPPLIES", serviceCode: "PS_TONER_ORDER", serviceName: "Toner Cartridge Order" },
  { text: "Solar panels low output", categoryCode: "SOLAR", serviceCode: "SOLAR_REPAIR", serviceName: "Inverter / System Repair" },
  { text: "Solar inverter error", categoryCode: "SOLAR", serviceCode: "SOLAR_REPAIR", serviceName: "Inverter / System Repair" },
  { text: "TV no display", categoryCode: "CONSUMER_ELEC", serviceCode: "CE_TV_REPAIR", serviceName: "TV Repair" },
  { text: "Washing machine not spinning", categoryCode: "CONSUMER_ELEC", serviceCode: "CE_WASHING", serviceName: "Washing Machine Repair" },
  { text: "Fridge not cooling", categoryCode: "CONSUMER_ELEC", serviceCode: "CE_FRIDGE", serviceName: "Refrigerator Repair" },
  { text: "Copier paper jam", categoryCode: "COPIER", serviceCode: "COPIER_REPAIR", serviceName: "Copier / MFP Repair" },
  { text: "Copier print quality bad", categoryCode: "COPIER", serviceCode: "COPIER_REPAIR", serviceName: "Copier / MFP Repair" },
  { text: "Want smart home setup", categoryCode: "SMART_HOME_OFFICE", serviceCode: "SH_AUTOMATION", serviceName: "Home Automation Setup" },
  { text: "Need smart lock installed", categoryCode: "SMART_HOME_OFFICE", serviceCode: "SH_LOCK", serviceName: "Smart Lock Installation" },
];

const DiagnosePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState<Symptom | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryCode | null>(null);

  const filteredSymptoms = query.length > 1
    ? SYMPTOMS.filter((s) => s.text.toLowerCase().includes(query.toLowerCase()))
    : SYMPTOMS.slice(0, 8);

  const matchedCategory = selectedSymptom
    ? categories.find((c) => c.code === selectedSymptom.categoryCode)
    : null;

  const matchedService = matchedCategory?.services.find(
    (s) => s.code === selectedSymptom?.serviceCode
  );

  const handleSymptomSelect = (symptom: Symptom) => {
    setSelectedSymptom(symptom);
    setSelectedCategory(symptom.categoryCode);
    setStep(1);
  };

  const handleProceed = () => {
    if (selectedSymptom) {
      navigate(`/precheck/${selectedSymptom.categoryCode}/${selectedSymptom.serviceCode}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <button onClick={() => step > 0 ? setStep(step - 1) : navigate("/")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {step > 0 ? "Back" : "Home"}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <MascotIcon state="default" size="md" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Diagnose My Problem</h1>
              <p className="text-sm text-muted-foreground">Tell us what's wrong — we'll find the right service</p>
            </div>
          </div>

          {step === 0 && (
            <div className="animate-fade-in">
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Describe your problem... e.g. 'AC not cooling'"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">
                {query.length > 1 ? "Matching symptoms" : "Common problems"}
              </p>

              <div className="space-y-2">
                {filteredSymptoms.map((symptom) => {
                  const cat = categories.find((c) => c.code === symptom.categoryCode);
                  return (
                    <button
                      key={symptom.text}
                      onClick={() => handleSymptomSelect(symptom)}
                      className="w-full text-left bg-card rounded-xl border p-4 hover:shadow-md hover:border-primary/20 transition-all group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Stethoscope className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{symptom.text}</p>
                          <p className="text-xs text-muted-foreground">{cat?.name} → {symptom.serviceName}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>
                  );
                })}
              </div>

              {filteredSymptoms.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No matching symptoms found. Try a different description.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/categories")}>
                    Browse All Categories
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 1 && selectedSymptom && matchedCategory && matchedService && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  Diagnosis Result
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Based on: "{selectedSymptom.text}"</p>

                <div className="bg-card rounded-lg border p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">{matchedService.name}</p>
                    <Badge variant="outline" className="text-xs">{matchedCategory.name}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{matchedService.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-muted-foreground">
                      From <span className="font-bold text-foreground">LKR {matchedService.fromPrice.toLocaleString()}</span>
                    </span>
                    {matchedService.slaMinutesNormal && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                        {matchedService.slaMinutesNormal < 60
                          ? `${matchedService.slaMinutesNormal} min`
                          : `${Math.round(matchedService.slaMinutesNormal / 60)}h`} SLA
                      </Badge>
                    )}
                    {matchedService.typicalDurationMinutes && (
                      <span className="text-muted-foreground">~{matchedService.typicalDurationMinutes} min</span>
                    )}
                  </div>
                </div>

                {matchedService.requiresQuote && (
                  <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mb-3">
                    ⚠ This service requires an inspection before final quotation.
                  </p>
                )}
              </div>

              <Button variant="hero" size="xl" className="w-full" onClick={handleProceed}>
                Proceed to Booking
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <Button variant="outline" className="w-full" onClick={() => { setStep(0); setQuery(""); setSelectedSymptom(null); }}>
                Try a different symptom
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DiagnosePage;
