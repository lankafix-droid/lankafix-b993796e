import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { COLOMBO_AREAS_DISPLAY } from "@/data/colomboZones";
import { MapPin, ChevronDown, ChevronUp, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const STORAGE_KEY = "lankafix_area";

const AVAILABLE_AREAS = [
  "Colombo 1–15", "Nugegoda", "Rajagiriya", "Battaramulla",
  "Dehiwala", "Mount Lavinia", "Nawala", "Kotte", "Maharagama",
  "Wattala", "Kaduwela", "Malabe", "Piliyandala", "Moratuwa",
  "Boralesgamuwa", "Athurugiriya", "Thalawathugoda",
];

const COMING_SOON_AREAS = [
  "Negombo", "Kandy", "Galle", "Matara", "Kurunegala", "Kalutara",
];

function loadArea(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "Greater Colombo";
  } catch {
    return "Greater Colombo";
  }
}

const GeoStrip = () => {
  const [expanded, setExpanded] = useState(false);
  const [selectedArea, setSelectedArea] = useState(loadArea);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, selectedArea); } catch { /* noop */ }
  }, [selectedArea]);

  const visibleAreas = expanded ? COLOMBO_AREAS_DISPLAY : COLOMBO_AREAS_DISPLAY.slice(0, 5);

  const handleComingSoon = (area: string) => {
    track("zone_coming_soon_tap", { area });
    toast.info(`Service launching soon in ${area}. Join our waiting list!`);
  };

  return (
    <section className="bg-primary text-primary-foreground py-3">
      <div className="container">
        {/* Main row */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="font-semibold">Now serving: {selectedArea}</span>

          <Dialog>
            <DialogTrigger asChild>
              <button
                className="text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1"
                aria-label="Switch service area"
                onClick={() => track("zone_switch_open")}
              >
                <MapPinned className="w-3 h-3" />
                Switch area
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Select your area</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Available now</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_AREAS.map((area) => (
                      <button
                        key={area}
                        aria-label={`Select ${area}`}
                        onClick={() => {
                          setSelectedArea(area);
                          track("zone_change", { area });
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          selectedArea === area
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Coming soon</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMING_SOON_AREAS.map((area) => (
                      <button
                        key={area}
                        aria-label={`${area} — coming soon`}
                        onClick={() => handleComingSoon(area)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground bg-muted opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Expandable area list */}
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 mt-1.5 text-xs text-primary-foreground/70">
          {visibleAreas.map((area, i) => (
            <span key={area}>
              {area}{i < visibleAreas.length - 1 ? " •" : ""}
            </span>
          ))}
          {COLOMBO_AREAS_DISPLAY.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Show fewer areas" : "Show more areas"}
              className="inline-flex items-center gap-0.5 text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors ml-1"
            >
              {expanded ? (
                <>Less <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>+{COLOMBO_AREAS_DISPLAY.length - 5} more <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>

        {/* Waitlist CTA */}
        <div className="text-center mt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 bg-transparent border-primary-foreground/20 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            asChild
          >
            <Link to="/waitlist" aria-label="Join waiting list" onClick={() => track("waitlist_click")}>
              Outside Colombo? Join the waiting list
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GeoStrip;
