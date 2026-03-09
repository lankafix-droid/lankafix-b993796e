import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Package, Printer, Wifi, Shield, Sun, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string;
  badge?: string;
  inStock: boolean;
}

const CATEGORIES = ["All", "Printer Supplies", "Network Gear", "Smart Devices", "CCTV Accessories", "Power Backup"];

const PRODUCTS: Product[] = [
  { id: "p1", name: "HP 680 Black Ink Cartridge", category: "Printer Supplies", price: "LKR 2,800", image: "🖨️", inStock: true, badge: "Best Seller" },
  { id: "p2", name: "Canon PG-745 Black Cartridge", category: "Printer Supplies", price: "LKR 3,200", image: "🖨️", inStock: true },
  { id: "p3", name: "Brother TN-2380 Toner", category: "Printer Supplies", price: "LKR 4,500", image: "🖨️", inStock: true },
  { id: "p4", name: "Epson 664 Ink Bottle Set (4 Colors)", category: "Printer Supplies", price: "LKR 3,600", image: "🖨️", inStock: false },
  { id: "p5", name: "TP-Link Archer AX23 WiFi 6 Router", category: "Network Gear", price: "LKR 14,500", image: "📡", inStock: true, badge: "Popular" },
  { id: "p6", name: "Cat6 Network Cable (30m)", category: "Network Gear", price: "LKR 2,200", image: "📡", inStock: true },
  { id: "p7", name: "TP-Link Deco M4 Mesh System (2-Pack)", category: "Network Gear", price: "LKR 22,000", image: "📡", inStock: true },
  { id: "p8", name: "Hikvision 2MP Dome Camera", category: "CCTV Accessories", price: "LKR 8,500", image: "📷", inStock: true },
  { id: "p9", name: "1TB Surveillance HDD (Seagate)", category: "CCTV Accessories", price: "LKR 12,500", image: "📷", inStock: true },
  { id: "p10", name: "CCTV BNC + Power Cable (30m)", category: "CCTV Accessories", price: "LKR 1,800", image: "📷", inStock: true },
  { id: "p11", name: "Sonoff Smart Switch (WiFi)", category: "Smart Devices", price: "LKR 3,200", image: "💡", inStock: true },
  { id: "p12", name: "Smart Door Sensor (Zigbee)", category: "Smart Devices", price: "LKR 2,800", image: "💡", inStock: true },
  { id: "p13", name: "APC BX625 UPS (625VA)", category: "Power Backup", price: "LKR 18,500", image: "🔋", inStock: true, badge: "Top Rated" },
  { id: "p14", name: "UPS Replacement Battery (12V 7Ah)", category: "Power Backup", price: "LKR 4,500", image: "🔋", inStock: true },
];

const ConsumablesPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const filtered = activeCategory === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">LankaFix Supplies</h1>
          </div>
          <p className="text-muted-foreground">
            Quality parts and accessories — recommended by our verified technicians.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-card p-4 flex flex-col"
            >
              <div className="text-4xl text-center mb-3">{product.image}</div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-medium leading-tight">{product.name}</h3>
                {product.badge && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">{product.badge}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{product.category}</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="font-semibold text-sm">{product.price}</span>
                <Button size="sm" variant={product.inStock ? "default" : "outline"} disabled={!product.inStock}>
                  {product.inStock ? (
                    <><ShoppingCart className="w-3.5 h-3.5 mr-1" /> Add</>
                  ) : (
                    "Out of Stock"
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No products in this category yet.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesPage;
