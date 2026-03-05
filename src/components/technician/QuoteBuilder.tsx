import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useBookingStore } from "@/store/bookingStore";
import type { QuoteData, QuoteOption, QuoteItem, PartQuality, CategoryCode } from "@/types/booking";
import { PARTNER_QUOTE_REVIEW_CATEGORIES } from "@/types/booking";
import { track } from "@/lib/analytics";
import { Plus, X, Send, Clock } from "lucide-react";

interface QuoteBuilderProps {
  jobId: string;
  categoryCode: CategoryCode;
  onClose: () => void;
}

const QUALITY_OPTIONS: { value: PartQuality; label: string }[] = [
  { value: "genuine", label: "Genuine" },
  { value: "oem_grade", label: "OEM Grade" },
  { value: "compatible", label: "Compatible" },
];

function emptyOption(id: string, quality: PartQuality): QuoteOption {
  return {
    id,
    label: quality === "genuine" ? "Option A — Genuine" : quality === "oem_grade" ? "Option B — OEM" : "Option C — Compatible",
    laborItems: [{ description: "Service labor", amount: 0 }],
    partsItems: [{ description: "", amount: 0 }],
    addOns: [],
    totals: { labor: 0, parts: 0, addOns: 0, total: 0 },
    warranty: { labor: "30 days", parts: quality === "genuine" ? "90 days" : "30 days", laborDays: 30, partsDays: quality === "genuine" ? 90 : 30 },
    partQuality: quality,
  };
}

function computeTotals(opt: QuoteOption): QuoteOption {
  const labor = opt.laborItems.reduce((s, i) => s + i.amount, 0);
  const parts = opt.partsItems.reduce((s, i) => s + i.amount, 0);
  const addOns = opt.addOns.reduce((s, i) => s + i.amount, 0);
  return { ...opt, totals: { labor, parts, addOns, total: labor + parts + addOns } };
}

