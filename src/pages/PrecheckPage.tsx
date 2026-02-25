import { useParams, Link, useNavigate } from "react-router-dom";
import { getServiceByCode, getCategoryByCode } from "@/data/categories";
import { useBookingStore } from "@/store/bookingStore";
import { COLOMBO_ZONES, isOutOfZone } from "@/data/colomboZones";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, AlertTriangle, MapPin } from "lucide-react";
import { useState, useMemo } from "react";

const TIME_SLOTS = ["8:00 AM – 10:00 AM", "10:00 AM – 12:00 PM", "12:00 PM – 2:00 PM", "2:00 PM – 4:00 PM", "4:00 PM – 6:00 PM"];
const PREFERRED_WINDOWS = ["Morning (8 AM – 12 PM)", "Afternoon (12 PM – 4 PM)", "Evening (4 PM – 7 PM)"];

const PrecheckPage = () => {
  const { catCode, svcCode } = useParams<{ catCode: string; svcCode: string }>();
  const navigate = useNavigate();
  const { draft, setDraftPrecheckAnswer, setDraftSchedule, setDraftLocation } = useBookingStore();
  const category = getCategoryByCode(catCode || "");
  const service = getServiceByCode(catCode || "", svcCode || "");
  const [zone, setZone] = useState(draft.zone);
  const [address, setAddress] = useState(draft.address);
  const [date, setDate] = useState(draft.scheduledDate);
  const [time, setTime] = useState(draft.scheduledTime);
  const [preferredWindow, setPreferredWindow] = useState(draft.preferredWindow || "");
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [confirmQuote, setConfirmQuote] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>(draft.precheckAnswers);
  const isInspectionFirst = service?.requiresQuote || false;
  const outOfZone = useMemo(() => isOutOfZone(address), [address]);

  if (!category || !service) {
    return (<div className="min-h-screen flex flex-col"><Header /><main className="flex-1 flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-foreground mb-2">Service Not Found</h1><Button asChild variant="outline"><Link to="/categories">View All Categories</Link></Button></div></main><Footer /></div>);
  }

  const handleAnswer = (key: string, value: string | boolean) => { setAnswers((prev) => ({ ...prev, [key]: value })); setDraftPrecheckAnswer(key, value); };
  const requiredComplete = service.precheckQuestions.filter((q) => q.required).every((q) => answers[q.key] !== undefined && answers[q.key] !== "");
  const scheduleComplete = isInspectionFirst ? !!(date && preferredWindow) : !!(date && time);
  const locationComplete = !!(zone && address) && !outOfZone;
  const canProceed = requiredComplete && scheduleComplete && locationComplete && confirmAccurate;

  const handleContinue = () => { setDraftLocation(zone, address); setDraftSchedule(date, time, preferredWindow); navigate(`/pricing/${catCode}/${svcCode}`); };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to={`/category/${catCode}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to {category.name}</Link>
          <div className="mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Step 1 of 2</p>
            <h1 className="text-2xl font-bold text-foreground">{service.name}</h1>
            <p className="text-sm text-muted-foreground">{category.name} • Pre-check & Schedule</p>
          </div>
          <div className="space-y-4 mb-6">
            {service.precheckQuestions.map((q) => (
              <div key={q.key} className="bg-card rounded-xl border p-5">
                <label className="text-sm font-medium text-foreground mb-3 block">{q.question} {q.required && <span className="text-destructive">*</span>}</label>
                {q.inputType === "boolean" && (
                  <div className="flex gap-2">
                    {["Yes", "No"].map((opt) => { const val = opt === "Yes"; return (<button key={opt} onClick={() => handleAnswer(q.key, val)} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${answers[q.key] === val ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:border-primary/30"}`}>{opt}</button>); })}
                  </div>
                )}
                {q.inputType === "single_select" && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (<button key={opt.value} onClick={() => handleAnswer(q.key, opt.value)} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${answers[q.key] === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:border-primary/30"}`}>{opt.label}</button>))}
                  </div>
                )}
                {q.inputType === "text" && (<input type="text" value={(answers[q.key] as string) || ""} onChange={(e) => handleAnswer(q.key, e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Type your answer..." />)}
              </div>
            ))}
          </div>
          <div className="bg-card rounded-xl border p-5 mb-6">
            <label className="text-sm font-medium text-foreground mb-3 block">Upload Photos (Optional)</label>
            <p className="text-xs text-muted-foreground mb-3">Upload photos for faster diagnosis</p>
            <div className="flex gap-2"><div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground cursor-pointer hover:border-primary/30 transition-colors"><Upload className="w-5 h-5" /></div></div>
          </div>
          <div className="bg-card rounded-xl border p-5 mb-6">
            <label className="text-sm font-medium text-foreground mb-3 block">{isInspectionFirst ? "Preferred Inspection Date" : "Preferred Date & Time"} <span className="text-destructive">*</span></label>
            {isInspectionFirst && <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mb-3">⚠ This service requires an inspection before final quotation. Inspection within 24–48 hours.</p>}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {isInspectionFirst ? (
              <div className="flex flex-wrap gap-2">{PREFERRED_WINDOWS.map((w) => (<button key={w} onClick={() => setPreferredWindow(w)} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${preferredWindow === w ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:border-primary/30"}`}>{w}</button>))}</div>
            ) : (
              <div className="flex flex-wrap gap-2">{TIME_SLOTS.map((slot) => (<button key={slot} onClick={() => setTime(slot)} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${time === slot ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:border-primary/30"}`}>{slot}</button>))}</div>
            )}
          </div>
          <div className="bg-card rounded-xl border p-5 mb-6">
            <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> Service Location <span className="text-destructive">*</span></label>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Select Zone</option>
              {COLOMBO_ZONES.map((z) => (<option key={z} value={z}>{z}</option>))}
            </select>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address (street, apartment, landmarks)" className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {outOfZone && (
              <div className="mt-3 bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div><p className="text-sm font-medium text-warning">Outside service area</p><p className="text-xs text-muted-foreground">We currently serve Greater Colombo only. <Link to="/waitlist" className="text-primary underline">Join the waitlist</Link></p></div>
              </div>
            )}
          </div>
          <div className="space-y-3 mb-6">
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={confirmAccurate} onChange={(e) => setConfirmAccurate(e.target.checked)} className="mt-0.5 accent-primary" /><span className="text-sm text-foreground">I confirm the details above are accurate</span></label>
            {service.requiresQuote && <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={confirmQuote} onChange={(e) => setConfirmQuote(e.target.checked)} className="mt-0.5 accent-primary" /><span className="text-sm text-foreground">I understand the final quote may change after inspection</span></label>}
          </div>
          <Button variant="hero" size="xl" className="w-full" disabled={!canProceed} onClick={handleContinue}>Continue to Pricing</Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrecheckPage;
