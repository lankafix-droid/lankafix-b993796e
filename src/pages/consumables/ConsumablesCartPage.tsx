import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Trash2, Minus, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { useCart, useCreateOrder } from "@/hooks/useConsumables";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ConsumablesCartPage = () => {
  const cart = useCart();
  const createOrder = useCreateOrder();
  const navigate = useNavigate();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");

  const [form, setForm] = useState({
    delivery_method: "scheduled",
    address_text: "",
    phone: "",
    invoice_requested: false,
    vat_number: "",
    match_confirmation: false,
  });

  const deliveryFee = form.delivery_method === "express" ? 500 : form.delivery_method === "scheduled" ? 250 : 0;
  const total = cart.subtotal + deliveryFee;
  const allExpressEligible = cart.items.every((i) => i.express_eligible);

  const handlePlaceOrder = () => {
    if (!form.phone || form.phone.length < 9) { toast.error("Please enter a valid phone number"); return; }
    if (form.delivery_method !== "pickup" && !form.address_text) { toast.error("Please enter a delivery address"); return; }
    if (cart.hasLowConfidence && !form.match_confirmation) { toast.error("Please confirm product match before checkout"); return; }
    if (cart.hasOutOfStock) { toast.error("Remove out-of-stock items before checkout"); return; }

    createOrder.mutate({
      delivery_method: form.delivery_method,
      address_text: form.address_text,
      phone: form.phone,
      invoice_requested: form.invoice_requested,
      vat_number: form.vat_number || undefined,
      match_confirmation: form.match_confirmation,
      items: cart.items,
    }, {
      onSuccess: (order) => {
        cart.clearCart();
        setOrderId(order.order_no);
        setOrderPlaced(true);
      },
    });
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-lg mx-auto px-4 py-12 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle className="w-14 h-14 text-accent mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-1">Order Confirmed</h1>
            <p className="text-sm text-muted-foreground mb-2">Order #{orderId}</p>
            <p className="text-xs text-muted-foreground mb-6">We'll process your order and send updates to your phone.</p>
            <div className="space-y-2">
              <Link to="/consumables"><Button className="w-full">Continue Shopping</Button></Link>
              <Link to="/consumables/reorder"><Button variant="outline" className="w-full">View Orders</Button></Link>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Cart & Checkout</h1>
        </div>

        {cart.items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Your cart is empty</p>
            <Link to="/consumables"><Button size="sm">Browse Consumables</Button></Link>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-2 mb-6">
              {cart.items.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">{item.sku_code} · {item.brand}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="secondary" className="text-[9px]">{item.range_type === "smartfix_compatible" ? "SmartFix" : "OEM"}</Badge>
                          {item.confidence !== "exact" && <Badge variant="outline" className="text-[9px] text-orange-600 border-orange-300">{item.confidence}</Badge>}
                          {item.stock_qty <= 0 && <Badge variant="destructive" className="text-[9px]">Out of Stock</Badge>}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => cart.removeItem(item.productId)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.updateQty(item.productId, item.qty - 1)}><Minus className="w-3 h-3" /></Button>
                        <span className="text-sm font-medium w-8 text-center">{item.qty}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.updateQty(item.productId, item.qty + 1)}><Plus className="w-3 h-3" /></Button>
                      </div>
                      <span className="text-sm font-bold text-foreground">LKR {(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Checkout Form */}
            <Card className="mb-4">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Delivery Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Delivery Method</Label>
                  <Select value={form.delivery_method} onValueChange={(v) => setForm({ ...form, delivery_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled Delivery (LKR 250)</SelectItem>
                      {allExpressEligible && <SelectItem value="express">Express Delivery (LKR 500)</SelectItem>}
                      <SelectItem value="pickup">Pickup (Free)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Phone *</Label>
                  <Input placeholder="07X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
                </div>
                {form.delivery_method !== "pickup" && (
                  <div>
                    <Label className="text-xs">Delivery Address *</Label>
                    <Input placeholder="Full delivery address" value={form.address_text} onChange={(e) => setForm({ ...form, address_text: e.target.value })} maxLength={500} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox id="invoice" checked={form.invoice_requested} onCheckedChange={(c) => setForm({ ...form, invoice_requested: !!c })} />
                  <Label htmlFor="invoice" className="text-xs">I need a tax invoice</Label>
                </div>
                {form.invoice_requested && (
                  <div>
                    <Label className="text-xs">VAT Number</Label>
                    <Input placeholder="VAT/TIN" value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} maxLength={50} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Confidence Warning */}
            {cart.hasLowConfidence && (
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1.5">Some items need match confirmation</p>
                    <div className="flex items-center gap-2">
                      <Checkbox id="confirm-match" checked={form.match_confirmation} onCheckedChange={(c) => setForm({ ...form, match_confirmation: !!c })} />
                      <Label htmlFor="confirm-match" className="text-[11px] text-orange-700 dark:text-orange-300">I confirm these products are correct for my printer</Label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <Card className="mb-4">
              <CardContent className="p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>LKR {cart.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>LKR {deliveryFee.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-foreground border-t border-border pt-1.5 mt-1.5"><span>Total</span><span>LKR {total.toLocaleString()}</span></div>
              </CardContent>
            </Card>

            <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={createOrder.isPending || cart.hasOutOfStock}>
              {createOrder.isPending ? "Placing Order..." : `Place Order · LKR ${total.toLocaleString()}`}
            </Button>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesCartPage;
