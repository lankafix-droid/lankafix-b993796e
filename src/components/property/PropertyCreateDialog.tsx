import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePropertyDigitalTwin } from "@/hooks/usePropertyDigitalTwin";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PropertyCreateDialog({ open, onOpenChange }: Props) {
  const { createProperty } = usePropertyDigitalTwin();
  const { toast } = useToast();
  const [name, setName] = useState("My Home");
  const [type, setType] = useState("house");
  const [floors, setFloors] = useState("1");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    const result = await createProperty({
      property_name: name,
      property_type: type,
      floor_count: parseInt(floors) || 1,
      location: location || null,
      approximate_size_sqft: size ? parseInt(size) : null,
    });
    setSaving(false);
    if (result) {
      toast({ title: "Property created", description: "Your Digital Twin is ready." });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Property Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Property Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Home" />
          </div>
          <div>
            <Label>Property Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="shop">Shop</SelectItem>
                <SelectItem value="factory">Factory</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Floors</Label>
              <Input type="number" value={floors} onChange={(e) => setFloors(e.target.value)} min="1" />
            </div>
            <div>
              <Label>Size (sq ft)</Label>
              <Input type="number" value={size} onChange={(e) => setSize(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Colombo 7" />
          </div>
          <Button onClick={handleCreate} disabled={saving || !name.trim()} className="w-full">
            {saving ? "Creating…" : "Create Property"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
