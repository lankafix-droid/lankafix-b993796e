/**
 * LankaFix Technician Parts Store — DB-backed via parts_catalog table.
 * Replaces MOCK_PARTS with real Supabase queries.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, Search, ShoppingCart, Star, Truck, Loader2 } from "lucide-react";

const CATEGORIES = ["All", "MOBILE", "AC", "COPIER", "CCTV", "IT", "SOLAR", "CONSUMER_ELEC"];

export default function TechnicianPartsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<string[]>([]);

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["parts-catalog", category],
    queryFn: async () => {
      let q = supabase
        .from("parts_catalog")
        .select("*")
        .order("last_updated_at", { ascending: false })
        .limit(100);
      if (category !== "All") {
        q = q.eq("category_code", category);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const filtered = parts.filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (p.model || "").toLowerCase().includes(s) ||
      (p.brand || "").toLowerCase().includes(s) ||
      (p.part_type || "").toLowerCase().includes(s)
    );
  });

  const toggleCart = (id: string) => {
    setCart((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  };

  const cartTotal = parts
    .filter((p: any) => cart.includes(p.id))
    .reduce((s: number, p: any) => s + (p.price_lkr || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Parts Store</h1>
          <p className="text-xs text-muted-foreground">{parts.length} parts available</p>
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
              {cat === "All" ? "All" : cat.replace(/_/g, " ")}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Package className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No parts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((part: any) => {
              const inStock = part.stock_status === "in_stock";
              return (
                <Card key={part.id} className={cart.includes(part.id) ? "border-primary/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{part.model || part.part_type}</p>
                        <p className="text-xs text-muted-foreground">{part.brand} • {part.category_code} • {part.part_grade || "Standard"}</p>
                      </div>
                      <Badge className={inStock ? "bg-success/10 text-success text-[10px]" : "bg-destructive/10 text-destructive text-[10px]"}>
                        {inStock ? "In Stock" : part.stock_status === "low_stock" ? "Low Stock" : "Out of Stock"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {part.supplier_name && <span>{part.supplier_name}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">Rs {(part.price_lkr || 0).toLocaleString()}</span>
                        <Button
                          size="sm"
                          variant={cart.includes(part.id) ? "default" : "outline"}
                          className="h-7 text-xs"
                          disabled={part.stock_status === "out_of_stock"}
                          onClick={() => toggleCart(part.id)}
                        >
                          {cart.includes(part.id) ? "Added" : "Add"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {cart.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{cart.length} items in cart</span>
                <span className="text-sm font-bold text-primary">Rs {cartTotal.toLocaleString()}</span>
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
