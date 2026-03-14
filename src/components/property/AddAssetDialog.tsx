import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePropertyDigitalTwin } from "@/hooks/usePropertyDigitalTwin";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "AC", "CCTV", "NETWORK", "SOLAR", "COPIER", "ELECTRICAL",
  "CONSUMER_ELEC", "PLUMBING", "SMART_HOME_OFFICE", "HOME_SECURITY",
  "POWER_BACKUP", "IT", "MOBILE", "APPLIANCE_INSTALL",
];
const ROOMS = ["Living Room", "Bedroom", "Kitchen", "Office Area", "Bathroom", "Outdoor", "Garage", "Rooftop"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

export default function AddAssetDialog({ open, onOpenChange, propertyId }: Props) {
  const { addAsset } = usePropertyDigitalTwin();
  const { toast } = useToast();
  const [category, setCategory] = useState("AC");
  const [assetType, setAssetType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [room, setRoom] = useState("Living Room");
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await addAsset(propertyId, {
      asset_type: assetType || category,
      asset_category: category,
      brand: brand || null,
      model: model || null,
      location_in_property: room,
      estimated_age_years: age ? parseInt(age) : null,
      status: "operational",
      detected_via: "manual",
    });
    setSaving(false);
    if (result) {
      toast({ title: "Asset added", description: "Maintenance schedule created automatically." });
      onOpenChange(false);
      setAssetType(""); setBrand(""); setModel(""); setAge("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Asset Type</Label>
            <Input value={assetType} onChange={(e) => setAssetType(e.target.value)} placeholder="e.g. Split AC, Router" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Brand</Label><Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Optional" /></div>
            <div><Label>Model</Label><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Location</Label>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROOMS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Age (years)</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="~" min="0" /></div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "Saving…" : "Add Asset"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
