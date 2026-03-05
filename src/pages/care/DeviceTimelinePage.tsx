import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wrench, Camera, CheckCircle2, Calendar, Shield } from "lucide-react";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { DEVICE_CATEGORY_LABELS } from "@/types/subscription";
import type { DeviceCategoryCode } from "@/types/subscription";
import { getPlanById } from "@/data/carePlans";
import { PLAN_TIER_LABELS, PLAN_TIER_COLORS } from "@/types/subscription";

const DeviceTimelinePage = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const { getDevice, serviceHistory, subscriptions, devices } = useSubscriptionStore();

  const device = getDevice(deviceId || "");
  const history = useSubscriptionStore.getState().getDeviceHistory(deviceId || "");
  const activeSub = subscriptions.find((s) => s.deviceId === deviceId && s.status === "active");
  const plan = activeSub ? getPlanById(activeSub.planId) : null;

  if (!device) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Device Not Found</h1>
            <Button asChild><Link to="/care/dashboard">Back to Dashboard</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Get AMC visits for this device
  const amcVisits = activeSub?.amcVisits || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-lg">
          <Link to="/care/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          {/* Device Info */}
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{device.deviceName}</h1>
                  <p className="text-sm text-muted-foreground">{device.brand} {device.model}</p>
                  <p className="text-xs text-muted-foreground">{DEVICE_CATEGORY_LABELS[device.category]} • Purchased {device.purchaseYear}</p>
                  <p className="text-xs text-muted-foreground">Location: {device.installationLocation}</p>
                </div>
                {activeSub ? (
                  <Badge className="bg-success/10 text-success"><Shield className="w-3 h-3 mr-1" />Protected</Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground">Unprotected</Badge>
                )}
              </div>

              {plan && activeSub && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={PLAN_TIER_COLORS[plan.tier]}>{PLAN_TIER_LABELS[plan.tier]}</Badge>
                    <span className="text-xs text-muted-foreground">Expires {new Date(activeSub.expiryDate).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{plan.name}</p>
                </div>
              )}

              {!activeSub && (
                <Button asChild className="w-full mt-3" variant="hero" size="sm">
                  <Link to="/care"><Shield className="w-4 h-4 mr-1" /> Add Care Plan</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Service History Timeline */}
          <h2 className="text-lg font-bold text-foreground mb-3">Service History</h2>

          {history.length === 0 && amcVisits.filter((v) => v.status === "completed").length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No service records yet</p>
                <p className="text-xs text-muted-foreground mt-1">Service history will appear here after maintenance visits</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-0">
              {/* AMC completed visits */}
              {amcVisits.filter((v) => v.status === "completed").map((visit) => (
                <div key={visit.id} className="flex gap-3 mb-1">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <div className="w-0.5 flex-1 bg-success/20" />
                  </div>
                  <Card className="flex-1 mb-3">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">AMC Preventive Service</p>
                          <p className="text-xs text-muted-foreground">{visit.technicianName || "Technician"}</p>
                          {visit.serviceReport && <p className="text-xs text-muted-foreground mt-1">{visit.serviceReport}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground">{visit.completedAt ? new Date(visit.completedAt).toLocaleDateString() : ""}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {visit.checklist.filter((c) => c.completed).map((c, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{c.item}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {/* Service history records */}
              {history.map((record) => (
                <div key={record.id} className="flex gap-3 mb-1">
                  <div className="flex flex-col items-center">
                    <Wrench className="w-5 h-5 text-primary shrink-0" />
                    <div className="w-0.5 flex-1 bg-primary/20" />
                  </div>
                  <Card className="flex-1 mb-3">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{record.serviceType}</p>
                          <p className="text-xs text-muted-foreground">{record.technicianName}</p>
                          <p className="text-xs text-muted-foreground mt-1">{record.findings}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(record.date).toLocaleDateString()}</span>
                      </div>
                      {record.partsReplaced.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {record.partsReplaced.map((p, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">🔧 {p}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming AMC Visits */}
          {amcVisits.filter((v) => v.status === "scheduled").length > 0 && (
            <>
              <h2 className="text-lg font-bold text-foreground mb-3 mt-6">Upcoming Maintenance</h2>
              <div className="space-y-2">
                {amcVisits.filter((v) => v.status === "scheduled").map((visit) => (
                  <Card key={visit.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            {new Date(visit.scheduledDate).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge className="bg-primary/10 text-primary text-[10px]">Scheduled</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{visit.checklist.length} checklist items</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DeviceTimelinePage;
