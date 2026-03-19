/**
 * LankaFix — Google Maps Provider
 * Wraps the app with LoadScript for Google Maps JS API.
 * Uses VITE_GOOGLE_MAPS_API_KEY (public, restricted by referrer).
 */
import { LoadScript, Libraries } from "@react-google-maps/api";
import { ReactNode } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const LIBRARIES: Libraries = ["places"];

interface Props {
  children: ReactNode;
}

export default function GoogleMapsProvider({ children }: Props) {
  if (!GOOGLE_MAPS_API_KEY) {
    // Graceful degradation — app works without maps
    return <>{children}</>;
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES}>
      {children}
    </LoadScript>
  );
}

export { GOOGLE_MAPS_API_KEY };
