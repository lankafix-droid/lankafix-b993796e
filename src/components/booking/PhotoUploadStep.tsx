import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  userId?: string;
}

const MAX_PHOTOS = 5;

const PhotoUploadStep = ({ photos, onPhotosChange, userId }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const folder = userId || "anonymous";
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("booking-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Upload failed:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("booking-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = Array.from(files).slice(0, remaining);

    setUploading(true);
    const urls: string[] = [];

    for (const file of toUpload) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }

    if (urls.length > 0) {
      onPhotosChange([...photos, ...urls]);
    }
    if (urls.length < toUpload.length) {
      toast({ title: "Some photos failed to upload", description: "Please try again.", variant: "destructive" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Upload Photos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Photos help our technicians prepare — e.g., visible damage, error messages, affected area.
        </p>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden aspect-square border border-border/50 bg-muted">
              <img src={url} alt={`Issue photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur-sm rounded-full p-1"
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
        className="w-full"
        onClick={() => fileRef.current?.click()}
        disabled={photos.length >= MAX_PHOTOS || uploading}
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Uploading…</>
        ) : (
          <><ImageIcon className="w-4 h-4 mr-1.5" /> {photos.length === 0 ? "Add Photos (Optional)" : `Add More (${photos.length}/${MAX_PHOTOS})`}</>
        )}
      </Button>
    </div>
  );
};

export default PhotoUploadStep;
