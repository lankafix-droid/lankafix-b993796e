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
} from "lucide-react";
import { CATEGORY_LABELS, type CategoryCode } from "@/types/booking";

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
}

interface PartnerInfo {
  id: string;
  full_name: string;
}

function WarrantyBadge({ ev }: { ev: EvidenceRecord | undefined }) {
  if (!ev?.warranty_activated) return null;
  const expired = ev.warranty_end_date && new Date(ev.warranty_end_date) < new Date();
  if (expired) {
    return (
      <Badge className="bg-muted text-muted-foreground text-[10px] gap-1">
        <Shield className="w-3 h-3" /> Warranty Expired
      </Badge>
    );
  }
  return (
    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
      <Shield className="w-3 h-3" /> Warranty Active
    </Badge>
  );
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [bk, ev, pt] = await Promise.all([
        supabase
          .from("bookings")
          .select("id,category_code,service_type,status,created_at,completed_at,final_price_lkr,estimated_price_lkr,partner_id,customer_rating,zone_code,device_details")
          .eq("customer_id", user.id)
          .neq("booking_source", "pilot_simulation")
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),
        supabase
          .from("service_evidence")
          .select("booking_id,before_photos,after_photos,service_verified,customer_confirmed,customer_dispute,technician_notes,warranty_activated,warranty_text,warranty_start_date,warranty_end_date,maintenance_due_date")
          .eq("customer_id", user.id),
        supabase.from("partners").select("id,full_name"),
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
      setLoading(false);
    }
    load();
  }, []);

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
                          {ev?.customer_dispute && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] gap-1">
                              <AlertTriangle className="w-3 h-3" /> Disputed
                            </Badge>
                          )}
                          {record.customer_rating && (
                            <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                              ★ {record.customer_rating}
                            </Badge>
                          )}
                        </div>
                      </div>

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
                        {ev?.warranty_text && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Award className="w-3 h-3" />
                            <span className="truncate">{ev.warranty_text}</span>
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
                      <div className="flex gap-2">
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
