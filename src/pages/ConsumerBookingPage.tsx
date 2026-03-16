import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import CategorySelectionStep from "@/components/booking/CategorySelectionStep";
import IssueSelectionStep from "@/components/booking/IssueSelectionStep";
import PhotoUploadStep from "@/components/booking/PhotoUploadStep";
import DescriptionStep from "@/components/booking/DescriptionStep";
import BookingConfirmationStep from "@/components/booking/BookingConfirmationStep";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

type Step = "category" | "issue" | "photos" | "description" | "confirm";

const STEPS: Step[] = ["category", "issue", "photos", "description", "confirm"];
const STEP_LABELS: Record<Step, string> = {
  category: "Service",
  issue: "Issue",
  photos: "Photos",
  description: "Details",
  confirm: "Confirm",
};

const ConsumerBookingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [categoryCode, setCategoryCode] = useState("");
  const [issueType, setIssueType] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const currentStep = STEPS[stepIndex];
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case "category": return !!categoryCode;
      case "issue": return !!issueType;
      case "photos": return true; // optional
      case "description": return true; // optional
      default: return false;
    }
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      track("consumer_booking_step", { step: STEPS[stepIndex + 1] });
    }
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
    else navigate("/");
  };

  const submitBooking = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to create a booking.", variant: "destructive" });
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          category_code: categoryCode,
          service_type: issueType,
          notes: description || null,
          photos: photos.length > 0 ? photos : [],
          status: "requested",
          booking_source: "consumer_flow",
        })
        .select("id")
        .single();

      if (error) throw error;

      setBookingId(data.id);
      setStepIndex(STEPS.indexOf("confirm"));
      track("consumer_booking_created", { categoryCode, issueType, photoCount: photos.length });
      toast({ title: "Booking created!", description: "We'll find you a technician shortly." });
    } catch (err: any) {
      console.error("Booking failed:", err);
      toast({ title: "Booking failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep === "description") {
      submitBooking();
    } else {
      goNext();
    }
  };

  // If already confirmed, show confirmation
  if (currentStep === "confirm" && bookingId) {
    return (
      <PageTransition className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-lg py-8 px-4">
          <BookingConfirmationStep
            bookingId={bookingId}
            categoryCode={categoryCode}
            issueType={issueType}
            status="requested"
          />
        </main>
        <Footer />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Progress stepper */}
        <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border/40">
          <div className="container max-w-lg py-3 px-4">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={goBack}
                className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </button>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Book a Service</p>
                <p className="text-[11px] text-muted-foreground">{STEP_LABELS[currentStep]}</p>
              </div>
              <div className="flex items-center gap-1 bg-primary/10 rounded-full px-2.5 py-1">
                <span className="text-xs font-bold text-primary">{stepIndex + 1}</span>
                <span className="text-[10px] text-primary/60">/{STEPS.length}</span>
              </div>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            {/* Step dots */}
            <div className="flex items-center justify-between mt-2 px-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-col items-center gap-0.5">
                  <div className={`transition-all duration-300 ${
                    i < stepIndex
                      ? "w-2.5 h-2.5 rounded-full bg-primary"
                      : i === stepIndex
                      ? "w-3 h-3 rounded-full bg-primary ring-2 ring-primary/20"
                      : "w-2 h-2 rounded-full bg-muted-foreground/15"
                  }`} />
                  <span className={`text-[9px] leading-none mt-0.5 ${
                    i === stepIndex ? "text-primary font-semibold" : i < stepIndex ? "text-primary/70" : "text-muted-foreground/50"
                  }`}>{STEP_LABELS[s]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="container max-w-lg py-5 px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {currentStep === "category" && (
                <CategorySelectionStep
                  selected={categoryCode}
                  onSelect={(code) => {
                    setCategoryCode(code);
                    setIssueType(""); // reset issue when category changes
                    goNext();
                  }}
                />
              )}
              {currentStep === "issue" && (
                <IssueSelectionStep
                  categoryCode={categoryCode}
                  selected={issueType}
                  onSelect={(id) => {
                    setIssueType(id);
                    goNext();
                  }}
                />
              )}
              {currentStep === "photos" && (
                <PhotoUploadStep
                  photos={photos}
                  onPhotosChange={setPhotos}
                  userId={user?.id}
                />
              )}
              {currentStep === "description" && (
                <DescriptionStep
                  description={description}
                  onChange={setDescription}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom action bar for photos & description steps */}
        {(currentStep === "photos" || currentStep === "description") && (
          <div className="sticky bottom-0 bg-card/90 backdrop-blur-xl border-t border-border/40 p-4">
            <div className="container max-w-lg">
              <Button
                onClick={handleNext}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating Booking…</>
                ) : currentStep === "description" ? (
                  <>Confirm Booking <ArrowRight className="w-4 h-4 ml-1.5" /></>
                ) : (
                  <>Continue <ArrowRight className="w-4 h-4 ml-1.5" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
      {stepIndex === 0 && <Footer />}
    </PageTransition>
  );
};

export default ConsumerBookingPage;
