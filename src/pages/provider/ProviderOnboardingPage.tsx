import { useState } from "react";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
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
  Shield, Star, Send, BookOpen, Scale,
} from "lucide-react";

export default function ProviderOnboardingPage() {
  const store = useProviderOnboardingStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const step = ONBOARDING_STEPS[store.currentStep];
  const progress = ((store.currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold">Join LankaFix</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Become a verified service provider</p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Step {store.currentStep + 1} of {ONBOARDING_STEPS.length}
          </span>
          <span className="text-sm font-semibold text-primary">{step.label}</span>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
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

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {store.currentStep > 0 && (
            <Button variant="outline" onClick={store.prevStep} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step.key === "review" ? (
            <Button
              className="flex-1"
              disabled={!store.conductAccepted}
              onClick={() => {
                store.submitApplication();
                toast({ title: "Application Submitted!", description: "We'll review your profile within 24–48 hours." });
                navigate("/partner");
              }}
            >
              <Send className="w-4 h-4 mr-1" /> Submit Application
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

// ─── Step Components ────────────────────────────────────────────────

function StepProviderType() {
  const { profile, updateProfile } = useProviderOnboardingStore();
  return (
    <div className="space-y-3">
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
  const { profile, updateProfile, otpSent, sendOtp, verifyOtp } = useProviderOnboardingStore();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Basic Profile</h2>
      <div className="space-y-3">
        <div>
          <Label>Full Name *</Label>
          <Input placeholder="e.g. Kasun Perera" value={profile.fullName} onChange={(e) => updateProfile({ fullName: e.target.value })} />
        </div>
        <div>
          <Label>Mobile Number *</Label>
          <div className="flex gap-2">
            <Input
              placeholder="07X XXX XXXX"
              value={profile.mobileNumber}
              onChange={(e) => updateProfile({ mobileNumber: e.target.value })}
              className="flex-1"
            />
            {!profile.mobileVerified && (
              <Button variant="outline" size="sm" onClick={sendOtp} disabled={profile.mobileNumber.length < 10}>
                <Phone className="w-4 h-4 mr-1" /> {otpSent ? "Resend" : "Verify"}
              </Button>
            )}
            {profile.mobileVerified && <Badge className="bg-success/10 text-success self-center">✓ Verified</Badge>}
          </div>
          {otpSent && !profile.mobileVerified && (
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Enter OTP (use 123456 for demo)</p>
              <div className="flex items-center gap-3">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  size="sm"
                  onClick={() => {
                    if (verifyOtp(otp)) toast({ title: "Verified!", description: "Mobile number verified." });
                    else toast({ title: "Invalid OTP", variant: "destructive" });
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          )}
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
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              {profile.profilePhotoUrl ? (
                <img src={profile.profilePhotoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => updateProfile({ profilePhotoUrl: "/placeholder.svg" })}>
              Upload Photo
            </Button>
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
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Verification Documents</h2>
      <p className="text-sm text-muted-foreground">Upload documents to get verified. NIC is mandatory.</p>
      {DOCUMENT_TYPES.map((doc) => {
        const uploaded = profile.documents.find((d) => d.type === doc.value);
        return (
          <Card key={doc.value}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className={`w-5 h-5 ${uploaded ? "text-success" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {doc.label} {doc.required && <span className="text-destructive">*</span>}
                  </p>
                  {uploaded && <p className="text-xs text-success">✓ {uploaded.fileName}</p>}
                </div>
              </div>
              {uploaded ? (
                <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.value)} className="text-destructive">Remove</Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addDocument({ type: doc.value, fileName: `${doc.value}_scan.jpg`, uploadedAt: new Date().toISOString() })
                  }
                >
                  <Camera className="w-4 h-4 mr-1" /> Upload
                </Button>
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

      {/* Summary cards */}
      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium text-foreground">{providerLabel}</span></div>
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{profile.fullName || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Mobile</span><span className="font-medium text-foreground">{profile.mobileNumber || "—"} {profile.mobileVerified && "✓"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">NIC</span><span className="font-medium text-foreground">{profile.nicNumber || "—"}</span></div>
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Categories</span><span className="font-medium text-foreground">{profile.serviceCategories.join(", ") || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Zones</span><span className="font-medium text-foreground">{profile.serviceZones.length} zones</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span className="font-medium text-foreground">{profile.yearsOfExperience}+ years</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Documents</span><span className="font-medium text-foreground">{profile.documents.length} uploaded</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tools</span><span className="font-medium text-foreground">{profile.tools.length} declared</span></div>
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-medium text-foreground">{profile.availabilityDays.length} days, {profile.availabilityStart}–{profile.availabilityEnd}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium text-foreground">{profile.bankName || "—"}</span></div>
        </CardContent>
      </Card>

      {/* Training */}
      <Card className={trainingCompleted ? "border-success/30 bg-success/5" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className={`w-5 h-5 ${trainingCompleted ? "text-success" : "text-muted-foreground"}`} />
            <div>
              <p className="font-semibold text-foreground">Provider Training</p>
              <p className="text-xs text-muted-foreground">Customer service, safety & platform rules</p>
            </div>
          </div>
          {trainingCompleted ? (
            <Badge className="bg-success/10 text-success">✓ Training Complete</Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={completeTraining}>
              <BookOpen className="w-4 h-4 mr-1" /> Complete Training (Demo)
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
