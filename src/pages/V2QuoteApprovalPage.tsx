import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, ShieldCheck, AlertTriangle, Phone, MessageCircle, ArrowLeft, ArrowRight, Star, HelpCircle } from "lucide-react";
import { SUPPORT_PHONE, SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

interface QuoteLineItem {
  description: string;
  amount: number;
}

interface QuoteOption {
  id: string;
  label: string;
  partQuality: "genuine" | "oem" | "compatible";
  serviceCharge: number;
  partsCost: number;
  labour: number;
  additionalWork: number;
  warranty: string;
  completionEstimate: string;
  total: number;
  items: QuoteLineItem[];
  recommended?: boolean;
}

// Mock data for demonstration
const MOCK_OPTIONS: QuoteOption[] = [
  {
    id: "A",
    label: "Genuine Parts",
    partQuality: "genuine",
    serviceCharge: 3000,
    partsCost: 15000,
    labour: 5000,
    additionalWork: 0,
    warranty: "12 months parts · 90 days labour",
    completionEstimate: "Same day",
    total: 23000,
    items: [
      { description: "Inspection & diagnosis", amount: 3000 },
      { description: "Genuine replacement part", amount: 15000 },
      { description: "Labour & installation", amount: 5000 },
    ],
    recommended: true,
  },
  {
    id: "B",
    label: "OEM Grade Parts",
    partQuality: "oem",
    serviceCharge: 3000,
    partsCost: 10000,
    labour: 5000,
    additionalWork: 0,
    warranty: "6 months parts · 90 days labour",
    completionEstimate: "Same day",
    total: 18000,
    items: [
      { description: "Inspection & diagnosis", amount: 3000 },
      { description: "OEM grade replacement part", amount: 10000 },
      { description: "Labour & installation", amount: 5000 },
    ],
  },
  {
    id: "C",
    label: "Compatible Parts",
    partQuality: "compatible",
    serviceCharge: 3000,
    partsCost: 6000,
    labour: 5000,
    additionalWork: 0,
    warranty: "3 months parts · 90 days labour",
    completionEstimate: "Same day",
    total: 14000,
    items: [
      { description: "Inspection & diagnosis", amount: 3000 },
      { description: "Compatible replacement part", amount: 6000 },
      { description: "Labour & installation", amount: 5000 },
    ],
  },
];

const QUALITY_STYLES: Record<string, { label: string; className: string }> = {
  genuine: { label: "Genuine", className: "bg-success/10 text-success border-success/20" },
  oem: { label: "OEM Grade", className: "bg-warning/10 text-warning border-warning/20" },
  compatible: { label: "Compatible", className: "bg-muted text-muted-foreground border-border" },
};

const V2QuoteApprovalPage = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string>("A");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "question">("pending");
  const [questionText, setQuestionText] = useState("");

  const jobId = "LF-DEMO01";
  const expiresIn = "23h 45m";

  const activeOption = MOCK_OPTIONS.find((o) => o.id === selectedOption)!;

  const handleApprove = () => {
    setStatus("approved");
  };

  const handleReject = () => {
    setStatus("rejected");
  };

  const handleAskQuestion = () => {
    if (questionText.trim()) {
      setStatus("question");
    }
  };

  if (status === "approved") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-2xl py-8">
          <div className="text-center space-y-5 py-8">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Quote Approved</h2>
            <p className="text-muted-foreground">Option {selectedOption} — {activeOption.label}</p>
            <div className="bg-card rounded-xl border p-5 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-foreground">LKR {activeOption.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Warranty</span>
                <span className="text-foreground">{activeOption.warranty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="text-foreground">{activeOption.completionEstimate}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Work will begin shortly. You'll receive updates via SMS.</p>
            <Button onClick={() => navigate("/")} className="w-full">Back to Home</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-2xl py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Quote Approval</h1>
              <p className="text-sm text-muted-foreground">Job #{jobId}</p>
            </div>
            <div className="flex items-center gap-1.5 text-warning">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Expires in {expiresIn}</span>
            </div>
          </div>

          {/* Option selector tabs */}
          <div className="flex gap-2">
            {MOCK_OPTIONS.map((opt) => {
              const qs = QUALITY_STYLES[opt.partQuality];
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedOption(opt.id)}
                  className={`flex-1 rounded-xl border p-3 text-left transition-all relative ${
                    selectedOption === opt.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  {opt.recommended && (
                    <Badge className="absolute -top-2 left-2 text-[9px] bg-primary text-primary-foreground px-1.5 py-0 gap-0.5">
                      <Star className="w-2.5 h-2.5" /> Best
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-[10px] mb-1.5 ${qs.className}`}>{qs.label}</Badge>
                  <p className="text-base font-bold text-foreground">LKR {opt.total.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{opt.warranty.split("·")[0]}</p>
                </button>
              );
            })}
          </div>

          {/* Itemized quote */}
          <div className="bg-card rounded-xl border p-5 space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Itemized Breakdown</h3>
            <div className="space-y-2">
              {activeOption.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.description}</span>
                  <span className="font-medium text-foreground">LKR {item.amount.toLocaleString()}</span>
                </div>
              ))}
              {activeOption.additionalWork > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Additional work</span>
                  <span className="font-medium text-foreground">LKR {activeOption.additionalWork.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-2 mt-2">
                <span className="text-foreground">Total</span>
                <span className="text-primary">LKR {activeOption.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Warranty & completion */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span className="text-xs font-medium text-foreground">Warranty</span>
              </div>
              <p className="text-xs text-muted-foreground">{activeOption.warranty}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Completion</span>
              </div>
              <p className="text-xs text-muted-foreground">{activeOption.completionEstimate}</p>
            </div>
          </div>

          {/* Trust guarantee */}
          <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">No additional work</span> will proceed without your approval. Payment only after successful completion.
            </p>
          </div>

          {/* Actions */}
          {status === "pending" && (
            <div className="space-y-3">
              <Button onClick={handleApprove} size="lg" className="w-full gap-2">
                <CheckCircle2 className="w-4 h-4" /> Approve Quote — LKR {activeOption.total.toLocaleString()}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleReject} className="gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Reject
                </Button>
                <Button variant="outline" onClick={() => {
                  const el = document.getElementById("question-input");
                  el?.focus();
                }} className="gap-1.5">
                  <HelpCircle className="w-4 h-4" /> Ask Question
                </Button>
              </div>

              {/* Question input */}
              <div className="bg-card rounded-xl border p-4 space-y-3">
                <label className="text-sm font-medium text-foreground">Have a question about this quote?</label>
                <textarea
                  id="question-input"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full bg-background border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none h-20"
                />
                {questionText.trim() && (
                  <Button onClick={handleAskQuestion} size="sm" variant="secondary" className="gap-1.5">
                    Send Question <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {status === "rejected" && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 text-center space-y-3">
              <p className="font-medium text-foreground">Quote Rejected</p>
              <p className="text-sm text-muted-foreground">LankaFix support will contact you to discuss alternatives.</p>
              <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
            </div>
          )}

          {status === "question" && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center space-y-3">
              <p className="font-medium text-foreground">Question Sent</p>
              <p className="text-sm text-muted-foreground">The technician will respond shortly. You'll be notified via SMS.</p>
              <Button onClick={() => setStatus("pending")} variant="outline">Back to Quote</Button>
            </div>
          )}

          {/* Support */}
          <div className="flex gap-2">
            <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-xl py-2.5 text-xs text-muted-foreground hover:border-primary/30 transition-colors">
              <Phone className="w-3.5 h-3.5" /> Call LankaFix
            </a>
            <a href={whatsappLink(SUPPORT_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-xl py-2.5 text-xs text-muted-foreground hover:border-primary/30 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default V2QuoteApprovalPage;
