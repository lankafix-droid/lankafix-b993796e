/**
 * LankaFix AC Installation Add-Ons
 * Standard package and add-on pricing for AC installation.
 */

export interface ACInstallAddon {
  id: string;
  label: string;
  description: string;
  unit: string;
  pricePerUnit: number;
  defaultQty: number;
  maxQty: number;
}

export interface ACStandardPackage {
  label: string;
  includes: string[];
  basePrice: number;
}

export const AC_STANDARD_INSTALL: ACStandardPackage = {
  label: "Standard AC Installation",
  includes: [
    "Up to 3 meters copper pipe",
    "Basic wall mounting bracket",
    "Basic drainage setup",
    "Electrical connection (existing point)",
    "Gas charging & testing",
  ],
  basePrice: 12000,
};

export const AC_INSTALL_ADDONS: ACInstallAddon[] = [
  {
    id: "extra_copper",
    label: "Extra Copper Pipe",
    description: "Additional copper piping beyond 3m included",
    unit: "per meter",
    pricePerUnit: 2500,
    defaultQty: 0,
    maxQty: 20,
  },
  {
    id: "drain_pipe",
    label: "Drain Pipe Extension",
    description: "Additional drain pipe beyond standard length",
    unit: "per meter",
    pricePerUnit: 800,
    defaultQty: 0,
    maxQty: 20,
  },
  {
    id: "pvc_casing",
    label: "PVC Casing / Trunking",
    description: "Decorative PVC casing for pipe concealment",
    unit: "per meter",
    pricePerUnit: 1200,
    defaultQty: 0,
    maxQty: 20,
  },
  {
    id: "outdoor_bracket",
    label: "Outdoor Unit Bracket",
    description: "Wall-mount bracket for outdoor unit",
    unit: "per unit",
    pricePerUnit: 3500,
    defaultQty: 0,
    maxQty: 4,
  },
  {
    id: "high_floor",
    label: "High-Floor Surcharge",
    description: "Installation above 3rd floor (additional safety & equipment)",
    unit: "per unit",
    pricePerUnit: 5000,
    defaultQty: 0,
    maxQty: 1,
  },
  {
    id: "electrical_point",
    label: "New Electrical Point",
    description: "Installing a new power outlet for the AC unit",
    unit: "per point",
    pricePerUnit: 4500,
    defaultQty: 0,
    maxQty: 4,
  },
];
