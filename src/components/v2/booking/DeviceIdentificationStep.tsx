/**
 * Device Identification Step — First step before diagnosis.
 * Allows users to select a registered device or enter new device details.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDeviceRegistry, type DeviceRegistryItem } from "@/hooks/useDeviceRegistry";
import { Smartphone, Monitor, Snowflake, Printer, Camera, Cpu, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  categoryCode: string;
  onDeviceIdentified: (device: {
    brand: string;
    model: string;
    device_type: string;
    device_age?: number;
    purchase_year?: number;
    device_registry_id?: string;
  }) => void;
  onSkip: () => void;
  initialAnswers?: Record<string, string | boolean>;
}

const CATEGORY_DEVICE_TYPES: Record<string, { label: string; types: string[] }> = {
  MOBILE: { label: "Phone / Tablet", types: ["Smartphone", "Tablet", "Feature Phone"] },
  IT: { label: "Computer / Device", types: ["Laptop", "Desktop", "All-in-One", "Server"] },
  AC: { label: "Air Conditioner", types: ["Split AC", "Window AC", "Cassette AC", "Central AC"] },
  CCTV: { label: "Security System", types: ["IP Camera", "Analog Camera", "DVR/NVR", "Full System"] },
  COPIER: { label: "Printer / Copier", types: ["Laser Printer", "Inkjet Printer", "Copier", "MFP"] },
  CONSUMER_ELEC: { label: "Electronics", types: ["TV", "Refrigerator", "Washing Machine", "Microwave", "Other"] },
  SOLAR: { label: "Solar System", types: ["Solar Panel System", "Inverter", "Battery System"] },
  SMART_HOME_OFFICE: { label: "Smart Device", types: ["Smart Lock", "Smart Camera", "Smart Hub", "Intercom"] },
};

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  MOBILE: Smartphone, IT: Monitor, AC: Snowflake, COPIER: Printer,
  CCTV: Camera, CONSUMER_ELEC: Cpu, SOLAR: Cpu, SMART_HOME_OFFICE: Cpu,
};

const POPULAR_BRANDS: Record<string, string[]> = {
  MOBILE: ["Apple", "Samsung", "Huawei", "Xiaomi", "OnePlus", "OPPO", "Realme", "Nokia"],
  IT: ["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple", "MSI", "Toshiba"],
  AC: ["Daikin", "Panasonic", "LG", "Samsung", "Midea", "Hisense", "Singer", "Abans"],
  CCTV: ["Hikvision", "Dahua", "CP Plus", "Samsung", "Ezviz", "Reolink"],
  COPIER: ["HP", "Canon", "Epson", "Brother", "Ricoh", "Kyocera"],
  CONSUMER_ELEC: ["Samsung", "LG", "Sony", "Panasonic", "Singer", "Abans", "Hisense"],
};

export default function DeviceIdentificationStep({ categoryCode, onDeviceIdentified, onSkip, initialAnswers }: Props) {
  const { devices, loading } = useDeviceRegistry();
  const [mode, setMode] = useState<"select" | "new">("new");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [brand, setBrand] = useState((initialAnswers?.brand as string) || "");
  const [model, setModel] = useState((initialAnswers?.model as string) || "");
  const [deviceType, setDeviceType] = useState("");
  const [purchaseYear, setPurchaseYear] = useState("");

  const categoryConfig = CATEGORY_DEVICE_TYPES[categoryCode] || { label: "Device", types: ["Other"] };
  const Icon = CATEGORY_ICONS[categoryCode] || Cpu;
  const brands = POPULAR_BRANDS[categoryCode] || [];

  // Filter registry devices matching this category
  const matchingDevices = devices.filter(d => d.category_code === categoryCode);

  useEffect(() => {
    if (matchingDevices.length > 0 && !selectedDeviceId) {
      setMode("select");
    }
  }, [matchingDevices.length]);

  const handleSelectDevice = (device: DeviceRegistryItem) => {
    setSelectedDeviceId(device.id);
    onDeviceIdentified({
      brand: device.brand,
      model: device.model,
      device_type: device.device_type,
      purchase_year: device.purchase_year || undefined,
      device_age: device.purchase_year ? new Date().getFullYear() - device.purchase_year : undefined,
      device_registry_id: device.id,
    });
  };

  const handleNewDevice = () => {
    if (!brand || !model) return;
    const py = purchaseYear ? parseInt(purchaseYear) : undefined;
    onDeviceIdentified({
      brand,
      model,
      device_type: deviceType || categoryConfig.types[0],
      purchase_year: py,
      device_age: py ? new Date().getFullYear() - py : undefined,
    });
  };

  const canSubmit = brand.trim().length > 0 && model.trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Identify Your {categoryConfig.label}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        This helps us estimate repair costs and prepare the right parts.
      </p>

      {/* Registered devices */}
      {!loading && matchingDevices.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Registered Devices</Label>
          <div className="space-y-2">
            {matchingDevices.map(device => (
              <motion.button
                key={device.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectDevice(device)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selectedDeviceId === device.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{device.brand} {device.model}</p>
                  <p className="text-xs text-muted-foreground">{device.device_type}{device.purchase_year ? ` · ${device.purchase_year}` : ""}</p>
                </div>
                {selectedDeviceId === device.id && (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                )}
              </motion.button>
            ))}
          </div>
          <div className="flex items-center gap-2 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or enter new device</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>
      )}

      {/* New device form */}
      <div className="space-y-4 bg-card border rounded-xl p-4">
        <div className="space-y-2">
          <Label>Device Type</Label>
          <Select value={deviceType} onValueChange={setDeviceType}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {categoryConfig.types.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Brand *</Label>
          {brands.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {brands.map(b => (
                <Badge
                  key={b}
                  variant={brand === b ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setBrand(b)}
                >
                  {b}
                </Badge>
              ))}
            </div>
          )}
          <Input
            value={brand}
            onChange={e => setBrand(e.target.value)}
            placeholder="e.g. Samsung, Daikin, HP"
          />
        </div>

        <div className="space-y-2">
          <Label>Model *</Label>
          <Input
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="e.g. Galaxy S24, iPhone 15 Pro"
          />
        </div>

        <div className="space-y-2">
          <Label>Purchase Year (optional)</Label>
          <Select value={purchaseYear} onValueChange={setPurchaseYear}>
            <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip
        </Button>
        <Button onClick={handleNewDevice} disabled={!canSubmit} className="flex-1 gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center italic">
        Device details improve diagnosis accuracy and help your technician prepare.
      </p>
    </div>
  );
}
