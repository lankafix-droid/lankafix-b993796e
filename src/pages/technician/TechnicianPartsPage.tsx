import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Package, Search, ShoppingCart, Star, Truck } from "lucide-react";

interface PartItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  inStock: boolean;
  rating: number;
  deliveryDays: number;
}

const MOCK_PARTS: PartItem[] = [
  { id: "P001", name: "AC Capacitor 35µF", category: "AC", brand: "SmartFix", price: 1200, inStock: true, rating: 4.7, deliveryDays: 1 },
  { id: "P002", name: "R410A Refrigerant Gas (1kg)", category: "AC", brand: "Refron", price: 3500, inStock: true, rating: 4.9, deliveryDays: 1 },
  { id: "P003", name: "Printer Toner - Canon 325", category: "COPIER", brand: "Canon Compatible", price: 2800, inStock: true, rating: 4.5, deliveryDays: 2 },
  { id: "P004", name: "CCTV HDD 2TB Surveillance", category: "CCTV", brand: "Seagate", price: 18500, inStock: true, rating: 4.8, deliveryDays: 1 },
  { id: "P005", name: "Laptop Battery - Dell Latitude", category: "IT", brand: "Dell Compatible", price: 7500, inStock: false, rating: 4.3, deliveryDays: 3 },
  { id: "P006", name: "AC Compressor Relay", category: "AC", brand: "SmartFix", price: 850, inStock: true, rating: 4.6, deliveryDays: 1 },
  { id: "P007", name: "iPhone Screen - iPhone 14", category: "MOBILE", brand: "OEM Grade", price: 12000, inStock: true, rating: 4.4, deliveryDays: 2 },
  { id: "P008", name: "Solar Inverter Fuse 15A", category: "SOLAR", brand: "Generic", price: 450, inStock: true, rating: 4.2, deliveryDays: 1 },
];

const CATEGORIES = ["All", "AC", "COPIER", "CCTV", "IT", "MOBILE", "SOLAR"];

export default function TechnicianPartsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<string[]>([]);

  const filtered = MOCK_PARTS.filter((p) => {
    const matchCat = category === "All" || p.category === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const toggleCart = (id: string) => {
    setCart((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Parts Store</h1>
        </div>
        <div className="relative">
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-bold">
              {cart.length}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? "default" : "outline"}
              className="text-xs shrink-0 h-7"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((part) => (
            <Card key={part.id} className={cart.includes(part.id) ? "border-primary/30" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{part.name}</p>
                    <p className="text-xs text-muted-foreground">{part.brand} • {part.category}</p>
                  </div>
                  <Badge className={part.inStock ? "bg-success/10 text-success text-[10px]" : "bg-destructive/10 text-destructive text-[10px]"}>
                    {part.inStock ? "In Stock" : "Out of Stock"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-warning" /> {part.rating}</span>
                    <span className="flex items-center gap-0.5"><Truck className="w-3 h-3" /> {part.deliveryDays}d</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">Rs {part.price.toLocaleString()}</span>
                    <Button
                      size="sm"
                      variant={cart.includes(part.id) ? "default" : "outline"}
                      className="h-7 text-xs"
                      disabled={!part.inStock}
                      onClick={() => toggleCart(part.id)}
                    >
                      {cart.includes(part.id) ? "Added" : "Add"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {cart.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{cart.length} items in cart</span>
                <span className="text-sm font-bold text-primary">
                  Rs {MOCK_PARTS.filter((p) => cart.includes(p.id)).reduce((s, p) => s + p.price, 0).toLocaleString()}
                </span>
              </div>
              <Button className="w-full" size="sm">
                <Package className="w-4 h-4 mr-2" /> Place Order
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
