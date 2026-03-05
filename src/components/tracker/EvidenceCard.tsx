import { useState } from "react";
import { Upload, Camera, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BookingPhoto } from "@/types/booking";
import { useBookingStore } from "@/store/bookingStore";
import { toast } from "sonner";

interface EvidenceCardProps {
  jobId: string;
  photos: BookingPhoto[];
}

const PHOTO_TYPES: { value: BookingPhoto["type"]; label: string }[] = [
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "issue", label: "Issue" },
  { value: "invoice", label: "Invoice" },
];

const EvidenceCard = ({ jobId, photos }: EvidenceCardProps) => {
  const { addBookingPhoto } = useBookingStore();
  const [selectedType, setSelectedType] = useState<BookingPhoto["type"]>("issue");

  const handleDemoUpload = () => {
    const demoPhoto: BookingPhoto = {
      url: `https://placehold.co/400x300/1e40af/ffffff?text=${selectedType.toUpperCase()}`,
      type: selectedType,
      uploadedAt: new Date().toISOString(),
    };
    addBookingPhoto(jobId, demoPhoto);
    toast.success(`${selectedType} photo added`);
  };

  return (
    <div className="bg-card rounded-xl border p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        Evidence & Photos
      </h3>

      {/* Photo type selector */}
      <div className="flex gap-1.5 mb-3">
        {PHOTO_TYPES.map((pt) => (
          <button
            key={pt.value}
            onClick={() => setSelectedType(pt.value)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
              selectedType === pt.value
                ? "bg-primary/10 border-primary/30 text-primary font-medium"
                : "bg-card text-muted-foreground hover:border-primary/20"
            }`}
          >
            {pt.label}
          </button>
        ))}
      </div>

      {/* Existing photos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((photo, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img src={photo.url} alt={photo.type} className="w-full h-full object-cover" />
              <Badge className="absolute bottom-1 left-1 text-[9px] bg-card/80 text-foreground">{photo.type}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <Button variant="outline" size="sm" className="w-full" onClick={handleDemoUpload}>
        <Upload className="w-4 h-4 mr-2" />
        Add {selectedType} Photo (Demo)
      </Button>
      <p className="text-[10px] text-muted-foreground mt-1.5">Upload before/after photos for your records and warranty claims</p>
    </div>
  );
};

export default EvidenceCard;
