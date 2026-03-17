/**
 * Communication Readiness — /ops/readiness-communications
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Radio } from "lucide-react";
import { fetchChannelReadiness } from "@/services/readiness/readinessReadModel";
import { LaunchModeBadge, CheckRow } from "@/components/readiness/ReadinessComponents";

export default function ReadinessCommunicationsPage() {
  const channels = fetchChannelReadiness();
  return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background"><div className="container py-6 max-w-4xl">
      <Link to="/ops/launch-command-center-v2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Command Center V2</Link>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Radio className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-lg font-bold text-foreground">Communication Readiness</h1>
          <p className="text-xs text-muted-foreground">{channels.filter(c=>c.status!=="STUB_ONLY"&&c.status!=="NOT_BUILT").length}/{channels.length} channels operational</p></div>
      </div>
      {channels.find(c => c.channel === "whatsapp" && c.stubMode) && (
        <Card className="mb-4 border-warning/20 bg-warning/5"><CardContent className="p-3">
          <p className="text-xs text-warning font-semibold">⚠ WhatsApp is stub-only — critical for Sri Lankan market reach</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">In-app alone is insufficient for customer engagement. Push + WhatsApp are minimum viable channels.</p>
        </CardContent></Card>
      )}
      <div className="space-y-2.5">{channels.map(ch => (
        <Card key={ch.channel} className="border"><CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div><span className="text-sm font-semibold text-foreground">{ch.displayName}</span>
              <span className="text-[10px] text-muted-foreground ml-2">Provider: {ch.provider}</span></div>
            <LaunchModeBadge status={ch.status} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <CheckRow label="Backend Ready" pass={ch.backendReady} />
            <CheckRow label="Provider Configured" pass={ch.providerConfigured} />
            <CheckRow label="Sandbox Tested" pass={ch.sandboxTested} />
            <CheckRow label="Production Tested" pass={ch.productionTested} />
            <CheckRow label="Currently Active" pass={ch.enabled} />
            <CheckRow label="Fallback Configured" pass={ch.fallbackConfigured} />
          </div>
        </CardContent></Card>
      ))}</div>
    </div></main><Footer /></div>
  );
}
