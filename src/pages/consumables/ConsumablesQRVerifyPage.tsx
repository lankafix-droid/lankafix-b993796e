import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, QrCode, Search, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useQRVerification } from "@/hooks/useConsumables";
import { motion } from "framer-motion";

const ConsumablesQRVerifyPage = () => {
  const [serial, setSerial] = useState("");
  const [searchSerial, setSearchSerial] = useState("");
  const { data, isLoading, error } = useQRVerification(searchSerial);

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
        <p className="text-xs text-muted-foreground mb-6">Scan or enter the SmartFix serial to verify authenticity</p>

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

        {isLoading && <p className="text-center text-sm text-muted-foreground">Verifying...</p>}

        {searchSerial && !isLoading && error && (
          <Card>
            <CardContent className="p-6 text-center">
              <XCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Not Found</p>
              <p className="text-xs text-muted-foreground mt-1">This serial could not be verified. Contact LankaFix support.</p>
            </CardContent>
          </Card>
        )}

        {data && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-6 h-6 text-accent" />
                  <span className="text-sm font-bold text-foreground">Verified Authentic</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span className="font-medium text-foreground">{data.consumable_products?.title}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Serial</span><span className="font-medium">{data.qr_serial}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Batch</span><span className="font-medium">{data.batch_no}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="secondary" className="text-[10px] capitalize">{data.verification_status}</Badge></div>
                </div>

                <div className="mt-4 space-y-2">
                  <Link to={`/consumables/product/${data.consumable_product_id}`}>
                    <Button size="sm" className="w-full text-xs">View Product Details</Button>
                  </Link>
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" /> Reorder This Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesQRVerifyPage;
