/**
 * LankaFix Location Setup Flow
 * Post-login location permission + address confirmation + save flow.
 * Mobile-first, privacy-respecting, clean UX.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin, Navigation, Search, CheckCircle2, ArrowRight, Shield,
  Home, Building2, Building, Users, Pencil, X, AlertTriangle, Loader2,
} from "lucide-react";
import {
  useLocationStore,
  requestCurrentPosition,
  validateServiceZone,
  ADDRESS_LABEL_OPTIONS,
  type AddressLabel,
  type GeoPosition,
} from "@/store/locationStore";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";

interface Props {
  onComplete: () => void;
  onSkip?: () => void;
}

type SetupStep = "permission" | "confirm" | "details" | "done";

const LABEL_ICONS: Record<AddressLabel, React.ReactNode> = {
  home: <Home className="w-4 h-4" />,
  office: <Building2 className="w-4 h-4" />,
  apartment: <Building className="w-4 h-4" />,
  parents: <Users className="w-4 h-4" />,
  other: <MapPin className="w-4 h-4" />,
};

/** Reverse-geocode a position to nearest known zone */
function reverseGeocode(pos: GeoPosition) {
  const validation = validateServiceZone(pos.lat, pos.lng);
  const zone = COLOMBO_ZONES_DATA.find((z) => z.id === validation.zoneId);
  return {
    area: zone?.area || "Unknown Area",
    city: zone?.city || "Colombo",
    zoneLabel: zone?.label || "Unknown",
    ...validation,
  };
}

