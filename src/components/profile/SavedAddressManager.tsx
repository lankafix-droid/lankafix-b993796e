/**
 * SavedAddressManager — manage saved addresses with current-location support.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Trash2, Navigation, Home, Building2, MapPinned, Loader2 } from "lucide-react";
import { useCustomerProfile, type SavedAddress } from "@/hooks/useCustomerProfile";
import { toast } from "sonner";

const SRI_LANKA_DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
  "Mullaitivu", "Vavuniya", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Monaragala", "Ratnapura", "Kegalle",
];

const LABEL_ICONS: Record<string, React.ReactNode> = {
  Home: <Home className="w-4 h-4" />,
  Office: <Building2 className="w-4 h-4" />,
  Other: <MapPinned className="w-4 h-4" />,
};

interface Props {
  onSelect?: (address: SavedAddress) => void;
  selectable?: boolean;
}

export default function SavedAddressManager({ onSelect, selectable }: Props) {
  const { addresses, saveAddress, deleteAddress } = useCustomerProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    label: "Home",
    address_line_1: "",
    address_line_2: "",
    city: "",
    district: "",
    landmark: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        toast.success("Location captured — please confirm your address details");
        setLocating(false);
      },
      () => {
        toast.error("Could not get location. Please enter manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!form.address_line_1 || !form.city) {
      toast.error("Please enter address and city");
      return;
    }
    await saveAddress.mutateAsync({
      label: form.label,
      address_line_1: form.address_line_1,
      address_line_2: form.address_line_2 || null,
      city: form.city,
      district: form.district || null,
      landmark: form.landmark || null,
      latitude: form.latitude,
      longitude: form.longitude,
      zone_code: null,
      is_default: addresses.length === 0,
    });
    setDialogOpen(false);
    setForm({ label: "Home", address_line_1: "", address_line_2: "", city: "", district: "", landmark: "", latitude: null, longitude: null });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Saved Addresses
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add Address</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                {["Home", "Office", "Other"].map((l) => (
                  <Button
                    key={l}
                    type="button"
                    variant={form.label === l ? "default" : "outline"}
                    size="sm"
                    className="rounded-xl gap-1 flex-1"
                    onClick={() => setForm((p) => ({ ...p, label: l }))}
                  >
                    {LABEL_ICONS[l]} {l}
                  </Button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={handleUseCurrentLocation}
                disabled={locating}
              >
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                Use Current Location
              </Button>

              <div>
                <Label className="text-xs">Address Line 1 *</Label>
                <Input value={form.address_line_1} onChange={(e) => setForm((p) => ({ ...p, address_line_1: e.target.value }))} className="rounded-xl" placeholder="House No, Street" />
              </div>
              <div>
                <Label className="text-xs">Address Line 2</Label>
                <Input value={form.address_line_2} onChange={(e) => setForm((p) => ({ ...p, address_line_2: e.target.value }))} className="rounded-xl" placeholder="Apartment, Suite (optional)" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">City *</Label>
                  <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="rounded-xl" placeholder="City" />
                </div>
                <div>
                  <Label className="text-xs">District</Label>
                  <Select value={form.district} onValueChange={(v) => setForm((p) => ({ ...p, district: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="District" /></SelectTrigger>
                    <SelectContent>
                      {SRI_LANKA_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Landmark (optional)</Label>
                <Input value={form.landmark} onChange={(e) => setForm((p) => ({ ...p, landmark: e.target.value }))} className="rounded-xl" placeholder="Near temple, junction, etc." />
              </div>

              {form.latitude && (
                <p className="text-xs text-muted-foreground">📍 Location: {form.latitude.toFixed(4)}, {form.longitude?.toFixed(4)}</p>
              )}

              <Button onClick={handleSave} disabled={saveAddress.isPending} className="w-full rounded-xl">
                {saveAddress.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Address
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No saved addresses yet</p>
      )}

      {addresses.map((addr) => (
        <div
          key={addr.id}
          onClick={() => selectable && onSelect?.(addr)}
          className={`p-3 rounded-xl border ${selectable ? "cursor-pointer hover:border-primary/50 hover:bg-primary/5" : ""} ${addr.is_default ? "border-primary/30 bg-primary/5" : "border-border"}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {LABEL_ICONS[addr.label] || <MapPin className="w-4 h-4" />}
              <div>
                <span className="text-sm font-medium">{addr.label}</span>
                {addr.is_default && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); deleteAddress.mutate(addr.id); }} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {[addr.address_line_1, addr.address_line_2, addr.city, addr.district].filter(Boolean).join(", ")}
          </p>
          {addr.landmark && <p className="text-xs text-muted-foreground">Near: {addr.landmark}</p>}
        </div>
      ))}
    </div>
  );
}
