import { MapPin } from "lucide-react";
import { colomboAreas } from "@/data/mockData";

const GeoStrip = () => {
  return (
    <section className="bg-primary text-primary-foreground py-3">
      <div className="container flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
        <MapPin className="w-4 h-4 shrink-0" />
        <span className="font-semibold">Now serving: Greater Colombo</span>
        <span className="hidden sm:inline text-primary-foreground/60">|</span>
        <span className="text-primary-foreground/80 text-center">
          {colomboAreas.join(" • ")}
        </span>
      </div>
      <div className="container text-center mt-1">
        <button className="text-xs text-primary-foreground/60 underline hover:text-primary-foreground/80 transition-colors">
          Outside Colombo? Join the waiting list
        </button>
      </div>
    </section>
  );
};

export default GeoStrip;
