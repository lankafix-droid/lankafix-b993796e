/**
 * LankaFix Location Bar
 * Compact location indicator shown on the home screen header area.
 * Allows switching saved addresses or triggering location setup.
 */
import { useState } from "react";
import { MapPin, ChevronDown, Navigation, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useLocationStore,
  ADDRESS_LABEL_OPTIONS,
  requestCurrentPosition,
  validateServiceZone,
} from "@/store/locationStore";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";

interface Props {
  onSetupLocation?: () => void;
}

const LocationBar = ({ onSetupLocation }: Props) => {
  const {
    savedAddresses,
    activeAddressId,
    setActiveAddressId,
    locationSetupComplete,
    addAddress,
    setCurrentPosition,
    setPermissionState,
  } = useLocationStore();

  const [showDropdown, setShowDropdown] = useState(false);

  const activeAddress = savedAddresses.find((a) => a.id === activeAddressId) || savedAddresses[0];

  const handleQuickGps = async () => {
    try {
      const pos = await requestCurrentPosition();
      setPermissionState("granted");
      setCurrentPosition(pos);
      const zone = validateServiceZone(pos.lat, pos.lng);
      const zoneData = COLOMBO_ZONES_DATA.find((z) => z.id === zone.zoneId);
      const addr = addAddress({
        label: "other",
        displayName: zoneData?.area || "Current Location",
        area: zoneData?.area || "Colombo",
        city: zoneData?.city || "Colombo",
        lat: pos.lat,
        lng: pos.lng,
      });
      setActiveAddressId(addr.id);
    } catch {
      setPermissionState("denied");
    }
    setShowDropdown(false);
  };

  if (!locationSetupComplete && !activeAddress) {
    return (
      <button
        onClick={onSetupLocation}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MapPin className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium">Set your location</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MapPin className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium text-foreground max-w-[140px] truncate">
          {activeAddress?.area || "Greater Colombo"}
        </span>
        {activeAddress?.zoneStatus === "inside" && (
          <Badge variant="outline" className="text-[8px] py-0 px-1 bg-success/10 text-success border-success/20 hidden sm:inline-flex">
            ✓
          </Badge>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-card rounded-xl border shadow-xl z-50 overflow-hidden">
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => {
                  setActiveAddressId(addr.id);
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-border/30 last:border-0 ${
                  addr.id === activeAddressId ? "bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <MapPin className={`w-4 h-4 shrink-0 ${
                  addr.id === activeAddressId ? "text-primary" : "text-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{addr.displayName || addr.area}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ADDRESS_LABEL_OPTIONS.find((l) => l.value === addr.label)?.label}
                    {addr.zoneStatus === "inside" ? " · Available" : addr.zoneStatus === "edge" ? " · Edge Zone" : " · Outside"}
                  </p>
                </div>
              </button>
            ))}

            <button
              onClick={handleQuickGps}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/30"
            >
              <Navigation className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-primary font-medium">Use Current Location</span>
            </button>

            <button
              onClick={() => { setShowDropdown(false); onSetupLocation?.(); }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Add New Address</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LocationBar;
