import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { SPARE_PARTS_TABLE, type SparePartRecord } from "@/data/partsPricing";
import { TRAVEL_ZONES, type TravelZone } from "@/data/travelFees";
import { AC_INSTALL_ADDONS } from "@/data/acInstallAddons";
import { categoryPricingRules } from "@/config/pricingRules";
import { Edit2, Save, Clock, Search } from "lucide-react";

const PricingEditorPage = () => {
  const [parts, setParts] = useState<SparePartRecord[]>([...SPARE_PARTS_TABLE]);
  const [travelZones, setTravelZones] = useState<TravelZone[]>([...TRAVEL_ZONES]);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParts = parts.filter(
    (p) =>
      p.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.deviceModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSavePartPrice = (id: string) => {
    const price = parseInt(editPrice);
    if (isNaN(price) || price <= 0) return;
    setParts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, basePrice: price, lastUpdated: new Date().toISOString().split("T")[0] } : p
      )
    );
    setEditingPartId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Pricing Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage service prices, spare parts, and travel fees
          </p>
        </div>

        <Tabs defaultValue="parts" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="parts" className="flex-1">Spare Parts</TabsTrigger>
            <TabsTrigger value="services" className="flex-1">Service Fees</TabsTrigger>
            <TabsTrigger value="travel" className="flex-1">Travel</TabsTrigger>
            <TabsTrigger value="addons" className="flex-1">AC Add-Ons</TabsTrigger>
          </TabsList>

          {/* Spare Parts */}
          <TabsContent value="parts" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search parts by name, model or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="bg-card rounded-xl border divide-y">
              {filteredParts.map((part) => (
                <div key={part.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{part.partName}</p>
                      <Badge variant="secondary" className="text-[10px]">{part.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{part.deviceModel}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      Updated: {part.lastUpdated}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingPartId === part.id ? (
                      <>
                        <Input
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-28 h-8 text-sm"
                          type="number"
                          autoFocus
                        />
                        <Button size="sm" variant="default" onClick={() => handleSavePartPrice(part.id)}>
                          <Save className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">
                          LKR {part.basePrice.toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPartId(part.id);
                            setEditPrice(String(part.basePrice));
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Recommended refresh: every 30 days · {filteredParts.length} parts listed
            </p>
          </TabsContent>

          {/* Service Fees */}
          <TabsContent value="services" className="space-y-4">
            <div className="bg-card rounded-xl border divide-y">
              {Object.entries(categoryPricingRules).map(([code, rule]) => (
                <div key={code} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{code}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Visit Fee: <span className="text-foreground font-medium">LKR {rule.visitFee.toLocaleString()}</span></div>
                    <div>Diagnostic: <span className="text-foreground font-medium">LKR {rule.diagnosticFee.toLocaleString()}</span></div>
                    <div>Emergency: <span className="text-foreground font-medium">+{rule.emergencySurchargePercent}%</span></div>
                    {rule.depositRequired && (
                      <div>Deposit: <span className="text-foreground font-medium">LKR {rule.depositAmount.toLocaleString()}</span></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Travel Fees */}
          <TabsContent value="travel" className="space-y-4">
            <div className="bg-card rounded-xl border divide-y">
              {travelZones.map((zone) => (
                <div key={zone.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{zone.label}</p>
                      <p className="text-xs text-muted-foreground">{zone.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{zone.feeLabel}</span>
                      <Badge variant={zone.active ? "default" : "secondary"} className="text-[10px]">
                        {zone.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* AC Add-Ons */}
          <TabsContent value="addons" className="space-y-4">
            <div className="bg-card rounded-xl border divide-y">
              {AC_INSTALL_ADDONS.map((addon) => (
                <div key={addon.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{addon.label}</p>
                      <p className="text-xs text-muted-foreground">{addon.description}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">
                      LKR {addon.pricePerUnit.toLocaleString()} {addon.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default PricingEditorPage;
