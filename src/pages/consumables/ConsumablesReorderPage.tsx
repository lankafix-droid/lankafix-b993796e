import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, RefreshCw, Plus, MapPin, Calendar } from "lucide-react";
import { useSavedDevices } from "@/hooks/useConsumables";
import { motion } from "framer-motion";

const ConsumablesReorderPage = () => {
  const { data: devices, isLoading } = useSavedDevices();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-foreground">Reorder & Saved Devices</h1>
            <p className="text-xs text-muted-foreground">Quick repeat supply from your saved printers</p>
          </div>
          <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1" /> Add Device</Button>
        </div>

        {isLoading && <p className="text-center py-8 text-sm text-muted-foreground">Loading...</p>}

        {devices && devices.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Printer className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No saved devices yet</p>
              <p className="text-xs text-muted-foreground mb-3">Save your printer for quick reordering</p>
              <Link to="/consumables/finder">
                <Button size="sm">Find My Printer</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {devices?.map((device: any, i: number) => (
            <motion.div key={device.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Printer className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{device.nickname || "My Printer"}</p>
                        <p className="text-xs text-muted-foreground">{device.printer_models?.model_name || "Unknown model"}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] capitalize">{device.preferred_range_type?.replace("_", " ")}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mb-3">
                    {device.location_name && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{device.location_name}</span>}
                    {device.last_ordered_at && <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />Last: {new Date(device.last_ordered_at).toLocaleDateString()}</span>}
                    {device.average_monthly_usage && <span>~{device.average_monthly_usage} pages/mo</span>}
                  </div>
                  <Button size="sm" className="w-full text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" /> Reorder Consumable
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesReorderPage;
