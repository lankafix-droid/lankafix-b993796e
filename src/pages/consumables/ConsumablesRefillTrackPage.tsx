import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, CheckCircle, Clock, Truck, ClipboardCheck, TestTube, PackageCheck, AlertCircle } from "lucide-react";
import { useMyRefillOrders } from "@/hooks/useConsumables";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  request_received: { label: "Request Received", color: "bg-blue-100 text-blue-800", icon: Clock },
  pickup_scheduled: { label: "Pickup Scheduled", color: "bg-blue-100 text-blue-800", icon: Truck },
  cartridge_received: { label: "Cartridge Received", color: "bg-indigo-100 text-indigo-800", icon: PackageCheck },
  under_inspection: { label: "Under Inspection", color: "bg-orange-100 text-orange-800", icon: ClipboardCheck },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-800", icon: CheckCircle },
  accepted_with_caution: { label: "Accepted with Caution", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: AlertCircle },
  refill_in_progress: { label: "Refill in Progress", color: "bg-purple-100 text-purple-800", icon: RotateCcw },
  test_completed: { label: "Test Completed", color: "bg-green-100 text-green-800", icon: TestTube },
  dispatched: { label: "Dispatched", color: "bg-blue-100 text-blue-800", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle },
};

const ConsumablesRefillTrackPage = () => {
  const { data: orders, isLoading } = useMyRefillOrders();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Link to="/consumables/refill" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <h1 className="text-lg font-bold text-foreground mb-1">Track Refill Orders</h1>
        <p className="text-xs text-muted-foreground mb-6">Monitor your SmartFix refill requests</p>

        {isLoading && <p className="text-center py-8 text-sm text-muted-foreground">Loading...</p>}

        {orders && orders.length === 0 && (
          <div className="text-center py-12">
            <RotateCcw className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No refill orders yet</p>
            <Link to="/consumables/refill"><Button size="sm" className="mt-3">Start Refill Request</Button></Link>
          </div>
        )}

        <div className="space-y-3">
          {orders?.map((order: any, i: number) => {
            const status = STATUS_CONFIG[order.refill_status] || STATUS_CONFIG.request_received;
            const StatusIcon = status.icon;
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{order.refill_order_no}</p>
                        <p className="text-xs text-muted-foreground">{order.brand} · {order.cartridge_code}</p>
                      </div>
                      <Badge className={`text-[10px] ${status.color}`}>
                        <StatusIcon className="w-2.5 h-2.5 mr-0.5" />{status.label}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>Qty: {order.quantity}</span>
                      <span>Total: LKR {Number(order.total).toLocaleString()}</span>
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesRefillTrackPage;
