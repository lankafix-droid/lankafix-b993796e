import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Printer, Wifi, Layers, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Sample fleet data — in production this comes from sps_assets table
const FLEET_CATEGORIES = [
  {
    label: "Mono Laser", code: "mono_laser",
    assets: [
      { brand: "HP", model: "LaserJet Pro M404dn", type: "Mono Laser", segment: "Home / Office", duty: "500–2,000 pages", functions: ["Print"], network: true, duplex: true, grade: "A", certified: true, spsEligible: true },
      { brand: "Brother", model: "HL-L2370DW", type: "Mono Laser", segment: "Home / Student", duty: "200–1,000 pages", functions: ["Print"], network: true, duplex: true, grade: "B+", certified: true, spsEligible: true },
    ],
  },
  {
    label: "Mono Multifunction", code: "mono_mfp",
    assets: [
      { brand: "Brother", model: "MFC-L2750DW", type: "Mono MFP", segment: "Office / SME", duty: "1,000–3,000 pages", functions: ["Print", "Scan", "Copy", "Fax"], network: true, duplex: true, grade: "A", certified: true, spsEligible: true },
      { brand: "HP", model: "LaserJet MFP M234dw", type: "Mono MFP", segment: "Home Office", duty: "500–1,500 pages", functions: ["Print", "Scan", "Copy"], network: true, duplex: true, grade: "B+", certified: true, spsEligible: true },
    ],
  },
  {
    label: "Ink Tank", code: "ink_tank",
    assets: [
      { brand: "Epson", model: "EcoTank L3250", type: "Ink Tank MFP", segment: "Home / Student", duty: "200–500 pages", functions: ["Print", "Scan", "Copy"], network: true, duplex: false, grade: "B+", certified: true, spsEligible: true },
    ],
  },
  {
    label: "Advanced / Custom Quote", code: "advanced",
    assets: [
      { brand: "Canon", model: "imageRUNNER 2630i", type: "Copier / MFP", segment: "Office / Institution", duty: "3,000+ pages", functions: ["Print", "Scan", "Copy", "Fax"], network: true, duplex: true, grade: "B", certified: false, spsEligible: false },
    ],
  },
];

export default function SPSFleetPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/sps")} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-lg font-bold">SmartFix Certified Fleet</h1>
            <p className="text-xs text-muted-foreground">Professionally checked printers powering SPS plans</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 mb-6">
          <span className="font-semibold text-foreground">Note:</span> SPS printers are assigned with plans, not purchased individually. Browse to understand the fleet quality behind your subscription.
        </div>

        {FLEET_CATEGORIES.map((cat) => (
          <div key={cat.code} className="mb-8">
            <h2 className="font-heading text-base font-bold mb-3">{cat.label}</h2>
            <div className="space-y-3">
              {cat.assets.map((asset) => (
                <Card key={asset.model}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-sm font-bold text-foreground">{asset.brand} {asset.model}</div>
                        <div className="text-xs text-muted-foreground">{asset.type}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {asset.certified && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                            <BadgeCheck className="w-3 h-3" /> Certified
                          </span>
                        )}
                        {!asset.spsEligible && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">Custom Quote</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div><span className="text-muted-foreground">Segment:</span> <span className="font-medium">{asset.segment}</span></div>
                      <div><span className="text-muted-foreground">Duty:</span> <span className="font-medium">{asset.duty}</span></div>
                      <div><span className="text-muted-foreground">Grade:</span> <span className="font-medium">{asset.grade}</span></div>
                      <div className="flex items-center gap-1">
                        {asset.network && <Wifi className="w-3 h-3 text-primary" />}
                        {asset.duplex && <Layers className="w-3 h-3 text-primary" />}
                        <span className="text-muted-foreground ml-1">{asset.functions.join(", ")}</span>
                      </div>
                    </div>
                    {asset.spsEligible && (
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => navigate("/sps/find-plan")}>
                        Request with Plan <ChevronRight className="w-3 h-3" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
