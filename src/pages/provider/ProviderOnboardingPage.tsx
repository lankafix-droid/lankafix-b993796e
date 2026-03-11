import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  useProviderOnboardingStore,
  ONBOARDING_STEPS,
  PROVIDER_TYPE_OPTIONS,
  DOCUMENT_TYPES,
  TOOL_OPTIONS,
  SPECIALIZATION_OPTIONS,
  WEEKDAYS,
  BANKS,
  TIER_CONFIG,
} from "@/store/providerOnboardingStore";
import { categories } from "@/data/categories";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import {
  ArrowLeft, ArrowRight, Building2, User, Wrench, MapPin, Award,
  FileCheck, Hammer, Clock, Landmark, CheckCircle, Camera, Phone,
  Shield, Star, Send, BookOpen, Scale, Loader2, Sparkles, TrendingUp,
  Zap, Heart, BarChart3, LogIn, Upload, X, AlertTriangle,
} from "lucide-react";

export default function ProviderOnboardingPage() {
  const store = useProviderOnboardingStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [existingPartnerId, setExistingPartnerId] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const step = ONBOARDING_STEPS[store.currentStep];
  const progress = ((store.currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  // Check auth state and existing partner on mount — full prefill
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      setAuthChecked(true);
      if (u) {
        // Check if partner already exists for this user
        const { data } = await supabase
          .from("partners")
          .select("*")
          .eq("user_id", u.id)
          .maybeSingle();
        if (data) {
          setExistingPartnerId(data.id);
          // Full prefill from existing record
          if (!store.profile.fullName && data.full_name) {
            store.updateProfile({
              fullName: data.full_name,
              businessName: data.business_name || "",
              mobileNumber: data.phone_number || "",
              email: data.email || "",
              nicNumber: data.nic_number || "",
              providerType: (data.provider_type as any) || "individual",
              serviceCategories: (data.categories_supported || []) as any,
              specializations: (data.specializations || []) as string[],
              serviceZones: data.service_zones || [],
              yearsOfExperience: data.experience_years || 0,
              previousCompany: data.previous_company || "",
              emergencyAvailable: data.emergency_available || false,
              profilePhotoUrl: data.profile_photo_url || "",
              tools: (data.tools_declared || []) as string[],
            });
          }

          // Prefill schedule
          const { data: sched } = await supabase
            .from("partner_schedules")
            .select("working_days, start_time, end_time, emergency_available")
            .eq("partner_id", data.id)
            .maybeSingle();
          if (sched && !store.profile.fullName) {
            store.updateProfile({
              availabilityDays: (sched.working_days as string[]) || [],
              availabilityStart: sched.start_time || "08:00",
              availabilityEnd: sched.end_time || "19:00",
              emergencyAvailable: sched.emergency_available || false,
            });
          }

          // Prefill bank
          const { data: bank } = await supabase
            .from("partner_bank_accounts")
            .select("bank_name, account_holder_name, account_number, branch")
            .eq("partner_id", data.id)
            .maybeSingle();
          if (bank && !store.profile.fullName) {
            store.updateProfile({
              bankName: bank.bank_name || "",
              accountHolderName: bank.account_holder_name || "",
              accountNumber: bank.account_number || "",
              branch: bank.branch || "",
            });
          }

          // Prefill documents from DB
          const { data: docs } = await supabase
            .from("partner_documents")
            .select("document_type, file_url, verification_status")
            .eq("partner_id", data.id);
          if (docs && docs.length > 0 && store.profile.documents.length === 0) {
            const mappedDocs = docs.map((d: any) => ({
              type: d.document_type as any,
              fileName: `${d.document_type} (uploaded)`,
              uploadedAt: new Date().toISOString(),
              fileUrl: d.file_url,
              verificationStatus: d.verification_status,
            }));
            store.updateProfile({ documents: mappedDocs });
          }

          // Prefill conduct/training acceptance state
          const { data: acceptances } = await supabase
            .from("policy_acceptances")
            .select("policy_type")
            .eq("partner_id", data.id);
          if (acceptances) {
            if (acceptances.some((a: any) => a.policy_type === "code_of_conduct")) {
              store.acceptConduct();
            }
            if (acceptances.some((a: any) => a.policy_type === "provider_training")) {
              store.completeTraining();
            }
          }
        }
      }
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) setShowAuthPrompt(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    const { profile, conductAccepted, trainingCompleted } = store;

    // Require authentication
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      setShowAuthPrompt(true);
      toast({ title: "Authentication Required", description: "Please sign in or create an account to submit your application.", variant: "destructive" });
      return;
    }

    // Validation
    if (!profile.fullName.trim()) {
      toast({ title: "Missing required field", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (!profile.mobileNumber.trim() || profile.mobileNumber.length < 10) {
      toast({ title: "Missing required field", description: "Please enter a valid mobile number.", variant: "destructive" });
      return;
    }
    if (profile.serviceCategories.length === 0) {
      toast({ title: "Missing required field", description: "Please select at least one service category.", variant: "destructive" });
      return;
    }
    if (profile.serviceZones.length === 0) {
      toast({ title: "Missing required field", description: "Please select at least one service zone.", variant: "destructive" });
      return;
    }
    if (!conductAccepted) {
      toast({ title: "Code of Conduct", description: "Please accept the Code of Conduct to proceed.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Build business name properly
      let businessName: string | null = null;
      if (profile.providerType !== "individual") {
        businessName = profile.businessName?.trim() || (profile.fullName.trim() + " Services");
      }

      const partnerRecord = {
        full_name: profile.fullName.trim(),
        business_name: businessName,
        phone_number: profile.mobileNumber.trim(),
        email: profile.email.trim() || null,
        nic_number: profile.nicNumber.trim() || null,
        categories_supported: profile.serviceCategories,
        specializations: profile.specializations,
        brand_specializations: [],
        service_zones: profile.serviceZones,
        experience_years: profile.yearsOfExperience,
        previous_company: profile.previousCompany.trim() || null,
        emergency_available: profile.emergencyAvailable,
        verification_status: "pending" as const,
        availability_status: "offline" as const,
        profile_photo_url: profile.profilePhotoUrl || null,
        user_id: currentUser.id,
        provider_type: profile.providerType || "individual",
        tools_declared: profile.tools,
        vehicle_type: "motorcycle",
        max_jobs_per_day: 5,
        max_concurrent_jobs: 1,
      };

      let partnerId: string;

      if (existingPartnerId) {
        // UPDATE existing record (upsert behavior)
        const { data, error } = await supabase
          .from("partners")
          .update(partnerRecord)
          .eq("id", existingPartnerId)
          .select("id")
          .single();
        if (error) throw error;
        partnerId = data.id;
      } else {
        // INSERT new record
        const { data, error } = await supabase
          .from("partners")
          .insert(partnerRecord)
          .select("id")
          .single();
        if (error) throw error;
        partnerId = data.id;
      }

      // Save availability schedule
      const scheduleRecord = {
        partner_id: partnerId,
        working_days: profile.availabilityDays,
        start_time: profile.availabilityStart,
        end_time: profile.availabilityEnd,
        emergency_available: profile.emergencyAvailable,
      };
      await supabase
        .from("partner_schedules")
        .upsert(scheduleRecord, { onConflict: "partner_id" });

      // Save bank details if provided
      if (profile.bankName && profile.accountNumber && profile.accountHolderName) {
        const bankRecord = {
          partner_id: partnerId,
          bank_name: profile.bankName,
          account_holder_name: profile.accountHolderName,
          account_number: profile.accountNumber,
          branch: profile.branch || null,
        };
        await supabase
          .from("partner_bank_accounts")
          .upsert(bankRecord, { onConflict: "partner_id" });
      }

      // Save conduct acceptance
      if (conductAccepted) {
        await supabase.from("policy_acceptances").upsert({
          partner_id: partnerId,
          policy_type: "code_of_conduct",
          policy_version: "1.0",
          accepted_at: new Date().toISOString(),
          user_id: currentUser.id,
          source_screen: "provider_onboarding",
        }, { onConflict: "partner_id,policy_type" });
      }

      // Save training acceptance
      if (trainingCompleted) {
        await supabase.from("policy_acceptances").upsert({
          partner_id: partnerId,
          policy_type: "provider_training",
          policy_version: "1.0",
          accepted_at: new Date().toISOString(),
          user_id: currentUser.id,
          source_screen: "provider_onboarding",
        }, { onConflict: "partner_id,policy_type" });
      }

      // Save document references — use partner_id + document_type uniqueness
      for (const doc of profile.documents) {
        if (doc.fileUrl) {
          await supabase.from("partner_documents").upsert({
            partner_id: partnerId,
            document_type: doc.type,
            file_url: doc.fileUrl,
            verification_status: "pending",
          }, { onConflict: "partner_id,document_type" }).select();
        }
      }

      store.submitApplication();

      toast({
        title: "Application Submitted! 🎉",
        description: existingPartnerId
          ? "Your partner profile has been updated. We'll review changes within 24–48 hours."
          : "Your partner record has been created. We'll review your profile within 24–48 hours.",
      });
      navigate("/partner");
    } catch (err: any) {
      console.error("Onboarding submission error:", err);
      const msg = err?.message?.includes("partners_user_id_unique")
        ? "You already have a partner profile. Redirecting to your dashboard..."
        : err?.message || "Could not save your application. Please try again.";
      
      if (err?.message?.includes("partners_user_id_unique")) {
        navigate("/partner");
        return;
      }
      
      toast({ title: "Submission Failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold">Join LankaFix</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">
            {existingPartnerId ? "Update your provider application" : "Become a verified service provider"}
          </p>
        </div>
      </div>

      {/* Auth Warning */}
      {authChecked && !user && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-3 flex items-center gap-3">
              <LogIn className="w-5 h-5 text-warning shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Sign in required</p>
                <p className="text-xs text-muted-foreground">You'll need an account to submit your application</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate("/account")}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Existing partner resume banner */}
      {existingPartnerId && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Existing application found</p>
                <p className="text-xs text-muted-foreground">Your changes will update your existing partner profile</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Step {store.currentStep + 1} of {ONBOARDING_STEPS.length}
          </span>
          <span className="text-sm font-semibold text-primary">{step.label}</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-3">
          {ONBOARDING_STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => i <= store.currentStep && store.setStep(i)}
              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                i === store.currentStep
                  ? "bg-primary text-primary-foreground shadow-md"
                  : i < store.currentStep
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pb-32">
        {step.key === "provider_type" && <StepProviderType />}
        {step.key === "basic_profile" && <StepBasicProfile />}
        {step.key === "service_categories" && <StepCategories />}
        {step.key === "service_area" && <StepServiceArea />}
        {step.key === "experience" && <StepExperience />}
        {step.key === "documents" && <StepDocuments />}
        {step.key === "tools" && <StepTools />}
        {step.key === "availability" && <StepAvailability />}
        {step.key === "bank_account" && <StepBankAccount />}
        {step.key === "review" && <StepReview />}
      </div>

      {/* Auth prompt modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="max-w-sm mx-4 w-full">
            <CardContent className="p-6 text-center space-y-4">
              <LogIn className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-lg font-bold text-foreground">Sign In Required</h2>
              <p className="text-sm text-muted-foreground">
                To submit your provider application, please sign in or create an account first.
                Your progress will be saved.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAuthPrompt(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => navigate("/account")}>
                  <LogIn className="w-4 h-4 mr-1" /> Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {store.currentStep > 0 && (
            <Button variant="outline" onClick={store.prevStep} className="flex-1" disabled={isSubmitting}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step.key === "review" ? (
            <Button
              className="flex-1"
              disabled={!store.conductAccepted || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="w-4 h-4 mr-1" /> {existingPartnerId ? "Update Application" : "Submit Application"}</>
              )}
            </Button>
          ) : (
            <Button onClick={store.nextStep} className="flex-1">
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Provider Benefits Pitch ──────────────────────────────────────────

function ProviderBenefitsPitch() {
  const benefits = [
    { icon: Zap, label: "Structured Job Pipeline", desc: "No more chasing leads on WhatsApp — get real bookings sent to you" },
    { icon: Shield, label: "Verified Identity", desc: "Build a trusted marketplace profile customers can rely on" },
    { icon: BarChart3, label: "Digital Quote Support", desc: "Professional quoting tools that reduce disputes" },
    { icon: Heart, label: "Repeat Booking Potential", desc: "Customers can rebook you directly through the platform" },
    { icon: MapPin, label: "Zone-Based Growth", desc: "Grow your reputation in your local service areas" },
    { icon: TrendingUp, label: "Merit-Based Ranking", desc: "Better work = more visibility = more jobs" },
    { icon: Star, label: "Customer Trust", desc: "LankaFix guarantee gives customers confidence to book you" },
    { icon: Sparkles, label: "Operational Visibility", desc: "Track jobs, earnings, and performance in one place" },
  ];

  return (
    <Card className="bg-primary/5 border-primary/20 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Why Join LankaFix?
        </CardTitle>
        <CardDescription className="text-xs">
          Stop relying only on WhatsApp, Facebook & referrals. Build a professional service business.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          {benefits.map((b) => (
            <div key={b.label} className="flex items-start gap-2 text-xs">
              <b.icon className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">{b.label}</span>
                <span className="text-muted-foreground"> — {b.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step Components ────────────────────────────────────────────────

function StepProviderType() {
  const { profile, updateProfile } = useProviderOnboardingStore();
  return (
    <div className="space-y-3">
      <ProviderBenefitsPitch />
      <h2 className="text-lg font-bold text-foreground">What type of provider are you?</h2>
      {PROVIDER_TYPE_OPTIONS.map((opt) => (
        <Card
          key={opt.value}
          className={`cursor-pointer transition-all ${
            profile.providerType === opt.value ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/30"
          }`}
          onClick={() => updateProfile({ providerType: opt.value })}
        >
          <CardContent className="p-4 flex items-start gap-3">
            <Building2 className={`w-5 h-5 mt-0.5 ${profile.providerType === opt.value ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-semibold text-foreground">{opt.label}</p>
              <p className="text-sm text-muted-foreground">{opt.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StepBasicProfile() {
  const { profile, updateProfile } = useProviderOnboardingStore();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const showBusinessName = profile.providerType && profile.providerType !== "individual";

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB for profile photo", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "anon";
      const ext = file.name.split(".").pop();
      const path = `${userId}/profile-photo.${ext}`;
      
      const { error } = await supabase.storage.from("partner-uploads").upload(path, file, { upsert: true });
      if (error) throw error;
      
      // Private bucket: use signed URL for preview; store the path for later signed-URL generation
      const { data: signedData } = await supabase.storage.from("partner-uploads").createSignedUrl(path, 3600);
      updateProfile({ profilePhotoUrl: signedData?.signedUrl || path });
      toast({ title: "Photo uploaded!" });
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast({ title: "Upload failed", description: "Please sign in first to upload photos, or try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Basic Profile</h2>
      <div className="space-y-3">
        <div>
          <Label>Full Name *</Label>
          <Input placeholder="e.g. Kasun Perera" value={profile.fullName} onChange={(e) => updateProfile({ fullName: e.target.value })} />
        </div>

        {showBusinessName && (
          <div>
            <Label>Business Name *</Label>
            <Input
              placeholder="e.g. CoolTech AC Solutions"
              value={profile.businessName}
              onChange={(e) => updateProfile({ businessName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">Your business name as it appears to customers</p>
          </div>
        )}

        <div>
          <Label>Mobile Number *</Label>
          <div className="flex gap-2">
            <Input
              placeholder="07X XXX XXXX"
              value={profile.mobileNumber}
              onChange={(e) => updateProfile({ mobileNumber: e.target.value })}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <Phone className="w-3 h-3 inline mr-1" />
            Phone will be verified during onboarding review
          </p>
        </div>

        <div>
          <Label>Email (Optional)</Label>
          <Input type="email" placeholder="email@example.com" value={profile.email} onChange={(e) => updateProfile({ email: e.target.value })} />
        </div>
        <div>
          <Label>NIC Number *</Label>
          <Input placeholder="e.g. 200012345678" value={profile.nicNumber} onChange={(e) => updateProfile({ nicNumber: e.target.value })} />
        </div>
        <div>
          <Label>Profile Photo</Label>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {profile.profilePhotoUrl ? (
                <img src={profile.profilePhotoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </span>
                </Button>
              </label>
              {profile.profilePhotoUrl && (
                <Button variant="ghost" size="sm" className="text-destructive ml-1" onClick={() => updateProfile({ profilePhotoUrl: "" })}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCategories() {
  const { profile, toggleCategory } = useProviderOnboardingStore();
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Select your service categories</h2>
      <p className="text-sm text-muted-foreground">Choose all categories you can service</p>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => {
          const selected = profile.serviceCategories.includes(cat.code);
          return (
            <Card
              key={cat.code}
              className={`cursor-pointer transition-all ${selected ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/30"}`}
              onClick={() => toggleCategory(cat.code)}
            >
              <CardContent className="p-3 text-center">
                <Wrench className={`w-5 h-5 mx-auto mb-1 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium text-foreground">{cat.name}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {profile.serviceCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {profile.serviceCategories.map((c) => (
            <Badge key={c} variant="secondary">{c}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function StepServiceArea() {
  const { profile, toggleZone } = useProviderOnboardingStore();
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Where do you serve?</h2>
      <p className="text-sm text-muted-foreground">Select all zones you can cover</p>
      <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
        {COLOMBO_ZONES_DATA.map((zone) => {
          const selected = profile.serviceZones.includes(zone.id);
          return (
            <button
              key={zone.id}
              onClick={() => toggleZone(zone.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                selected ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-foreground hover:border-primary/30"
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 inline mr-1 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              {zone.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{profile.serviceZones.length} zones selected</p>
    </div>
  );
}

function StepExperience() {
  const { profile, updateProfile, toggleSpecialization } = useProviderOnboardingStore();
  const relevantSpecs = profile.serviceCategories.flatMap((c) => SPECIALIZATION_OPTIONS[c] ?? []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Your Experience</h2>
      <div>
        <Label>Years of Experience *</Label>
        <Select
          value={String(profile.yearsOfExperience)}
          onValueChange={(v) => updateProfile({ yearsOfExperience: Number(v) })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 5, 7, 10, 15, 20].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}+ years</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Previous Company (Optional)</Label>
        <Input placeholder="e.g. Singer Service Center" value={profile.previousCompany} onChange={(e) => updateProfile({ previousCompany: e.target.value })} />
      </div>
      {relevantSpecs.length > 0 && (
        <div>
          <Label>Specializations</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {relevantSpecs.map((spec) => {
              const selected = profile.specializations.includes(spec);
              return (
                <button
                  key={spec}
                  onClick={() => toggleSpecialization(spec)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {spec}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StepDocuments() {
  const { profile, addDocument, removeDocument } = useProviderOnboardingStore();
  const { toast } = useToast();
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const handleDocUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB per document", variant: "destructive" });
      return;
    }
    setUploadingType(docType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "anon";
      const ext = file.name.split(".").pop();
      const path = `${userId}/docs/${docType}.${ext}`;

      const { error } = await supabase.storage.from("partner-uploads").upload(path, file, { upsert: true });
      if (error) throw error;

      // Private bucket: store the storage path; use signed URLs for viewing
      const storagePath = path;
      addDocument({
        type: docType as any,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        fileUrl: storagePath,
      });
      toast({ title: "Document uploaded securely!" });
    } catch (err: any) {
      console.error("Doc upload error:", err);
      toast({ title: "Upload failed", description: "Please sign in first, or try again.", variant: "destructive" });
    } finally {
      setUploadingType(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Verification Documents</h2>
      <p className="text-sm text-muted-foreground">Upload documents to get verified. NIC is mandatory.</p>
      {DOCUMENT_TYPES.map((doc) => {
        const uploaded = profile.documents.find((d) => d.type === doc.value);
        const isUploading = uploadingType === doc.value;
        return (
          <Card key={doc.value}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className={`w-5 h-5 ${uploaded ? "text-success" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {doc.label} {doc.required && <span className="text-destructive">*</span>}
                  </p>
                  {uploaded && (
                    <div>
                      <p className="text-xs text-success">✓ {uploaded.fileName}</p>
                      {uploaded.verificationStatus && (
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {uploaded.verificationStatus}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {uploaded ? (
                <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.value)} className="text-destructive">Remove</Button>
              ) : (
                <label className="cursor-pointer">
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleDocUpload(doc.value, e)} className="hidden" />
                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                    <span>
                      {isUploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                      {isUploading ? "..." : "Upload"}
                    </span>
                  </Button>
                </label>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StepTools() {
  const { profile, toggleTool } = useProviderOnboardingStore();
  const relevantTools = profile.serviceCategories.flatMap((c) => TOOL_OPTIONS[c] ?? []);
  const uniqueTools = [...new Set(relevantTools)];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Tools & Equipment</h2>
      <p className="text-sm text-muted-foreground">Select tools you currently own</p>
      {uniqueTools.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            <Hammer className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select service categories first to see relevant tools</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {uniqueTools.map((tool) => {
            const selected = profile.tools.includes(tool);
            return (
              <button
                key={tool}
                onClick={() => toggleTool(tool)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all flex items-center gap-3 ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
              >
                <Checkbox checked={selected} className="pointer-events-none" />
                <span className="text-foreground">{tool}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{profile.tools.length} tools selected</p>
    </div>
  );
}

function StepAvailability() {
  const { profile, updateProfile, toggleDay } = useProviderOnboardingStore();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Availability Schedule</h2>
      <div>
        <Label>Working Days</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {WEEKDAYS.map((day) => {
            const selected = profile.availabilityDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Start Time</Label>
          <Input type="time" value={profile.availabilityStart} onChange={(e) => updateProfile({ availabilityStart: e.target.value })} />
        </div>
        <div>
          <Label>End Time</Label>
          <Input type="time" value={profile.availabilityEnd} onChange={(e) => updateProfile({ availabilityEnd: e.target.value })} />
        </div>
      </div>
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div>
          <p className="text-sm font-medium text-foreground">Emergency Availability</p>
          <p className="text-xs text-muted-foreground">Accept jobs outside working hours</p>
        </div>
        <Switch checked={profile.emergencyAvailable} onCheckedChange={(v) => updateProfile({ emergencyAvailable: v })} />
      </div>
    </div>
  );
}

function StepBankAccount() {
  const { profile, updateProfile } = useProviderOnboardingStore();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Bank Account Details</h2>
      <p className="text-sm text-muted-foreground">Earnings will be transferred to this account</p>
      <Card className="border-warning/20 bg-warning/5">
        <CardContent className="p-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Bank details are stored securely and will be verified by our team before any payouts are processed.
          </p>
        </CardContent>
      </Card>
      <div>
        <Label>Bank Name *</Label>
        <Select value={profile.bankName} onValueChange={(v) => updateProfile({ bankName: v })}>
          <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
          <SelectContent>
            {BANKS.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Account Holder Name *</Label>
        <Input placeholder="As per bank records" value={profile.accountHolderName} onChange={(e) => updateProfile({ accountHolderName: e.target.value })} />
      </div>
      <div>
        <Label>Account Number *</Label>
        <Input placeholder="Enter account number" value={profile.accountNumber} onChange={(e) => updateProfile({ accountNumber: e.target.value })} />
      </div>
      <div>
        <Label>Branch *</Label>
        <Input placeholder="e.g. Colombo Main" value={profile.branch} onChange={(e) => updateProfile({ branch: e.target.value })} />
      </div>
    </div>
  );
}

function StepReview() {
  const { profile, conductAccepted, acceptConduct, trainingCompleted, completeTraining } = useProviderOnboardingStore();
  const providerLabel = PROVIDER_TYPE_OPTIONS.find((o) => o.value === profile.providerType)?.label ?? "—";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Review Your Application</h2>

      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium text-foreground">{providerLabel}</span></div>
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{profile.fullName || "—"}</span></div>
          {profile.businessName && (
            <div className="flex justify-between"><span className="text-muted-foreground">Business</span><span className="font-medium text-foreground">{profile.businessName}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Mobile</span><span className="font-medium text-foreground">{profile.mobileNumber || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium text-foreground">{profile.email || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">NIC</span><span className="font-medium text-foreground">{profile.nicNumber || "—"}</span></div>
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Categories</span><span className="font-medium text-foreground">{profile.serviceCategories.join(", ") || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Zones</span><span className="font-medium text-foreground">{profile.serviceZones.length} zones</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span className="font-medium text-foreground">{profile.yearsOfExperience}+ years</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Documents</span><span className="font-medium text-foreground">{profile.documents.length} uploaded</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tools</span><span className="font-medium text-foreground">{profile.tools.length} declared</span></div>
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-medium text-foreground">{profile.availabilityDays.length} days, {profile.availabilityStart}–{profile.availabilityEnd}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Emergency</span><span className="font-medium text-foreground">{profile.emergencyAvailable ? "Yes" : "No"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium text-foreground">{profile.bankName || "Not provided"}</span></div>
        </CardContent>
      </Card>

      {/* Training */}
      <Card className={trainingCompleted ? "border-success/30 bg-success/5" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className={`w-5 h-5 ${trainingCompleted ? "text-success" : "text-muted-foreground"}`} />
            <div>
              <p className="font-semibold text-foreground">Provider Guidelines</p>
              <p className="text-xs text-muted-foreground">Review customer service, safety & platform rules</p>
            </div>
          </div>
          {trainingCompleted ? (
            <Badge className="bg-success/10 text-success">✓ Guidelines Acknowledged</Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={completeTraining}>
              <BookOpen className="w-4 h-4 mr-1" /> Acknowledge Guidelines
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Code of Conduct */}
      <Card className={conductAccepted ? "border-success/30 bg-success/5" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Scale className={`w-5 h-5 mt-0.5 ${conductAccepted ? "text-success" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <p className="font-semibold text-foreground mb-2">Code of Conduct</p>
              <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                <li>• Do not request off-platform payments</li>
                <li>• Maintain professional behavior at all times</li>
                <li>• Respect customer property and privacy</li>
                <li>• Complete services as described in the booking</li>
                <li>• Follow LankaFix safety procedures</li>
              </ul>
              <button
                onClick={acceptConduct}
                className={`flex items-center gap-2 text-sm ${conductAccepted ? "text-success font-medium" : "text-primary"}`}
              >
                <Checkbox checked={conductAccepted} className="pointer-events-none" />
                I accept the LankaFix Code of Conduct
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-warning" />
            <p className="font-semibold text-foreground">Provider Tiers</p>
          </div>
          <div className="space-y-2">
            {Object.entries(TIER_CONFIG).map(([key, tier]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <Badge className={tier.color}>{tier.label}</Badge>
                <span className="text-muted-foreground text-xs">
                  {tier.minJobs === 0 ? "Starting tier" : `${tier.minJobs}+ jobs, ${tier.minRating}+ rating`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