const LocationSetupFlow = ({ onComplete, onSkip }: Props) => {
  const {
    setPermissionState, setCurrentPosition, addAddress, setLocationSetupComplete,
  } = useLocationStore();

  const [step, setStep] = useState<SetupStep>("permission");
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [geoInfo, setGeoInfo] = useState<ReturnType<typeof reverseGeocode> | null>(null);

  // Manual address fields
  const [manualMode, setManualMode] = useState(false);
  const [manualArea, setManualArea] = useState("");
  const [manualStreet, setManualStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [landmark, setLandmark] = useState("");
  const [floor, setFloor] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<AddressLabel>("home");
  const [areaSearch, setAreaSearch] = useState("");
  const [showAreaResults, setShowAreaResults] = useState(false);

  // Area search results
  const areaResults = areaSearch.length >= 2
    ? COLOMBO_ZONES_DATA.filter(
        (z) =>
          z.label.toLowerCase().includes(areaSearch.toLowerCase()) ||
          z.area.toLowerCase().includes(areaSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  // ─── Step 1: Permission ───────────────────────────────────
  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      const pos = await requestCurrentPosition();
      setPermissionState("granted");
      setCurrentPosition(pos);
      setPosition(pos);
      const info = reverseGeocode(pos);
      setGeoInfo(info);
      setManualArea(info.area);
      setStep("confirm");
    } catch {
      setPermissionState("denied");
      setManualMode(true);
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    setPermissionState("denied");
    setManualMode(true);
    setStep("confirm");
  };

  // ─── Step 2: Area selection via search ─────────────────────
  const handleSelectArea = (zone: typeof COLOMBO_ZONES_DATA[0]) => {
    setManualArea(zone.area);
    setAreaSearch(zone.label);
    setShowAreaResults(false);
    if (zone.geo) {
      setPosition({ lat: zone.geo.lat, lng: zone.geo.lng });
      setGeoInfo(reverseGeocode({ lat: zone.geo.lat, lng: zone.geo.lng }));
    }
  };

  // ─── Step 3: Save address ─────────────────────────────────
  const handleSaveAddress = () => {
    const lat = position?.lat || 6.9271;
    const lng = position?.lng || 79.8612;
    const area = manualArea || geoInfo?.area || "Colombo";
    const city = geoInfo?.city || "Colombo";

    addAddress({
      label: selectedLabel,
      displayName: `${houseNumber ? houseNumber + ", " : ""}${manualStreet ? manualStreet + ", " : ""}${area}`,
      houseNumber,
      street: manualStreet,
      area,
      city,
      landmark,
      floor,
      accessNotes,
      lat,
      lng,
    });

    setLocationSetupComplete(true);
    setStep("done");
  };

  // ─── Step: Permission ─────────────────────────────────────
  if (step === "permission") {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Set Your Service Location</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Use your current location to find nearby LankaFix technicians and faster service availability
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleUseCurrentLocation}
            disabled={loading}
            size="lg"
            className="w-full gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {loading ? "Detecting location..." : "Use Current Location"}
          </Button>

          <Button
            onClick={handleManualEntry}
            variant="outline"
            size="lg"
            className="w-full gap-2"
          >
            <Pencil className="w-4 h-4" />
            Enter Address Manually
          </Button>

          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>

        <div className="bg-muted/30 rounded-xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            LankaFix uses your location to show service availability, assign nearby technicians, and improve ETA accuracy. We do not continuously track your location.
          </p>
        </div>
      </div>
    );
  }

  // ─── Step: Confirm / Edit Location ────────────────────────
  if (step === "confirm") {
    return (
      <div className="space-y-5 py-4">
        <h2 className="text-xl font-bold text-foreground">Confirm Your Location</h2>

        {/* Map-like area display */}
        <div className="relative bg-muted/30 rounded-2xl overflow-hidden h-48 flex items-center justify-center border">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-primary/10" />
          <div className="text-center z-10 space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6 text-primary-foreground" />
            </div>
            {geoInfo && !manualMode ? (
              <>
                <p className="text-sm font-medium text-foreground">{geoInfo.area}</p>
                <p className="text-xs text-muted-foreground">{geoInfo.city}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Search your area below</p>
            )}
          </div>

          {/* Zone status badge */}
          {geoInfo && (
            <div className="absolute top-3 right-3">
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  geoInfo.status === "inside"
                    ? "bg-success/10 text-success border-success/20"
                    : geoInfo.status === "edge"
                    ? "bg-warning/10 text-warning border-warning/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }`}
              >
                {geoInfo.status === "inside"
                  ? "✓ Service Available"
                  : geoInfo.status === "edge"
                  ? "Edge Zone"
                  : "Outside Coverage"}
              </Badge>
            </div>
          )}
        </div>

        {/* Area search */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-card rounded-xl border p-3">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search area: Colombo 7, Nugegoda, Dehiwala..."
              value={areaSearch}
              onChange={(e) => {
                setAreaSearch(e.target.value);
                setShowAreaResults(true);
              }}
              onFocus={() => areaResults.length > 0 && setShowAreaResults(true)}
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            {areaSearch && (
              <button onClick={() => { setAreaSearch(""); setShowAreaResults(false); }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {showAreaResults && areaResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border shadow-xl z-50 overflow-hidden">
              {areaResults.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => handleSelectArea(zone)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 flex items-center gap-3"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{zone.label}</p>
                    <p className="text-xs text-muted-foreground">{zone.city}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Outside zone warning with lead capture */}
        {geoInfo?.status === "outside" && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Outside Service Coverage</p>
                <p className="text-xs text-muted-foreground mt-1">
                  LankaFix is currently launching in selected areas of Greater Colombo.
                  We will notify you when services expand to your location.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={async () => {
                try {
                  await supabase.from("notification_events").insert({
                    event_type: "zone_expansion_lead",
                    metadata: {
                      area: manualArea || geoInfo?.area,
                      lat: position?.lat,
                      lng: position?.lng,
                      zone_label: geoInfo?.zoneLabel,
                      captured_at: new Date().toISOString(),
                    },
                  });
                  alert("Thanks! We'll notify you when LankaFix launches in your area.");
                } catch {
                  // silent fail
                }
              }}
            >
              Notify Me When Available
            </Button>
          </div>
        )}

        <Button
          onClick={() => setStep("details")}
          disabled={!manualArea && !geoInfo}
          size="lg"
          className="w-full gap-2"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // ─── Step: Address Details & Label ────────────────────────
  if (step === "details") {
    return (
      <div className="space-y-5 py-4">
        <h2 className="text-xl font-bold text-foreground">Address Details</h2>
        <p className="text-sm text-muted-foreground">Help our technician find your exact location</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">House / Unit No.</label>
              <Input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} placeholder="e.g. 42A" className="bg-card" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Floor / Level</label>
              <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 3rd floor" className="bg-card" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Street</label>
            <Input value={manualStreet} onChange={(e) => setManualStreet(e.target.value)} placeholder="e.g. Galle Road" className="bg-card" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Area</label>
            <Input value={manualArea} onChange={(e) => setManualArea(e.target.value)} placeholder="e.g. Bambalapitiya" className="bg-card" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Landmark (optional)</label>
            <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Near Majestic City" className="bg-card" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Access Notes (optional)</label>
            <Input value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} placeholder="e.g. Ring bell at gate" className="bg-card" />
          </div>
        </div>

        {/* Label selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Save as</label>
          <div className="flex flex-wrap gap-2">
            {ADDRESS_LABEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedLabel(opt.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  selectedLabel === opt.value
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                {LABEL_ICONS[opt.value]}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSaveAddress} size="lg" className="w-full gap-2">
          Save Address <CheckCircle2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // ─── Step: Done ───────────────────────────────────────────
  return (
    <div className="space-y-6 py-8 text-center">
      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10 text-success" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Location Saved!</h2>
        <p className="text-muted-foreground mt-1">
          {geoInfo?.status === "inside"
            ? "Great news — LankaFix services are available in your area."
            : geoInfo?.status === "edge"
            ? "You're at the edge of our coverage. A small travel fee may apply."
            : "We'll notify you when LankaFix launches in your area."}
        </p>
      </div>

      {geoInfo && geoInfo.status !== "outside" && (
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">{manualArea || geoInfo.area}</p>
            <p className="text-xs text-muted-foreground">{geoInfo.city}</p>
          </div>
          <Badge variant="outline" className="ml-auto text-[10px] bg-success/10 text-success border-success/20">
            Available
          </Badge>
        </div>
      )}

      <Button onClick={onComplete} size="lg" className="w-full gap-2">
        Continue to LankaFix <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default LocationSetupFlow;
