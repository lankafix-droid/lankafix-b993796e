import { useState } from "react";
import { Link } from "react-router-dom";
import { COLOMBO_AREAS_DISPLAY } from "@/data/colomboZones";
import { MapPin, ChevronDown, ChevronUp, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AVAILABLE_AREAS = [
  "Colombo 1–15", "Nugegoda", "Rajagiriya", "Battaramulla",
  "Dehiwala", "Mount Lavinia", "Nawala", "Kotte", "Maharagama",
  "Wattala", "Kaduwela", "Malabe", "Piliyandala", "Moratuwa",
  "Boralesgamuwa", "Athurugiriya", "Thalawathugoda",
];

const COMING_SOON_AREAS = [
  "Negombo", "Kandy", "Galle", "Matara", "Kurunegala", "Kalutara",
];

const GeoStrip = () => {
  const [expanded, setExpanded] = useState(false);
  const [selectedArea, setSelectedArea] = useState("Greater Colombo");

  const visibleAreas = expanded ? COLOMBO_AREAS_DISPLAY : COLOMBO_AREAS_DISPLAY.slice(0, 5);

  return (
    <section className="bg-primary text-primary-foreground py-3">
      <div className="container">
        {/* Main row */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="font-semibold">Now serving: {selectedArea}</span>

          {/* Switch area */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1"
                onClick={() => console.log("[analytics] zone_switch_open")}
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
                        onClick={() => {
                          setSelectedArea(area);
                          console.log("[analytics] zone_change", area);
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
                      <span
                        key={area}
                        className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground bg-muted opacity-60"
                      >
                        {area}
                      </span>
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
            <Link to="/waitlist" onClick={() => console.log("[analytics] waitlist_click")}>
              Outside Colombo? Join the waiting list
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GeoStrip;
