import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Image as ImageIcon } from "lucide-react";
import { track } from "@/lib/analytics";

interface Props {
  onPhotosChange: (photos: string[]) => void;
  photos: string[];
}

const DiagnosePhotoUpload = ({ onPhotosChange, photos }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const updated = [...photos, dataUrl];
        onPhotosChange(updated);
        track("diagnose_photo_uploaded", { count: updated.length });
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Upload Photos (Optional)</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Photos help our technicians prepare — e.g., water leakage, screen damage, error messages.
      </p>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden aspect-square border bg-muted">
              <img src={photo} alt={`Issue photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => fileRef.current?.click()}
        disabled={photos.length >= 5}
      >
        <ImageIcon className="w-4 h-4 mr-1.5" />
        {photos.length === 0 ? "Add Photos" : `Add More (${photos.length}/5)`}
      </Button>
    </div>
  );
};

export default DiagnosePhotoUpload;
