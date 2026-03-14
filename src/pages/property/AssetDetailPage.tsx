import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarClock, MapPin, Cpu, Wrench } from "lucide-react";
import { usePropertyDigitalTwin } from "@/hooks/usePropertyDigitalTwin";

export default function AssetDetailPage() {
  const { propertyId, assetId } = useParams<{ propertyId: string; assetId: string }>();
  const { assets, schedules, ASSET_CATEGORY_ICONS } = usePropertyDigitalTwin();

  const asset = assets.find((a) => a.id === assetId);
  const assetSchedules = schedules.filter((s) => s.asset_id === assetId);

  if (!asset) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Asset not found</p></main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-lg py-6 px-4">
          <div className="flex items-center gap-2 mb-5">
            <Link to={`/property/${propertyId}/assets`} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{asset.brand ? `${asset.brand} ${asset.model || ""}`.trim() : asset.asset_type}</h1>
              <p className="text-xs text-muted-foreground">{asset.asset_category.replace(/_/g, " ")}</p>
            </div>
            <span className="text-2xl">{ASSET_CATEGORY_ICONS[asset.asset_category] || "🔧"}</span>
          </div>

          {/* Status Card */}
          <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={asset.status === "operational" ? "default" : "destructive"}>{asset.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <span className="text-sm font-medium text-foreground">{Math.round(asset.confidence_score * 100)}%</span>
              </div>
              {asset.estimated_age_years != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Age</span>
                  <span className="text-sm font-medium text-foreground">~{asset.estimated_age_years} years</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Location</span>
                <span className="text-sm font-medium text-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{asset.location_in_property}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Detected Via</span>
                <span className="text-sm font-medium text-foreground capitalize">{asset.detected_via}</span>
              </div>
              {asset.last_service_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Service</span>
                  <span className="text-sm font-medium text-foreground">{new Date(asset.last_service_date).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Schedule */}
          <h2 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-primary" /> Maintenance Schedule</h2>
          {assetSchedules.length === 0 ? (
            <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">No maintenance scheduled</CardContent></Card>
          ) : (
            <div className="space-y-2 mb-4">
              {assetSchedules.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Cpu className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{s.service_category.replace(/_/g, " ")}</div>
                      <div className="text-xs text-muted-foreground">
                        Next: {s.next_service_due ? new Date(s.next_service_due).toLocaleDateString() : "TBD"} · Every {s.interval_months}mo
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/book/${asset.asset_category}`}>Book</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Book Service */}
          <Button className="w-full" asChild>
            <Link to={`/book/${asset.asset_category}`}><Wrench className="w-4 h-4 mr-1.5" /> Book Service for This Asset</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