export default function QuoteBuilder({ jobId, categoryCode, onClose }: QuoteBuilderProps) {
  const setBookingQuote = useBookingStore((s) => s.setBookingQuote);
  const [options, setOptions] = useState<QuoteOption[]>([
    emptyOption("A", "genuine"),
    emptyOption("B", "oem_grade"),
  ]);
  const [findings, setFindings] = useState("");
  const [notes, setNotes] = useState("");
  const [scopeIncludes, setScopeIncludes] = useState("Labor, diagnostics, standard parts");
  const [scopeExcludes, setScopeExcludes] = useState("Additional parts if discovered during repair");
  const [recommended, setRecommended] = useState("A");
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [awaitingParts, setAwaitingParts] = useState(false);
  const [awaitingPartsEta, setAwaitingPartsEta] = useState("");

  const needsPartnerReview = PARTNER_QUOTE_REVIEW_CATEGORIES.includes(categoryCode);

  const updateItem = (optIdx: number, listKey: "laborItems" | "partsItems" | "addOns", itemIdx: number, field: keyof QuoteItem, value: string | number | boolean) => {
    setOptions((prev) => prev.map((opt, i) => {
      if (i !== optIdx) return opt;
      const list = [...opt[listKey]];
      list[itemIdx] = { ...list[itemIdx], [field]: field === "amount" || field === "warrantyDays" || field === "quantity" || field === "unitPrice" ? Number(value) || 0 : field === "optional" ? Boolean(value) : value };
      return computeTotals({ ...opt, [listKey]: list });
    }));
  };

  const addItem = (optIdx: number, listKey: "laborItems" | "partsItems" | "addOns") => {
    setOptions((prev) => prev.map((opt, i) => {
      if (i !== optIdx) return opt;
      return { ...opt, [listKey]: [...opt[listKey], { description: "", amount: 0 }] };
    }));
  };

  const handleSubmit = () => {
    const computed = options.map((o) => ({ ...computeTotals(o), estimatedCompletionMinutes: estimatedMinutes }));
    const recOpt = computed.find((o) => o.id === recommended) || computed[0];
    const quote: QuoteData = {
      options: computed,
      selectedOptionId: null,
      recommendedOptionId: recommended,
      recommendedReason: `${recOpt.label} provides the best value`,
      scopeIncludes: scopeIncludes.split(",").map((s) => s.trim()).filter(Boolean),
      scopeExcludes: scopeExcludes.split(",").map((s) => s.trim()).filter(Boolean),
      notes,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      inspectionFindings: findings.split("\n").filter(Boolean),
      quoteStatus: "quote_sent",
      awaitingParts,
      awaitingPartsEta: awaitingParts ? awaitingPartsEta : undefined,
      laborItems: recOpt.laborItems,
      partsItems: recOpt.partsItems,
      addOns: recOpt.addOns,
      totals: recOpt.totals,
      warranty: recOpt.warranty,
    };
    setBookingQuote(jobId, quote);
    track("technician_quote_submit", { jobId, optionCount: computed.length, recommended, needsPartnerReview, awaitingParts });
    track("quote_sent", { jobId });
    onClose();
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Quote Builder</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6"><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsPartnerReview && (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg p-2">
            <Badge variant="outline" className="text-[10px] text-warning border-warning/20">Partner Review</Badge>
            <p className="text-[10px] text-warning">This quote requires partner review before customer sees it</p>
          </div>
        )}

        {/* Findings */}
        <div>
          <label className="text-xs font-medium text-foreground">Inspection Findings</label>
          <Textarea value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="One finding per line" rows={3} className="text-sm mt-1" />
        </div>

        {/* Options */}
        {options.map((opt, optIdx) => (
          <div key={opt.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{opt.label}</span>
              <Button size="sm" variant={recommended === opt.id ? "default" : "outline"} className="text-[10px] h-6"
                onClick={() => setRecommended(opt.id)}>
                {recommended === opt.id ? "★ Recommended" : "Set Recommended"}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground font-medium">Labor</p>
            {opt.laborItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input value={item.description} onChange={(e) => updateItem(optIdx, "laborItems", i, "description", e.target.value)} placeholder="Description" className="text-xs h-8 flex-1" />
                <Input type="number" value={item.amount || ""} onChange={(e) => updateItem(optIdx, "laborItems", i, "amount", e.target.value)} placeholder="LKR" className="text-xs h-8 w-24" />
                <label className="flex items-center gap-1 text-[9px] text-muted-foreground shrink-0">
                  <input type="checkbox" checked={item.optional || false} onChange={(e) => updateItem(optIdx, "laborItems", i, "optional", e.target.checked)} className="w-3 h-3" />
                  Opt
                </label>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => addItem(optIdx, "laborItems")}><Plus className="w-3 h-3 mr-1" /> Add Labor</Button>

            <p className="text-[10px] text-muted-foreground font-medium">Parts</p>
            {opt.partsItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input value={item.description} onChange={(e) => updateItem(optIdx, "partsItems", i, "description", e.target.value)} placeholder="Part name" className="text-xs h-8 flex-1" />
                <Input type="number" value={item.amount || ""} onChange={(e) => updateItem(optIdx, "partsItems", i, "amount", e.target.value)} placeholder="LKR" className="text-xs h-8 w-24" />
                <Input type="number" value={item.warrantyDays || ""} onChange={(e) => updateItem(optIdx, "partsItems", i, "warrantyDays", e.target.value)} placeholder="Warranty days" className="text-xs h-8 w-20" />
                <label className="flex items-center gap-1 text-[9px] text-muted-foreground shrink-0">
                  <input type="checkbox" checked={item.optional || false} onChange={(e) => updateItem(optIdx, "partsItems", i, "optional", e.target.checked)} className="w-3 h-3" />
                  Opt
                </label>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => addItem(optIdx, "partsItems")}><Plus className="w-3 h-3 mr-1" /> Add Part</Button>

            <div className="text-right text-xs font-semibold pt-1 border-t">
              Total: LKR {opt.totals.total.toLocaleString()}
            </div>
          </div>
        ))}

        {options.length < 3 && (
          <Button variant="outline" size="sm" className="w-full text-xs"
            onClick={() => setOptions([...options, emptyOption("C", "compatible")])}>
            <Plus className="w-3 h-3 mr-1" /> Add Option C
          </Button>
        )}

        {/* Estimated completion */}
        <div>
          <label className="text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Estimated Completion (minutes)
          </label>
          <Input type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 60)} className="text-xs h-8 mt-1 w-32" />
        </div>

        {/* Awaiting parts */}
        <div className="flex items-center gap-3">
          <Switch checked={awaitingParts} onCheckedChange={setAwaitingParts} />
          <label className="text-xs font-medium text-foreground">Parts need to be sourced</label>
        </div>
        {awaitingParts && (
          <Input value={awaitingPartsEta} onChange={(e) => setAwaitingPartsEta(e.target.value)} placeholder="e.g. 2-3 business days" className="text-xs h-8" />
        )}

        {/* Scope */}
        <div>
          <label className="text-xs font-medium">Scope Includes</label>
          <Input value={scopeIncludes} onChange={(e) => setScopeIncludes(e.target.value)} className="text-xs h-8 mt-1" placeholder="Comma separated" />
        </div>
        <div>
          <label className="text-xs font-medium">Scope Excludes</label>
          <Input value={scopeExcludes} onChange={(e) => setScopeExcludes(e.target.value)} className="text-xs h-8 mt-1" placeholder="Comma separated" />
        </div>
        <div>
          <label className="text-xs font-medium">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm mt-1" placeholder="Additional notes for customer" />
        </div>

        <Button className="w-full" onClick={handleSubmit}>
          <Send className="w-4 h-4 mr-2" /> Submit Quote
        </Button>
      </CardContent>
    </Card>
  );
}
