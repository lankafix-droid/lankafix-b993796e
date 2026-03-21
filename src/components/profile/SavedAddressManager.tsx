/**
 * SavedAddressManager — Enhanced with Phase-1 serviceability chips,
 * edit mode, default protection, and reverse geocoding display.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapPin, Plus, Trash2, Navigation, Home, Building2, MapPinned, Loader2, Star, Pencil, AlertTriangle } from "lucide-react";
import { useCustomerProfile, type SavedAddress } from "@/hooks/useCustomerProfile";
import { checkServiceability } from "@/lib/serviceabilityEngine";
import ServiceabilityBadge from "@/components/profile/ServiceabilityBadge";
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

interface AddressForm {
  label: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  district: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  floor_or_unit: string;
  parking_notes: string;
  access_notes: string;
}

const EMPTY_FORM: AddressForm = {
  label: "Home", address_line_1: "", address_line_2: "", city: "", district: "",
  landmark: "", latitude: null, longitude: null, floor_or_unit: "", parking_notes: "", access_notes: "",
};

interface Props {
  onSelect?: (address: SavedAddress) => void;
  selectable?: boolean;
}

export default function SavedAddressManager({ onSelect, selectable }: Props) {
  const { addresses, saveAddress, updateAddress, deleteAddress, setDefaultAddress } = useCustomerProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSheet, setEditSheet] = useState<SavedAddress | null>(null);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState<AddressForm>({ ...EMPTY_FORM });

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error("Location not supported on this device"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
        const svc = checkServiceability(lat, lng);
        if (svc.phase1Serviceable) {
          toast.success(`Location captured — ${svc.zone?.label || "Phase-1 zone"}`);
        } else {
          toast.info("Location captured — outside Phase-1 coverage");
        }
        setLocating(false);
      },
      () => { toast.error("Could not get location"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!form.address_line_1 || !form.city) { toast.error("Address line 1 and city are required"); return; }
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
      service_zone: null,
      phase1_serviceable: null,
      floor_or_unit: form.floor_or_unit || null,
      parking_notes: form.parking_notes || null,
      access_notes: form.access_notes || null,
    });
    setDialogOpen(false);
    setForm({ ...EMPTY_FORM });
  };

  const handleUpdate = async () => {
    if (!editSheet) return;
    await updateAddress.mutateAsync({
      id: editSheet.id,
      address_line_1: form.address_line_1 || null,
      address_line_2: form.address_line_2 || null,
      city: form.city || null,
      district: form.district || null,
      landmark: form.landmark || null,
      latitude: form.latitude,
      longitude: form.longitude,
      floor_or_unit: form.floor_or_unit || null,
      parking_notes: form.parking_notes || null,
      access_notes: form.access_notes || null,
    } as any);
    setEditSheet(null);
  };

  const openEdit = (addr: SavedAddress) => {
    setForm({
      label: addr.label,
      address_line_1: addr.address_line_1 || "",
      address_line_2: addr.address_line_2 || "",
      city: addr.city || "",
      district: addr.district || "",
      landmark: addr.landmark || "",
      latitude: addr.latitude,
      longitude: addr.longitude,
      floor_or_unit: addr.floor_or_unit || "",
      parking_notes: addr.parking_notes || "",
      access_notes: addr.access_notes || "",
    });
    setEditSheet(addr);
  };

  const handleDelete = (addr: SavedAddress) => {
    if (addr.is_default && addresses.length > 1) {
      toast.error("Set another address as default before deleting this one");
      return;
    }
    deleteAddress.mutate(addr.id);
  };

  const serviceabilityFor = (addr: SavedAddress) => {
    if (addr.phase1_serviceable === true) return "inside";
    if (addr.phase1_serviceable === false) return "outside";
    if (addr.latitude && addr.longitude) {
      return checkServiceability(addr.latitude, addr.longitude).status;
    }
    return null;
  };

  const AddressFormFields = () => (
    <div className="space-y-3">
      <div className="flex gap-2">
        {["Home", "Office", "Other"].map(l => (
          <Button key={l} type="button" variant={form.label === l ? "default" : "outline"} size="sm"
            className="rounded-xl gap-1 flex-1" onClick={() => setForm(p => ({ ...p, label: l }))}>
            {LABEL_ICONS[l]} {l}
          </Button>
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full rounded-xl gap-2" onClick={handleUseCurrentLocation} disabled={locating}>
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
        Use Current Location
      </Button>

      {form.latitude && (
        <ServiceabilityBadge status={checkServiceability(form.latitude, form.longitude!).status} />
      )}

      <div>
        <Label className="text-xs">Address Line 1 *</Label>
        <Input value={form.address_line_1} onChange={e => setForm(p => ({ ...p, address_line_1: e.target.value }))} className="rounded-xl" placeholder="House No, Street" />
      </div>
      <div>
        <Label className="text-xs">Address Line 2</Label>
        <Input value={form.address_line_2} onChange={e => setForm(p => ({ ...p, address_line_2: e.target.value }))} className="rounded-xl" placeholder="Apartment, Suite" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">City *</Label>
          <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="rounded-xl" placeholder="City" />
        </div>
        <div>
          <Label className="text-xs">District</Label>
          <Select value={form.district} onValueChange={v => setForm(p => ({ ...p, district: v }))}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="District" /></SelectTrigger>
            <SelectContent>{SRI_LANKA_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Landmark</Label>
        <Input value={form.landmark} onChange={e => setForm(p => ({ ...p, landmark: e.target.value }))} className="rounded-xl" placeholder="Near temple, junction" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Floor / Unit</Label>
          <Input value={form.floor_or_unit} onChange={e => setForm(p => ({ ...p, floor_or_unit: e.target.value }))} className="rounded-xl" placeholder="3rd floor" />
        </div>
        <div>
          <Label className="text-xs">Parking Notes</Label>
          <Input value={form.parking_notes} onChange={e => setForm(p => ({ ...p, parking_notes: e.target.value }))} className="rounded-xl" placeholder="Street parking" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Access Notes</Label>
        <Input value={form.access_notes} onChange={e => setForm(p => ({ ...p, access_notes: e.target.value }))} className="rounded-xl" placeholder="Gate code, buzzer" />
      </div>
    </div>
  );

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
          <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Address</DialogTitle></DialogHeader>
            <AddressFormFields />
            <Button onClick={handleSave} disabled={saveAddress.isPending} className="w-full rounded-xl mt-3">
              {saveAddress.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Address
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 && (
        <div className="text-center py-6 space-y-2">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground">No saved addresses yet</p>
          <p className="text-[10px] text-muted-foreground">Add an address to check Phase-1 coverage</p>
        </div>
      )}

      {addresses.map(addr => {
        const svcStatus = serviceabilityFor(addr);
        return (
          <div
            key={addr.id}
            onClick={() => selectable && onSelect?.(addr)}
            className={`p-3 rounded-xl border transition-colors ${selectable ? "cursor-pointer hover:border-primary/50 hover:bg-primary/5" : ""} ${addr.is_default ? "border-primary/30 bg-primary/5" : "border-border"}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {LABEL_ICONS[addr.label] || <MapPin className="w-4 h-4" />}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{addr.label}</span>
                  {addr.is_default && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Default</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!addr.is_default && (
                  <button onClick={(e) => { e.stopPropagation(); setDefaultAddress.mutate(addr.id); }}
                    className="text-muted-foreground hover:text-primary p-1" title="Set as default">
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); openEdit(addr); }}
                  className="text-muted-foreground hover:text-foreground p-1">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(addr); }}
                  className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {[addr.address_line_1, addr.address_line_2, addr.city, addr.district].filter(Boolean).join(", ")}
            </p>
            {addr.landmark && <p className="text-xs text-muted-foreground">Near: {addr.landmark}</p>}
            {(addr.floor_or_unit || addr.parking_notes) && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {[addr.floor_or_unit && `Floor: ${addr.floor_or_unit}`, addr.parking_notes && `Parking: ${addr.parking_notes}`].filter(Boolean).join(" · ")}
              </p>
            )}
            {svcStatus && (
              <div className="mt-1.5">
                <ServiceabilityBadge status={svcStatus} compact />
              </div>
            )}
          </div>
        );
      })}

      {/* Edit Sheet */}
      <Sheet open={!!editSheet} onOpenChange={v => !v && setEditSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Address</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <AddressFormFields />
            <Button onClick={handleUpdate} disabled={updateAddress.isPending} className="w-full rounded-xl mt-4">
              {updateAddress.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Address
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
