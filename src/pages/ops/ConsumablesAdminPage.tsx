import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, Package, Printer, Link2, RotateCcw, QrCode, ShoppingCart, FileText, Eye } from "lucide-react";
import { Link } from "react-router-dom";

// Hooks for admin data
const useAdminProducts = () => useQuery({
  queryKey: ["admin-consumable-products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("consumable_products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

const useAdminModels = () => useQuery({
  queryKey: ["admin-printer-models"],
  queryFn: async () => {
    const { data, error } = await supabase.from("printer_models").select("*").order("brand");
    if (error) throw error;
    return data;
  },
});

const useAdminRefillOrders = () => useQuery({
  queryKey: ["admin-refill-orders"],
  queryFn: async () => {
    const { data, error } = await supabase.from("refill_orders").select("*, printer_models(*)").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

const useAdminProductOrders = () => useQuery({
  queryKey: ["admin-consumable-orders"],
  queryFn: async () => {
    const { data, error } = await supabase.from("consumable_orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

const useAdminBulkQuotes = () => useQuery({
  queryKey: ["admin-bulk-quotes"],
  queryFn: async () => {
    const { data, error } = await supabase.from("bulk_quote_requests").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

const useAdminSearchLogs = () => useQuery({
  queryKey: ["admin-search-logs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("consumable_search_logs").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
});

const ConsumablesAdminPage = () => {
  const products = useAdminProducts();
  const models = useAdminModels();
  const refillOrders = useAdminRefillOrders();
  const productOrders = useAdminProductOrders();
  const bulkQuotes = useAdminBulkQuotes();
  const searchLogs = useAdminSearchLogs();
  const [filter, setFilter] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <Link to="/ops/dispatch" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Ops Dashboard
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <Package className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Consumables Ecosystem Management</h1>
            <p className="text-xs text-muted-foreground">Products, Models, Orders, Refills, QR</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{products.data?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Products</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{models.data?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Printer Models</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{refillOrders.data?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Refill Orders</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{bulkQuotes.data?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Bulk Quotes</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="products">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="products" className="text-xs">Products</TabsTrigger>
            <TabsTrigger value="models" className="text-xs">Printer Models</TabsTrigger>
            <TabsTrigger value="refill-orders" className="text-xs">Refill Orders</TabsTrigger>
            <TabsTrigger value="product-orders" className="text-xs">Product Orders</TabsTrigger>
            <TabsTrigger value="bulk-quotes" className="text-xs">Bulk Quotes</TabsTrigger>
            <TabsTrigger value="search-logs" className="text-xs">Search Logs</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="flex items-center justify-between mb-3">
              <Input placeholder="Filter products..." className="max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Add Product</Button>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">SKU</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Brand</TableHead>
                    <TableHead className="text-xs">Range</TableHead>
                    <TableHead className="text-xs">Price</TableHead>
                    <TableHead className="text-xs">Stock</TableHead>
                    <TableHead className="text-xs">Yield</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.data?.filter((p: any) => !filter || p.title.toLowerCase().includes(filter.toLowerCase()) || p.sku_code.toLowerCase().includes(filter.toLowerCase())).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-mono">{p.sku_code}</TableCell>
                      <TableCell className="text-xs max-w-48 truncate">{p.title}</TableCell>
                      <TableCell className="text-xs">{p.brand}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{p.range_type === "smartfix_compatible" ? "SmartFix" : "OEM"}</Badge></TableCell>
                      <TableCell className="text-xs">LKR {Number(p.price).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{p.stock_qty}</TableCell>
                      <TableCell className="text-xs">{p.yield_pages?.toLocaleString() || "-"}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="text-xs">Edit</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{models.data?.length || 0} models</p>
              <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Add Model</Button>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Brand</TableHead>
                    <TableHead className="text-xs">Model</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Family</TableHead>
                    <TableHead className="text-xs">Color</TableHead>
                    <TableHead className="text-xs">Aliases</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.data?.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs font-medium">{m.brand}</TableCell>
                      <TableCell className="text-xs">{m.model_name}</TableCell>
                      <TableCell className="text-xs capitalize">{m.device_type}</TableCell>
                      <TableCell className="text-xs">{m.model_family || "-"}</TableCell>
                      <TableCell className="text-xs capitalize">{m.mono_or_color}</TableCell>
                      <TableCell className="text-xs">{m.aliases?.join(", ") || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Refill Orders Tab */}
          <TabsContent value="refill-orders">
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order #</TableHead>
                    <TableHead className="text-xs">Brand</TableHead>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refillOrders.data?.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs font-mono">{o.refill_order_no}</TableCell>
                      <TableCell className="text-xs">{o.brand}</TableCell>
                      <TableCell className="text-xs">{o.cartridge_code}</TableCell>
                      <TableCell className="text-xs">{o.quantity}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{o.refill_status?.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-xs capitalize">{o.pickup_method}</TableCell>
                      <TableCell className="text-xs">LKR {Number(o.total).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Product Orders Tab */}
          <TabsContent value="product-orders">
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order #</TableHead>
                    <TableHead className="text-xs">Delivery</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Payment</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productOrders.data?.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs font-mono">{o.order_no}</TableCell>
                      <TableCell className="text-xs capitalize">{o.delivery_method}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{o.order_status}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{o.payment_status}</Badge></TableCell>
                      <TableCell className="text-xs">LKR {Number(o.total).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Bulk Quotes Tab */}
          <TabsContent value="bulk-quotes">
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Organization</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Preference</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkQuotes.data?.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-xs">{q.requester_name}</TableCell>
                      <TableCell className="text-xs">{q.organization_name || "-"}</TableCell>
                      <TableCell className="text-xs">{q.phone}</TableCell>
                      <TableCell className="text-xs">{q.qty || "-"}</TableCell>
                      <TableCell className="text-xs capitalize">{q.oem_preference}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{q.status}</Badge></TableCell>
                      <TableCell className="text-xs">{new Date(q.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Search Logs Tab */}
          <TabsContent value="search-logs">
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Query</TableHead>
                    <TableHead className="text-xs">Normalized</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Match Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchLogs.data?.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.raw_query || "-"}</TableCell>
                      <TableCell className="text-xs font-mono">{l.normalized_query || "-"}</TableCell>
                      <TableCell className="text-xs">{l.search_type}</TableCell>
                      <TableCell><Badge variant={l.match_status === "exact" ? "default" : "secondary"} className="text-[10px]">{l.match_status}</Badge></TableCell>
                      <TableCell className="text-xs">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ConsumablesAdminPage;
