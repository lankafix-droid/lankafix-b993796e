import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Shield, Wrench, QrCode, AlertTriangle,
  Calendar, DollarSign, ArrowRightLeft, TrendingDown, Package,
} from "lucide-react";
import {
  getHealthLabel,
  estimateResaleValue,
} from "@/store/devicePassportStore";
import { useDevicePassportsDB } from "@/hooks/useDevicePassportsDB";

const WARRANTY_TYPE_LABELS = {
  manufacturer: "Manufacturer",
  lankafix_labor: "LankaFix Labor",
  extended_maintenance: "Extended Maintenance",
};

export default function DevicePassportPage() {
  const { passportId } = useParams<{ passportId: string }>();
  const { getPassport, getPassportServices, getPassportWarranties, getAlerts } = useDevicePassportStore();

  const passport = getPassport(passportId || "");
  const services = getPassportServices(passportId || "");
  const warranties = getPassportWarranties(passportId || "");
  const alerts = getAlerts(passportId || "").filter((a) => !a.dismissed);

  if (!passport) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Device Not Found</h1>
            <Button asChild><Link to="/devices">Back to Devices</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const health = getHealthLabel(passport.healthScore);
  const ageYears = Math.round((Date.now() - new Date(passport.purchaseDate || passport.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365));
  const resaleValue = estimateResaleValue(80000, ageYears, passport.healthScore, services.length);
  const avgAnnualCost = ageYears > 0 ? Math.round(passport.totalServiceCost / ageYears) : passport.totalServiceCost;
  const activeWarranties = warranties.filter((w) => w.status === "active");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-lg">
          <Link to="/devices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> All Devices
          </Link>

          {/* Device Identity */}
          <Card className="mb-4">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{passport.deviceNickname}</h1>
                  <p className="text-sm text-muted-foreground">{passport.brand} {passport.model}</p>
                  {passport.serialNumber && <p className="text-xs text-muted-foreground">S/N: {passport.serialNumber}</p>}
                  <p className="text-xs text-muted-foreground mt-1">📍 {passport.installationLocation}</p>
                  {passport.purchaseDate && <p className="text-xs text-muted-foreground">Purchased: {new Date(passport.purchaseDate).toLocaleDateString()}</p>}
                  {passport.purchaseSeller && <p className="text-xs text-muted-foreground">From: {passport.purchaseSeller}</p>}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-[9px] text-muted-foreground">QR Tag</span>
                </div>
              </div>

              {/* Health Score */}
              <div className="bg-muted/50 rounded-lg p-3 mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">Device Health Score</span>
                  <span className={`text-lg font-bold ${health.color}`}>{passport.healthScore}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
                </div>
                <Progress value={passport.healthScore} className="h-2 mb-1" />
                <span className={`text-xs font-medium ${health.color}`}>{health.label}</span>
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2 mb-4">
              {alerts.map((a) => (
                <Card key={a.id} className={a.severity === "critical" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}>
                  <CardContent className="p-3 flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${a.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                    <p className="text-xs text-foreground">{a.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Card><CardContent className="p-3 text-center">
              <Wrench className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-foreground">{passport.totalServicesPerformed}</p>
              <p className="text-[10px] text-muted-foreground">Services</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <DollarSign className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">LKR {passport.totalServiceCost.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total Cost</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <TrendingDown className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">LKR {avgAnnualCost.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Avg/Year</p>
            </CardContent></Card>
          </div>

          {/* Warranty Ledger */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Warranty Ledger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {warranties.length === 0 && <p className="text-xs text-muted-foreground">No warranty records</p>}
              {warranties.map((w) => (
                <div key={w.id} className="flex items-start justify-between border-b border-border last:border-0 pb-2 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{WARRANTY_TYPE_LABELS[w.warrantyType]}</p>
                    <p className="text-xs text-muted-foreground">{w.warrantyProvider}</p>
                    <p className="text-xs text-muted-foreground">{w.description}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(w.warrantyStartDate).toLocaleDateString()} — {new Date(w.warrantyEndDate).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={w.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {w.status === "active" ? "✅ Active" : w.status === "expired" ? "Expired" : "Claimed"}
                  </Badge>
                </div>
              ))}
              {activeWarranties.length > 0 && (
                <p className="text-xs text-success bg-success/5 p-2 rounded-md">🛡️ This device has active warranty coverage</p>
              )}
            </CardContent>
          </Card>

          {/* Service History Timeline */}
          <h2 className="text-lg font-bold text-foreground mb-3">Service History</h2>
          {services.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No service records yet</CardContent></Card>
          ) : (
            <div className="space-y-0">
              {services.map((s) => (
                <div key={s.id} className="flex gap-3 mb-1">
                  <div className="flex flex-col items-center">
                    <Wrench className="w-5 h-5 text-primary shrink-0" />
                    <div className="w-0.5 flex-1 bg-primary/20" />
                  </div>
                  <Card className="flex-1 mb-3">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{s.serviceType}</p>
                          <p className="text-xs text-muted-foreground">{s.technicianName}{s.partnerName ? ` · ${s.partnerName}` : ""}</p>
                          <p className="text-xs text-muted-foreground mt-1">{s.workCompleted}</p>
                          {s.diagnosisResult && <p className="text-xs text-warning mt-1">🔍 {s.diagnosisResult}</p>}
                          {s.recommendations && <p className="text-xs text-primary mt-1">💡 {s.recommendations}</p>}
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-xs text-muted-foreground">{new Date(s.serviceDate).toLocaleDateString()}</span>
                          <p className="text-xs font-medium text-foreground">LKR {s.serviceCost.toLocaleString()}</p>
                        </div>
                      </div>
                      {s.partsReplaced.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.partsReplaced.map((p, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] gap-0.5">
                              <Package className="w-2.5 h-2.5" /> {p.partName} ({p.partBrand})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {/* Resale & Transfer */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Est. Resale Value</p>
                <p className="text-lg font-bold text-foreground">LKR {resaleValue.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <ArrowRightLeft className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Transfer Ownership</p>
                <Button size="sm" variant="ghost" className="text-xs mt-1 h-6">Transfer →</Button>
              </CardContent>
            </Card>
          </div>

          {/* QR Section */}
          <Card className="mt-4">
            <CardContent className="p-4 text-center">
              <div className="w-24 h-24 mx-auto border-2 border-dashed border-primary/30 rounded-xl flex items-center justify-center mb-2">
                <QrCode className="w-12 h-12 text-primary/50" />
              </div>
              <p className="text-sm font-semibold text-foreground">LankaFix Verified Device</p>
              <p className="text-xs text-muted-foreground">Scan for Service History</p>
              <p className="text-[10px] text-muted-foreground mt-1">{passport.devicePassportId}</p>
            </CardContent>
          </Card>

          {/* Trust Footer */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            🔒 All LankaFix services are securely recorded in your device passport.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
