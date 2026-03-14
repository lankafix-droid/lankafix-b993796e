import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams, Link } from "react-router-dom";
import { Plus, ArrowLeft, MapPin } from "lucide-react";
import { usePropertyDigitalTwin } from "@/hooks/usePropertyDigitalTwin";
import AddAssetDialog from "@/components/property/AddAssetDialog";
import { useState } from "react";

const STATUS_VARIANT: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  operational: "default",
  needs_repair: "destructive",
  inspection_recommended: "secondary",
  retired: "outline",
};

export default function PropertyAssetsPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { getAssetsForProperty, properties, ASSET_CATEGORY_ICONS } = usePropertyDigitalTwin();
  const [showAdd, setShowAdd] = useState(false);

  const property = properties.find((p) => p.id === propertyId);
  const assets = propertyId ? getAssetsForProperty(propertyId) : [];

  // Group by room
  const byRoom = assets.reduce<Record<string, typeof assets>>((acc, a) => {
    const room = a.location_in_property || "Unspecified";
    (acc[room] = acc[room] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-lg py-6 px-4">
          <div className="flex items-center gap-2 mb-5">
            <Link to="/property" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Infrastructure</h1>
              <p className="text-xs text-muted-foreground">{property?.property_name || "Property"} · {assets.length} assets</p>
            </div>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
          </div>

          {assets.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No assets registered yet. Add your AC units, cameras, routers, and more.</p>
              <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Add First Asset</Button>
            </CardContent></Card>
          ) : (
            Object.entries(byRoom).map(([room, items]) => (
              <div key={room} className="mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{room}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => (
                    <Link key={a.id} to={`/property/${propertyId}/asset/${a.id}`}>
                      <Card className="hover:border-primary/20 transition-colors">
                        <CardContent className="p-3 flex items-center gap-3">
                          <span className="text-xl">{ASSET_CATEGORY_ICONS[a.asset_category] || "🔧"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate text-foreground">
                              {a.brand ? `${a.brand} ${a.model || ""}`.trim() : a.asset_type}
                            </div>
                            <div className="text-xs text-muted-foreground">{a.asset_category.replace(/_/g, " ")}{a.estimated_age_years ? ` · ~${a.estimated_age_years}yr` : ""}</div>
                          </div>
                          <Badge variant={STATUS_VARIANT[a.status] || "outline"} className="text-[10px]">{a.status.replace(/_/g, " ")}</Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />
      {propertyId && <AddAssetDialog open={showAdd} onOpenChange={setShowAdd} propertyId={propertyId} />}
    </div>
  );
}
