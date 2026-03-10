import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, Loader2, ArrowRight, AlertTriangle, CheckCircle2, Search, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";

interface DetectedIssue {
  issue: string;
  confidence: number;
  severity: "high" | "medium" | "low";
  description: string;
}

interface PhotoDiagnosisResult {
  detected_issues: DetectedIssue[];
  category_code: string;
  category_name: string;
  recommended_service: string;
  recommended_service_name: string;
  overall_confidence: number;
  urgency: string;
  estimated_price_range: string;
  booking_path: string;
  inspection_recommended: boolean;
  additional_notes: string;
  self_fix_possible: boolean;
  self_fix_tip: string | null;
}

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-photo-diagnose`;

const AIPhotoDiagnosis = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PhotoDiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const analyzePh = async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);
    setError(null);
    track("ai_photo_diagnose_start", { hasDescription: !!description });

    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          description: description || undefined,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data: PhotoDiagnosisResult = await resp.json();
      setResult(data);
      track("ai_photo_diagnose_complete", { category: data.category_code, confidence: data.overall_confidence });
    } catch (e: any) {
      setError(e.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    setDescription("");
  };

  const severityColor = (s: string) => {
    if (s === "high") return "text-destructive";
    if (s === "medium") return "text-warning";
    return "text-success";
  };

  const urgencyBadge = (u: string) => {
    if (u === "high") return "destructive" as const;
    if (u === "medium") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <section className="py-10 md:py-14">
      <div className="container max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
            <Camera className="w-3.5 h-3.5" />
            AI Photo Diagnosis
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Snap a Photo, Get a Diagnosis
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Upload a photo of your broken device or system — our AI identifies the issue and recommends the right service.
          </p>
        </div>

        {/* Upload area */}
        {!imagePreview ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-dashed border-border/60 rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-smooth"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Drop an image here or tap to upload
            </p>
            <p className="text-xs text-muted-foreground">
              Photos of phones, ACs, solar panels, electrical panels, etc.
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Camera className="w-3.5 h-3.5" />
                Take Photo
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Upload className="w-3.5 h-3.5" />
                Upload
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Image preview */}
            <div className="relative rounded-2xl overflow-hidden border border-border/40">
              <img src={imagePreview} alt="Uploaded" className="w-full max-h-80 object-contain bg-muted/30" />
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center border border-border/40 hover:bg-destructive/10 transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
              {isAnalyzing && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm font-semibold text-foreground">Analyzing image...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description input */}
            {!result && (
              <>
                <Textarea
                  placeholder="Optional: describe what's wrong (e.g., 'phone fell on concrete')"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={2}
                />
                <Button
                  onClick={analyzePh}
                  disabled={isAnalyzing}
                  className="w-full rounded-xl h-12 bg-gradient-brand text-primary-foreground font-bold gap-2"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
                </Button>
              </>
            )}

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Analysis Failed</p>
                  <p className="text-xs text-destructive/80 mt-1">{error}</p>
                  <Button size="sm" variant="outline" className="mt-2 rounded-lg" onClick={analyzePh}>
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* AI Recommendation header */}
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Recommendation</span>
                    <Badge variant={urgencyBadge(result.urgency)} className="ml-auto text-[10px]">
                      {result.urgency} urgency
                    </Badge>
                  </div>

                  {/* Detected issues */}
                  <div className="bg-card rounded-2xl border border-border/40 p-5 space-y-3" style={{ boxShadow: "var(--shadow-lg)" }}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detected Issues</p>
                    {result.detected_issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${issue.severity === "high" ? "bg-destructive" : issue.severity === "medium" ? "bg-warning" : "bg-success"}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{issue.issue}</p>
                            <span className={`text-[10px] font-bold ${severityColor(issue.severity)}`}>
                              {issue.confidence}% match
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommended service card */}
                  <div className="bg-card rounded-2xl border border-primary/20 p-5" style={{ boxShadow: "var(--shadow-lg)" }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{result.recommended_service_name}</p>
                        <p className="text-xs text-muted-foreground">{result.category_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{result.estimated_price_range}</p>
                        <p className="text-[10px] text-muted-foreground">est. range</p>
                      </div>
                    </div>

                    {/* Confidence ring */}
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 mb-4">
                      <div className="relative w-12 h-12">
                        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15.5" fill="none"
                            stroke="hsl(var(--primary))" strokeWidth="3"
                            strokeDasharray={`${result.overall_confidence} ${100 - result.overall_confidence}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                          {result.overall_confidence}%
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">AI Confidence</p>
                        <p className="text-[10px] text-muted-foreground">
                          {result.overall_confidence >= 80 ? "High confidence — direct booking recommended" :
                           result.overall_confidence >= 50 ? "Moderate — inspection may be needed" :
                           "Low confidence — inspection recommended"}
                        </p>
                      </div>
                    </div>

                    {result.additional_notes && (
                      <p className="text-xs text-muted-foreground mb-4">{result.additional_notes}</p>
                    )}

                    {result.self_fix_possible && result.self_fix_tip && (
                      <div className="p-3 rounded-xl bg-success/10 border border-success/20 mb-4">
                        <p className="text-xs font-semibold text-success flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Self-Fix Tip
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{result.self_fix_tip}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        className="flex-1 rounded-xl h-11 bg-gradient-brand text-primary-foreground font-bold gap-2"
                        onClick={() => {
                          track("ai_photo_book_service", { category: result.category_code, service: result.recommended_service });
                          navigate(`/book/${result.category_code.toLowerCase()}`);
                        }}
                      >
                        {result.inspection_recommended ? "Book Inspection" : "Book Service"}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl h-11"
                        onClick={clearImage}
                      >
                        New Photo
                      </Button>
                    </div>
                  </div>

                  {/* Trust footer */}
                  <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                    <ShieldCheck className="w-3 h-3" />
                    <span>AI recommendation · Final diagnosis by verified technician</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default AIPhotoDiagnosis;
