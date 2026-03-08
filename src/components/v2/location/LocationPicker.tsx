/**
 * LankaFix Location Picker
 * Inline location selector for booking flow — select from saved addresses,
 * use GPS, or enter manually. Shows zone validation status.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin, Navigation, CheckCircle2, AlertTriangle, ChevronDown, Plus,
  Loader2, ArrowRight, X,
} from "lucide-react";
import {
  useLocationStore,
  requestCurrentPosition,
  validateServiceZone,
  getTravelFeeForZone,
  ADDRESS_LABEL_OPTIONS,
  type SavedAddress,
} from "@/store/locationStore";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";

interface Props {
  onContinue: () => void;
  showTravelFee?: boolean;
}

const LocationPicker = ({ onContinue, showTravelFee = true }: Props) => {
  const {
    savedAddresses,
    activeAddressId,
    setActiveAddressId,
    currentPosition,
    setCurrentPosition,
    addAddress,
    setPermissionState,
  } = useLocationStore();

  const [showAll, setShowAll] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [manualArea, setManualArea] = useState("");
  const [manualStreet, setManualStreet] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [showAreaSearch, setShowAreaSearch] = useState(false);

  const activeAddress = savedAddresses.find((a) => a.id === activeAddressId) || savedAddresses[0];

  const areaResults = areaSearch.length >= 2
    ? COLOMBO_ZONES_DATA.filter(
        (z) =>
          z.label.toLowerCase().includes(areaSearch.toLowerCase()) ||
          z.area.toLowerCase().includes(areaSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleUseGps = async () => {
    setLoadingGps(true);
    try {
      const pos = await requestCurrentPosition();
      setPermissionState("granted");
      setCurrentPosition(pos);
      const zone = validateServiceZone(pos.lat, pos.lng);
      const zoneData = COLOMBO_ZONES_DATA.find((z) => z.id === zone.zoneId);

      const addr = addAddress({
        label: "other",
        displayName: `Current Location — ${zoneData?.area || "Colombo"}`,
        area: zoneData?.area || "Colombo",
        city: zoneData?.city || "Colombo",
        lat: pos.lat,
        lng: pos.lng,
      });
      setActiveAddressId(addr.id);
    } catch {
      setPermissionState("denied");
    } finally {
      setLoadingGps(false);
    }
  };

  const handleAddManual = (zone: typeof COLOMBO_ZONES_DATA[0]) => {
    const addr = addAddress({
      label: "other",
      displayName: `${manualStreet ? manualStreet + ", " : ""}${zone.area}`,
      street: manualStreet,
      area: zone.area,
      city: zone.city,
      lat: zone.geo?.lat || 6.9271,
      lng: zone.geo?.lng || 79.8612,
    });
    setActiveAddressId(addr.id);
    setShowManual(false);
    setAreaSearch("");
    setManualStreet("");
  };

  const travelInfo = activeAddress
    ? getTravelFeeForZone(activeAddress.zoneStatus)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Service Location</h3>
        {savedAddresses.length > 1 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            Change <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Active address card */}
      {activeAddress ? (
        <div className={`bg-card rounded-xl border p-4 ${
          activeAddress.zoneStatus === "outside" ? "border-destructive/30" : "border-success/30"
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              activeAddress.zoneStatus === "outside" ? "bg-destructive/10" : "bg-success/10"
            }`}>
              <MapPin className={`w-5 h-5 ${
                activeAddress.zoneStatus === "outside" ? "text-destructive" : "text-success"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{activeAddress.displayName}</p>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {ADDRESS_LABEL_OPTIONS.find((l) => l.value === activeAddress.label)?.label || "Address"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{activeAddress.area}, {activeAddress.city}</p>

              {/* Zone status */}
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    activeAddress.zoneStatus === "inside"
                      ? "bg-success/10 text-success border-success/20"
                      : activeAddress.zoneStatus === "edge"
                      ? "bg-warning/10 text-warning border-warning/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  {activeAddress.zoneStatus === "inside"
                    ? "✓ Service Available"
                    : activeAddress.zoneStatus === "edge"
                    ? "⚡ Edge Zone"
                    : "✕ Outside Coverage"}
                </Badge>

                {showTravelFee && travelInfo && travelInfo.fee >= 0 && (
                  <span className="text-[10px] text-muted-foreground">{travelInfo.label}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 rounded-xl border border-dashed p-6 text-center space-y-3">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No address saved yet</p>
        </div>
      )}

      {/* Other saved addresses */}
      {showAll && savedAddresses.length > 1 && (
        <div className="space-y-2">
          {savedAddresses.filter((a) => a.id !== activeAddressId).map((addr) => (
            <button
              key={addr.id}
              onClick={() => { setActiveAddressId(addr.id); setShowAll(false); }}
              className="w-full text-left bg-card rounded-xl border p-3 flex items-center gap-3 hover:border-primary/30 transition-colors"
            >
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{addr.displayName}</p>
                <p className="text-xs text-muted-foreground">{addr.area}</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {ADDRESS_LABEL_OPTIONS.find((l) => l.value === addr.label)?.label || "Other"}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleUseGps}
          disabled={loadingGps}
          className="flex-1 gap-1.5 text-xs"
        >
          {loadingGps ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          Use GPS
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManual(!showManual)}
          className="flex-1 gap-1.5 text-xs"
        >
          <Plus className="w-3 h-3" />
          Add Address
        </Button>
      </div>

      {/* Manual address entry */}
      {showManual && (
        <div className="bg-card rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Add New Address</h4>
            <button onClick={() => setShowManual(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Street (optional)</label>
            <Input value={manualStreet} onChange={(e) => setManualStreet(e.target.value)} placeholder="e.g. Galle Road" className="h-9 text-sm" />
          </div>

          <div className="relative space-y-1.5">
            <label className="text-xs text-muted-foreground">Area *</label>
            <Input
              value={areaSearch}
              onChange={(e) => { setAreaSearch(e.target.value); setShowAreaSearch(true); }}
              onFocus={() => areaResults.length > 0 && setShowAreaSearch(true)}
              placeholder="Search: Colombo 7, Nugegoda..."
              className="h-9 text-sm"
            />
            {showAreaSearch && areaResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-lg border shadow-lg z-50 overflow-hidden">
                {areaResults.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => handleAddManual(zone)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                  >
                    {zone.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outside zone warning */}
      {activeAddress?.zoneStatus === "outside" && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Outside Active Coverage</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This location is currently outside LankaFix active service coverage.
            </p>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="text-xs">Join Waitlist</Button>
              <Button variant="outline" size="sm" className="text-xs">Request Callback</Button>
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={onContinue}
        disabled={!activeAddress || activeAddress.zoneStatus === "outside"}
        size="lg"
        className="w-full gap-2"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default LocationPicker;
