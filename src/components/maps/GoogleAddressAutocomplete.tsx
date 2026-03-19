/**
 * LankaFix — Google Places Address Autocomplete
 * Sri Lanka-scoped address search with zone validation.
 * Falls back to manual entry if Maps API unavailable.
 */
import { useRef, useCallback } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { validateServiceZone } from "@/store/locationStore";
import { useGoogleMapsLoaded } from "./GoogleMapsProvider";

export interface PlaceResult {
  lat: number;
  lng: number;
  address: string;
  area?: string;
  city?: string;
  zoneId?: string | null;
  zoneStatus?: "inside" | "edge" | "outside";
}

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function GoogleAddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search address in Colombo...",
  className = "",
  disabled = false,
}: Props) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const address = place.formatted_address || place.name || "";

    // Extract area/city from address components
    let area = "";
    let city = "";
    place.address_components?.forEach((c) => {
      if (c.types.includes("sublocality_level_1") || c.types.includes("sublocality")) {
        area = c.long_name;
      }
      if (c.types.includes("locality")) {
        city = c.long_name;
      }
    });

    // Validate against LankaFix service zones
    const zoneValidation = validateServiceZone(lat, lng);

    onPlaceSelect({
      lat,
      lng,
      address,
      area: area || undefined,
      city: city || "Colombo",
      zoneId: zoneValidation.zoneId,
      zoneStatus: zoneValidation.status,
    });

    onChange?.(address);
  }, [onPlaceSelect, onChange]);

  const mapsLoaded = useGoogleMapsLoaded();

  // Fallback to plain input if no API key
  if (!mapsLoaded) {
    return (
      <div className={`relative ${className}`}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          componentRestrictions: { country: "lk" },
          fields: ["geometry", "formatted_address", "name", "address_components"],
          types: ["address"],
        }}
      >
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          disabled={disabled}
        />
      </Autocomplete>
    </div>
  );
}
