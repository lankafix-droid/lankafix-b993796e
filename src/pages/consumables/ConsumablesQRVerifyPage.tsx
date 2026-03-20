import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, QrCode, Search, CheckCircle, XCircle, RefreshCw, ShieldCheck, AlertTriangle, Ban } from "lucide-react";
import { useQRVerification, type QRVerificationStatus } from "@/hooks/useConsumables";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<QRVerificationStatus, { icon: typeof CheckCircle; color: string; label: string; desc: string }> = {
  verified: { icon: CheckCircle, color: "text-accent", label: "Verified Authentic", desc: "This is a genuine SmartFix verified product." },
  invalid: { icon: XCircle, color: "text-destructive", label: "Invalid Code", desc: "This serial code is invalid or does not belong to any SmartFix product." },
  flagged: { icon: AlertTriangle, color: "text-orange-600", label: "Flagged", desc: "This code has been flagged for review. Please contact LankaFix support." },
  inactive: { icon: Ban, color: "text-muted-foreground", label: "Inactive", desc: "This product code is no longer active. It may have been recalled or expired." },
  not_found: { icon: XCircle, color: "text-destructive", label: "Not Found", desc: "This serial could not be verified. It may be invalid, inactive, or not a SmartFix product." },
};

const ConsumablesQRVerifyPage = () => {
  const [serial, setSerial] = useState("");
  const [searchSerial, setSearchSerial] = useState("");
  const { data, isLoading } = useQRVerification(searchSerial);

  const handleVerify = () => { if (serial.trim()) setSearchSerial(serial.trim()); };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Verify SmartFix QR</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-6">Verify your SmartFix product is authentic</p>

        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Enter SmartFix serial (e.g. SF-2025-A1-00001)" value={serial}
                onChange={(e) => setSerial(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()} />
              <Button onClick={handleVerify} size="icon"><Search className="w-4 h-4" /></Button>
            </div>
            <Button variant="outline" className="w-full text-xs">
              <QrCode className="w-3.5 h-3.5 mr-1.5" /> Scan QR Code
            </Button>
          </CardContent>
        </Card>

        {isLoading && <p className="text-center text-sm text-muted-foreground py-4">Verifying...</p>}

        {searchSerial && !isLoading && data && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {(() => {
              const cfg = STATUS_CONFIG[data.status];
              const Icon = cfg.icon;

              if (data.status === "not_found") {
                return (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Icon className={`w-10 h-10 ${cfg.color} mx-auto mb-2`} />
                      <p className="text-sm font-medium text-foreground mb-1">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mb-3">{cfg.desc}</p>
                      <div className="flex flex-col gap-2 items-center">
                        <Button variant="outline" size="sm" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Report This Code
                        </Button>
                        <p className="text-[10px] text-muted-foreground">Contact LankaFix support for assistance</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              if (data.status === "flagged" || data.status === "inactive" || data.status === "invalid") {
                return (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Icon className={`w-10 h-10 ${cfg.color} mx-auto mb-2`} />
                      <p className="text-sm font-medium text-foreground mb-1">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mb-3">{cfg.desc}</p>
                      <p className="text-[10px] text-muted-foreground">Serial: <span className="font-mono">{data.qr_serial}</span></p>
                      <Button variant="outline" size="sm" className="mt-3 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Contact LankaFix Support
                      </Button>
                    </CardContent>
                  </Card>
                );
              }

              // verified
              return (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-6 h-6 text-accent" />
                      <div>
                        <span className="text-sm font-bold text-foreground block">Verified Authentic</span>
                        <span className="text-[10px] text-accent">SmartFix Verified Product</span>
                      </div>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      {data.product && (
                        <div className="flex justify-between border-b border-border/50 pb-1.5">
                          <span className="text-muted-foreground">Product</span>
                          <span className="font-medium text-foreground">{data.product.title}</span>
                        </div>
                      )}
                      {data.product && (
                        <div className="flex justify-between border-b border-border/50 pb-1.5">
                          <span className="text-muted-foreground">SKU</span>
                          <span className="font-mono font-medium">{data.product.sku_code}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-border/50 pb-1.5">
                        <span className="text-muted-foreground">Serial</span>
                        <span className="font-mono font-medium">{data.qr_serial}</span>
                      </div>
                      {data.batch_no && (
                        <div className="flex justify-between border-b border-border/50 pb-1.5">
                          <span className="text-muted-foreground">Batch</span>
                          <span className="font-medium">{data.batch_no}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-border/50 pb-1.5">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="secondary" className="text-[10px] capitalize">{data.verification_status}</Badge>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1.5">
                        <span className="text-muted-foreground">Verified At</span>
                        <span className="font-medium">{data.verified_at ? new Date(data.verified_at).toLocaleString() : "First scan"}</span>
                      </div>
                      {data.product?.warranty_days && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Warranty</span>
                          <span className="font-medium">{data.product.warranty_text || `${data.product.warranty_days} days`}</span>
                        </div>
                      )}
                    </div>

                    {/* Trust badges */}
                    <div className="flex flex-wrap gap-1 mt-4">
                      <Badge className="bg-accent/10 text-accent text-[10px] border border-accent/20"><ShieldCheck className="w-2.5 h-2.5 mr-0.5" />Authentic</Badge>
                      <Badge variant="secondary" className="text-[10px]">Warranty Backed</Badge>
                      {data.product?.brand && <Badge variant="outline" className="text-[10px]">{data.product.brand}</Badge>}
                    </div>

                    <div className="mt-4 space-y-2">
                      {data.consumable_product_id && (
                        <Link to={`/consumables/product/${data.consumable_product_id}`}>
                          <Button size="sm" className="w-full text-xs">View Product Details</Button>
                        </Link>
                      )}
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" /> Reorder This Product
                      </Button>
                      <Button size="sm" variant="ghost" className="w-full text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Report an Issue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesQRVerifyPage;
