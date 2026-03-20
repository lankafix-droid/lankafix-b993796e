import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, Check, Phone, MessageCircle, BadgeCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SPS_SEGMENTS, type FindMyPlanInputs, type SPSSegment } from "@/types/sps";
import { recommendPlan } from "@/data/spsPlans";
import { PRINTER_CLASS_LABELS } from "@/types/sps";
import AIPlanInsight from "@/components/sps/AIPlanInsight";
import SPSChatAdvisor from "@/components/sps/SPSChatAdvisor";

const defaultInputs: FindMyPlanInputs = {
  userType: "home",
  monthlyPages: 300,
  monoOrColour: "mono",
  printOnly: true,
  needsWifi: false,
  a4Only: true,
  downtimeCritical: false,
  budgetPreference: "balanced",
  numUsers: 1,
  usageIntensity: "light",
  useCase: "documents",
  needsMultifunction: false,
  needsBackup: false,
  seasonalUsage: false,
};

const pageBands = [
  { label: "Up to 200", value: 150 },
  { label: "200–500", value: 350 },
  { label: "500–1,000", value: 750 },
  { label: "1,000–2,000", value: 1500 },
  { label: "2,000–3,000", value: 2500 },
  { label: "3,000+", value: 4000 },
];

export default function FindMyPlanPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [inputs, setInputs] = useState<FindMyPlanInputs>(defaultInputs);
  const totalSteps = 4;

  const set = <K extends keyof FindMyPlanInputs>(key: K, value: FindMyPlanInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const result = step === 4 ? recommendPlan(inputs) : null;

  const OptionCard = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/50 hover:border-primary/30"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => (step > 1 ? setStep(step - 1) : navigate("/sps"))} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Find My Plan</div>
            <div className="text-xs text-muted-foreground">Step {Math.min(step, 3)} of 3</div>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all ${s <= Math.min(step, 3) ? "w-8 bg-primary" : "w-4 bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* Step 1: User Type */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-bold mb-1">What best describes you?</h2>
              <p className="text-xs text-muted-foreground">This helps us recommend the right plan</p>
            </div>
            <div className="space-y-2">
              {SPS_SEGMENTS.map((seg) => (
                <OptionCard key={seg.code} selected={inputs.userType === seg.code} onClick={() => set("userType", seg.code)}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{seg.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{seg.label}</div>
                      <div className="text-[11px] text-muted-foreground">{seg.description}</div>
                    </div>
                    {inputs.userType === seg.code && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </div>
                </OptionCard>
              ))}
            </div>
            <Button className="w-full mt-4" onClick={() => setStep(2)}>
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Printing Needs */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading text-lg font-bold mb-1">Your Printing Needs</h2>
              <p className="text-xs text-muted-foreground">Help us understand your volume and preferences</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Estimated monthly pages</label>
              <div className="grid grid-cols-3 gap-2">
                {pageBands.map((b) => (
                  <OptionCard key={b.value} selected={inputs.monthlyPages === b.value} onClick={() => set("monthlyPages", b.value)}>
                    <div className="text-xs font-medium text-center">{b.label}</div>
                  </OptionCard>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Mono or Colour?</label>
              <div className="grid grid-cols-3 gap-2">
                {(["mono", "colour", "both"] as const).map((v) => (
                  <OptionCard key={v} selected={inputs.monoOrColour === v} onClick={() => set("monoOrColour", v)}>
                    <div className="text-xs font-medium text-center capitalize">{v === "both" ? "Both" : v === "mono" ? "Mono Only" : "Colour"}</div>
                  </OptionCard>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Do you need scan & copy?</label>
              <div className="grid grid-cols-2 gap-2">
                <OptionCard selected={!inputs.needsMultifunction} onClick={() => set("needsMultifunction", false)}>
                  <div className="text-xs font-medium text-center">Print Only</div>
                </OptionCard>
                <OptionCard selected={inputs.needsMultifunction} onClick={() => set("needsMultifunction", true)}>
                  <div className="text-xs font-medium text-center">Print + Scan + Copy</div>
                </OptionCard>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Budget preference</label>
              <div className="grid grid-cols-3 gap-2">
                {(["lowest", "balanced", "premium"] as const).map((v) => (
                  <OptionCard key={v} selected={inputs.budgetPreference === v} onClick={() => set("budgetPreference", v)}>
                    <div className="text-xs font-medium text-center capitalize">
                      {v === "lowest" ? "Lowest Cost" : v === "balanced" ? "Best Value" : "Premium"}
                    </div>
                  </OptionCard>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep(3)}>
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 3: Usage Pattern */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading text-lg font-bold mb-1">Usage Pattern</h2>
              <p className="text-xs text-muted-foreground">Almost there! A few more details for the best recommendation</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">How many people will use it?</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((n) => (
                  <OptionCard key={n} selected={inputs.numUsers === n} onClick={() => set("numUsers", n)}>
                    <div className="text-xs font-medium text-center">{n === 10 ? "10+" : n}</div>
                  </OptionCard>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Usage intensity</label>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "moderate", "heavy"] as const).map((v) => (
                  <OptionCard key={v} selected={inputs.usageIntensity === v} onClick={() => set("usageIntensity", v)}>
                    <div className="text-xs font-medium text-center capitalize">{v}</div>
                  </OptionCard>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Is this seasonal usage?</label>
              <div className="grid grid-cols-2 gap-2">
                <OptionCard selected={!inputs.seasonalUsage} onClick={() => set("seasonalUsage", false)}>
                  <div className="text-xs font-medium text-center">Year-round</div>
                </OptionCard>
                <OptionCard selected={inputs.seasonalUsage} onClick={() => set("seasonalUsage", true)}>
                  <div className="text-xs font-medium text-center">Seasonal / Term-based</div>
                </OptionCard>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Is printer downtime critical?</label>
              <div className="grid grid-cols-2 gap-2">
                <OptionCard selected={!inputs.downtimeCritical} onClick={() => set("downtimeCritical", false)}>
                  <div className="text-xs font-medium text-center">Can wait a day</div>
                </OptionCard>
                <OptionCard selected={inputs.downtimeCritical} onClick={() => set("downtimeCritical", true)}>
                  <div className="text-xs font-medium text-center">Need fast fix</div>
                </OptionCard>
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep(4)}>
              <Sparkles className="w-4 h-4 mr-1" /> Get My Recommendation
            </Button>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="space-y-5">
            <div className="text-center">
              <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${
                result.confidence === "recommended" ? "bg-accent/10 text-accent" :
                result.confidence === "good_fit" ? "bg-primary/10 text-primary" :
                "bg-warning/10 text-warning"
              }`}>
                {result.confidence === "recommended" ? <BadgeCheck className="w-3.5 h-3.5" /> :
                 result.confidence === "good_fit" ? <Check className="w-3.5 h-3.5" /> :
                 <AlertTriangle className="w-3.5 h-3.5" />}
                {result.confidence === "recommended" ? "Recommended" :
                 result.confidence === "good_fit" ? "Good Fit" : "LankaFix Review Required"}
              </div>
              <h2 className="font-heading text-xl font-bold mb-1">Your Recommended Plan</h2>
              <p className="text-xs text-muted-foreground">{result.reason}</p>
            </div>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="text-xs font-medium text-primary mb-1">{PRINTER_CLASS_LABELS[result.plan.printer_class as keyof typeof PRINTER_CLASS_LABELS] || result.plan.printer_class}</div>
                <div className="text-xl font-bold text-foreground mb-1">{result.plan.plan_name}</div>
                {!result.plan.is_custom_quote ? (
                  <>
                    <div className="text-3xl font-bold text-primary mb-1">
                      Rs. {result.plan.monthly_fee.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-4">
                      {result.plan.included_pages.toLocaleString()} pages included • Rs. {result.plan.overage_rate}/extra page
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                      <div className="bg-background/60 rounded-lg p-2.5">
                        <div className="text-muted-foreground">Deposit</div>
                        <div className="font-semibold text-foreground">Rs. {result.plan.deposit_amount.toLocaleString()}</div>
                      </div>
                      <div className="bg-background/60 rounded-lg p-2.5">
                        <div className="text-muted-foreground">Min Term</div>
                        <div className="font-semibold text-foreground">{result.plan.min_term_months} months</div>
                      </div>
                      <div className="bg-background/60 rounded-lg p-2.5">
                        <div className="text-muted-foreground">Support</div>
                        <div className="font-semibold text-foreground capitalize">{result.plan.support_level}</div>
                      </div>
                      <div className="bg-background/60 rounded-lg p-2.5">
                        <div className="text-muted-foreground">Setup Fee</div>
                        <div className="font-semibold text-foreground">Rs. {result.plan.setup_fee.toLocaleString()}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-foreground mb-4">Custom pricing – a LankaFix advisor will prepare a tailored quote for your needs.</div>
                )}
                <ul className="space-y-1.5 mb-4">
                  {result.plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={() => navigate(`/sps/request?plan=${result.plan.id}`)}>
                Proceed to Subscription Request <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/sps/plans")}>
                Compare All Plans
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1">
                  <Phone className="w-3.5 h-3.5" /> Request Callback
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Advisor
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
