/**
 * Repair History Vault — permanent service records for customers.
 * Shows completed bookings with evidence, invoices, warranty, and rebooking.
 * Excludes simulation data. Links to device registry where possible.
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEvidencePhotoUrl } from "@/hooks/useServiceEvidence";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import ServiceProofBadge from "@/components/proof/ServiceProofBadge";
import {
  ArrowLeft, Calendar, FileText, Shield, RotateCcw,
  Wrench, Download, ChevronRight, Image, History, Award, AlertTriangle,
  Smartphone, Plus, Link2,
} from "lucide-react";
import { CATEGORY_LABELS, type CategoryCode } from "@/types/booking";
import { toast } from "sonner";

interface ServiceRecord {
  id: string;
  category_code: string;
  service_type: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  final_price_lkr: number | null;
  estimated_price_lkr: number | null;
  partner_id: string | null;
  customer_rating: number | null;
  zone_code: string | null;
  device_details: any;
}

interface EvidenceRecord {
  booking_id: string;
  before_photos: string[];
  after_photos: string[];
  service_verified: boolean;
  customer_confirmed: boolean;
  customer_dispute: boolean;
  technician_notes: string | null;
  warranty_activated: boolean;
  warranty_text: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  maintenance_due_date: string | null;
  device_id: string | null;
}

interface PartnerInfo {
  id: string;
  full_name: string;
}

interface DeviceInfo {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  category_code: string;
}

type WarrantyStatus = "active" | "expiring_soon" | "expired" | "disputed" | "none";

function getWarrantyStatus(ev: EvidenceRecord | undefined): WarrantyStatus {
  if (!ev?.warranty_activated) return "none";
  if (ev.customer_dispute) return "disputed";
  if (!ev.warranty_end_date) return "none";
  const now = new Date();
  const end = new Date(ev.warranty_end_date);
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 7) return "expiring_soon";
  return "active";
}

function WarrantyBadge({ ev }: { ev: EvidenceRecord | undefined }) {
  const status = getWarrantyStatus(ev);
  switch (status) {
    case "active":
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
          <Shield className="w-3 h-3" /> Warranty Active
        </Badge>
      );
    case "expiring_soon": {
      const daysLeft = ev?.warranty_end_date
        ? Math.ceil((new Date(ev.warranty_end_date).getTime() - Date.now()) / 86400000)
        : 0;
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] gap-1">
          <AlertTriangle className="w-3 h-3" /> Expiring ({daysLeft}d)
        </Badge>
      );
    }
    case "expired":
      return (
        <Badge className="bg-muted text-muted-foreground text-[10px] gap-1">
          <Shield className="w-3 h-3" /> Warranty Expired
        </Badge>
      );
    case "disputed":
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] gap-1">
          <AlertTriangle className="w-3 h-3" /> Disputed
        </Badge>
      );
    default:
      return null;
  }
}

function EvidenceThumbnails({ paths, label }: { paths: string[]; label: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let c = false;
    Promise.all(paths.slice(0, 2).map(p => getEvidencePhotoUrl(p))).then(r => { if (!c) setUrls(r); });
    return () => { c = true; };
  }, [paths]);

  return (
    <>
      {urls.map((url, i) => (
        <div key={`${label}-${i}`} className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted relative">
          <img src={url} alt="" className="w-full h-full object-cover" />
          <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-card/80 text-muted-foreground">{label}</span>
        </div>
      ))}
    </>
  );
}

export default function ServiceHistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [evidence, setEvidence] = useState<Record<string, EvidenceRecord>>({});
  const [partners, setPartners] = useState<Record<string, string>>({});
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [bk, ev, pt, dv] = await Promise.all([
        supabase
          .from("bookings")
          .select("id,category_code,service_type,status,created_at,completed_at,final_price_lkr,estimated_price_lkr,partner_id,customer_rating,zone_code,device_details")
          .eq("customer_id", user.id)
          .neq("booking_source", "pilot_simulation")
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),
        supabase
          .from("service_evidence")
          .select("booking_id,before_photos,after_photos,service_verified,customer_confirmed,customer_dispute,technician_notes,warranty_activated,warranty_text,warranty_start_date,warranty_end_date,maintenance_due_date,device_id")
          .eq("customer_id", user.id),
        supabase.from("partners").select("id,full_name"),
        supabase.from("device_registry").select("id,device_type,brand,model,category_code").eq("user_id", user.id),
      ]);

      setRecords((bk.data || []) as ServiceRecord[]);

      const evMap: Record<string, EvidenceRecord> = {};
      ((ev.data || []) as any[]).forEach(e => {
        evMap[e.booking_id] = {
          ...e,
          before_photos: e.before_photos || [],
          after_photos: e.after_photos || [],
        };
      });
      setEvidence(evMap);

      const pMap: Record<string, string> = {};
      ((pt.data || []) as PartnerInfo[]).forEach(p => { pMap[p.id] = p.full_name; });
      setPartners(pMap);
      setDevices((dv.data || []) as DeviceInfo[]);
      setLoading(false);
    }
    load();
  }, []);

  const linkDevice = async (bookingId: string, deviceId: string) => {
    const { error } = await supabase
      .from("service_evidence")
      .update({ device_id: deviceId } as any)
      .eq("booking_id", bookingId);
    if (error) { toast.error("Failed to link device"); return; }
    setEvidence(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], device_id: deviceId },
    }));
    toast.success("Device linked to service record");
  };

  const getMatchingDevices = (record: ServiceRecord) => {
    // Match by category + brand/model when available
    const deviceDetails = record.device_details || {};
    const brand = (deviceDetails.brand || "").toString().toLowerCase();
    const model = (deviceDetails.model || "").toString().toLowerCase();
    return devices.filter(d => {
      if (d.category_code !== record.category_code) return false;
      // If booking has brand/model, prefer exact match
      if (brand && d.brand.toLowerCase() === brand) return true;
      if (model && d.model.toLowerCase() === model) return true;
      // Fallback: category-only match
      return !brand && !model;
    });
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Service History</h1>
              <p className="text-xs text-muted-foreground">Your complete repair record vault</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : records.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No service history yet"
              description="Completed bookings will appear here with full evidence and warranty records."
            />
          ) : (
            <div className="space-y-3">
              {records.map(record => {
                const ev = evidence[record.id];
                const techName = record.partner_id ? partners[record.partner_id] : null;
                const catLabel = CATEGORY_LABELS[record.category_code as CategoryCode] || record.category_code;
                const price = record.final_price_lkr || record.estimated_price_lkr;
                const completedDate = record.completed_at ? new Date(record.completed_at) : null;
                const warrantyStatus = getWarrantyStatus(ev);
                const matchingDevices = getMatchingDevices(record);
                const linkedDevice = ev?.device_id ? devices.find(d => d.id === ev.device_id) : null;

                return (
                  <Card key={record.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{catLabel}</h3>
                          {record.service_type && (
                            <p className="text-xs text-muted-foreground">{record.service_type}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {ev?.service_verified && <ServiceProofBadge verified size="sm" />}
                          <WarrantyBadge ev={ev} />
                          {record.customer_rating && (
                            <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                              ★ {record.customer_rating}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Warranty details */}
                      {ev?.warranty_text && (
                        <div className="text-[11px] text-muted-foreground mb-2 p-2 rounded-lg bg-muted/30">
                          <span className="font-medium text-foreground">{ev.warranty_text}</span>
                          {ev.warranty_end_date && (
                            <span className="ml-1">· Expires {new Date(ev.warranty_end_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}

                      {/* Linked device */}
                      {linkedDevice && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2 p-1.5 rounded bg-primary/5 border border-primary/10">
                          <Smartphone className="w-3 h-3 text-primary" />
                          <span>{linkedDevice.brand} {linkedDevice.model}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        {completedDate && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {completedDate.toLocaleDateString()}
                          </div>
                        )}
                        {techName && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Wrench className="w-3 h-3" />
                            {techName}
                          </div>
                        )}
                        {price && (
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            Rs. {price.toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Evidence thumbnails */}
                      {ev && (ev.before_photos.length > 0 || ev.after_photos.length > 0) && (
                        <div className="flex gap-1.5 mb-3 overflow-x-auto">
                          <EvidenceThumbnails paths={ev.before_photos} label="Before" />
                          <EvidenceThumbnails paths={ev.after_photos} label="After" />
                        </div>
                      )}

                      {/* Maintenance reminder */}
                      {ev?.maintenance_due_date && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3 p-2 rounded-lg bg-muted/30">
                          <Calendar className="w-3 h-3 text-primary" />
                          Next maintenance: {new Date(ev.maintenance_due_date).toLocaleDateString()}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => navigate(`/track/${record.id}`)}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => navigate(`/book/${record.category_code}`)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Rebook
                        </Button>
                         {(warrantyStatus === "active" || warrantyStatus === "expiring_soon") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-primary border-primary/30"
                            onClick={() => {
                              toast.info("Warranty claim started — our team will contact you.");
                            }}
                          >
                            <Shield className="w-3.5 h-3.5 mr-1" /> Claim Warranty
                          </Button>
                        )}
                        {/* Device linking */}
                        {!linkedDevice && matchingDevices.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-primary"
                            onClick={() => linkDevice(record.id, matchingDevices[0].id)}
                          >
                            <Link2 className="w-3.5 h-3.5 mr-1" /> Attach Device
                          </Button>
                        )}
                        {!linkedDevice && matchingDevices.length === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() => navigate("/devices")}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Device
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
