import { useState } from "react";
import { useBookingStore } from "@/store/bookingStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  CreditCard, Banknote, Building2, QrCode, CheckCircle2,
  Clock, ShieldCheck, AlertTriangle, FileText, RotateCcw,
} from "lucide-react";
import type { BookingState, CollectionMode, PaymentLifecycleStatus } from "@/types/booking";
import { generateReceiptData, type ReceiptData } from "@/lib/receiptEngine";
import { getMaxRefundableAmount } from "@/engines/refundEngine";
import { getRefundStatusMessage } from "@/engines/refundEngine";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  unpaid: { label: "Unpaid", icon: <Clock className="w-3.5 h-3.5" />, className: "bg-muted text-muted-foreground" },
  deposit_pending: { label: "Deposit Pending", icon: <Clock className="w-3.5 h-3.5" />, className: "bg-warning/10 text-warning" },
  deposit_paid: { label: "Deposit Paid", icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-success/10 text-success" },
  partially_paid: { label: "Partially Paid", icon: <Clock className="w-3.5 h-3.5" />, className: "bg-warning/10 text-warning" },
  fully_paid: { label: "Fully Paid", icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-success/10 text-success" },
  escrow_held: { label: "Payment Held", icon: <ShieldCheck className="w-3.5 h-3.5" />, className: "bg-primary/10 text-primary" },
  settlement_pending: { label: "Processing", icon: <Clock className="w-3.5 h-3.5" />, className: "bg-primary/10 text-primary" },
  settled: { label: "Complete", icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-success/10 text-success" },
  refund_pending: { label: "Refund Pending", icon: <RotateCcw className="w-3.5 h-3.5" />, className: "bg-warning/10 text-warning" },
  refunded: { label: "Refunded", icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-success/10 text-success" },
  failed: { label: "Failed", icon: <AlertTriangle className="w-3.5 h-3.5" />, className: "bg-destructive/10 text-destructive" },
};

const METHODS: { mode: CollectionMode; label: string; icon: React.ReactNode; available: boolean }[] = [
  { mode: "cash_on_completion", label: "Cash on Completion", icon: <Banknote className="w-4 h-4" />, available: true },
  { mode: "bank_transfer", label: "Bank Transfer", icon: <Building2 className="w-4 h-4" />, available: true },
  { mode: "gateway", label: "Online Payment", icon: <CreditCard className="w-4 h-4" />, available: false },
  { mode: "lankaqr", label: "LankaQR", icon: <QrCode className="w-4 h-4" />, available: false },
];

interface PaymentCardProps {
  booking: BookingState;
}

const PaymentCard = ({ booking }: PaymentCardProps) => {
  const { setCollectionMode, collectDeposit, collectBalance, requestRefund } = useBookingStore();
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [showReceipt, setShowReceipt] = useState<ReceiptData | null>(null);

  const finance = booking.finance;
  const paymentStatus = finance?.paymentStatus || "unpaid";
  const statusConfig = STATUS_CONFIG[paymentStatus] || STATUS_CONFIG.unpaid;
  const selectedMode = finance?.collectionMode;
  const isCompleted = booking.status === "completed" || booking.status === "rated";
  const depositNeeded = (finance?.depositAmount || 0) > 0 && paymentStatus === "unpaid";
  const balanceNeeded = isCompleted && paymentStatus !== "fully_paid" && paymentStatus !== "settled" && paymentStatus !== "refunded";
  const maxRefund = getMaxRefundableAmount(booking);
  const hasRefundRequests = (booking.refundRequests || []).length > 0;
  const latestRefund = (booking.refundRequests || []).slice(-1)[0];

  const formatLKR = (n: number) => `LKR ${n.toLocaleString("en-LK")}`;

  const handleSelectMethod = (mode: CollectionMode) => {
    setCollectionMode(booking.jobId, mode);
  };

  const handlePayDeposit = () => {
    const method = selectedMode || "cash_on_completion";
    collectDeposit(booking.jobId, method);
    toast.success("Deposit payment recorded");
  };

  const handlePayBalance = () => {
    const method = selectedMode || "cash_on_completion";
    collectBalance(booking.jobId, method);
    toast.success("Balance payment recorded");
  };

  const handleViewReceipt = (type: "deposit" | "balance" | "invoice") => {
    const data = generateReceiptData(booking, type);
    track("receipt_generated", { jobId: booking.jobId, type });
    setShowReceipt(data);
  };

  const handleRequestRefund = () => {
    if (!refundReason.trim()) return;
    requestRefund(booking.jobId, refundReason, maxRefund);
    setShowRefundDialog(false);
    setRefundReason("");
    toast.success("Refund request submitted");
  };

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Payment
            </CardTitle>
            <Badge className={statusConfig.className}>
              <span className="flex items-center gap-1">{statusConfig.icon} {statusConfig.label}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Method selection */}
          {!isCompleted && paymentStatus === "unpaid" && (
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Choose Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.mode}
                    disabled={!m.available}
                    onClick={() => handleSelectMethod(m.mode)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs transition-all ${
                      !m.available
                        ? "opacity-40 cursor-not-allowed bg-muted"
                        : selectedMode === m.mode
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border bg-card text-foreground hover:border-primary/30"
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                    {!m.available && <Badge variant="outline" className="text-[8px] ml-auto">Soon</Badge>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deposit CTA */}
          {depositNeeded && (
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-1">
                Deposit Due: {formatLKR(finance?.depositAmount || 0)}
              </p>
              <p className="text-[10px] text-muted-foreground mb-3">
                Your payment is recorded through LankaFix. Refunds follow the category cancellation policy.
              </p>
              <Button size="sm" variant="hero" onClick={handlePayDeposit} className="w-full">
                <Banknote className="w-4 h-4 mr-2" /> Pay Deposit
              </Button>
            </div>
          )}

          {/* Balance CTA */}
          {balanceNeeded && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-1">
                Balance Due: {formatLKR(finance?.balanceAmount || 0)}
              </p>
              <Button size="sm" variant="hero" onClick={handlePayBalance} className="w-full">
                <Banknote className="w-4 h-4 mr-2" /> Pay Balance
              </Button>
            </div>
          )}

          {/* Receipt */}
          {(paymentStatus === "deposit_paid" || paymentStatus === "fully_paid" || paymentStatus === "settled") && (
            <div className="flex gap-2">
              {(finance?.depositAmount || 0) > 0 && (
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewReceipt("deposit")}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> Deposit Receipt
                </Button>
              )}
              {(paymentStatus === "fully_paid" || paymentStatus === "settled") && (
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewReceipt("invoice")}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> Full Invoice
                </Button>
              )}
            </div>
          )}

          {/* Refund */}
          {maxRefund > 0 && !hasRefundRequests && booking.status !== "completed" && booking.status !== "rated" && (
            <Button variant="outline" size="sm" className="w-full text-destructive" onClick={() => setShowRefundDialog(true)}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Request Refund
            </Button>
          )}

          {latestRefund && (
            <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
              latestRefund.status === "completed" ? "bg-success/5 text-success" :
              latestRefund.status === "rejected" ? "bg-destructive/5 text-destructive" :
              "bg-warning/5 text-warning"
            }`}>
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              {getRefundStatusMessage(latestRefund.status)}
              {latestRefund.approvedAmount ? ` — ${formatLKR(latestRefund.approvedAmount)}` : ""}
            </div>
          )}

          {/* Trust microcopy */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground border-t pt-3">
            <ShieldCheck className="w-3 h-3 text-success shrink-0" />
            Pay securely through LankaFix. Your warranty remains protected.
          </div>
        </CardContent>
      </Card>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Request Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Eligible for refund up to {formatLKR(maxRefund)}
            </p>
            <Input
              placeholder="Reason for refund"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRefundDialog(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleRequestRefund} disabled={!refundReason.trim()}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={!!showReceipt} onOpenChange={() => setShowReceipt(null)}>
        <DialogContent className="max-w-sm">
          {showReceipt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <LankaFixLogo size="sm" />
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground uppercase">{showReceipt.type === "invoice" ? "Invoice" : "Receipt"}</p>
                  <p className="text-[10px] text-muted-foreground">{showReceipt.receiptId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Booking:</span> <span className="font-medium text-foreground">{showReceipt.bookingRef}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium text-foreground">{new Date(showReceipt.date).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground">Service:</span> <span className="font-medium text-foreground">{showReceipt.serviceName}</span></div>
                <div><span className="text-muted-foreground">Method:</span> <span className="font-medium text-foreground">{showReceipt.method}</span></div>
              </div>
              {showReceipt.laborBreakdown.length > 0 && (
                <div className="border-t pt-2 space-y-1">
                  <p className="text-xs font-semibold text-foreground">Labor</p>
                  {showReceipt.laborBreakdown.map((l, i) => (
                    <div key={i} className="flex justify-between text-xs"><span className="text-muted-foreground">{l.description}</span><span>{formatLKR(l.amount)}</span></div>
                  ))}
                </div>
              )}
              {showReceipt.partsBreakdown.length > 0 && (
                <div className="border-t pt-2 space-y-1">
                  <p className="text-xs font-semibold text-foreground">Parts</p>
                  {showReceipt.partsBreakdown.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs"><span className="text-muted-foreground">{p.description}</span><span>{formatLKR(p.amount)}</span></div>
                  ))}
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-sm font-bold">
                <span>Amount</span>
                <span className="text-primary">{formatLKR(showReceipt.amount)}</span>
              </div>
              {showReceipt.warranty && (
                <p className="text-[10px] text-muted-foreground border-t pt-2">
                  Warranty: Labor {showReceipt.warranty.labor} • Parts {showReceipt.warranty.parts}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground text-center">Powered by LankaFix — Verified Tech. Fixed Fast.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentCard;
