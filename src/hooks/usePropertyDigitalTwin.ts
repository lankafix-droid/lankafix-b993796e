/**
 * Property Digital Twin Hook
 * Manages properties, assets, maintenance schedules, and insights.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Property {
  id: string;
  user_id: string;
  property_name: string;
  property_type: string;
  floor_count: number;
  approximate_size_sqft: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  roof_type: string | null;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyAsset {
  id: string;
  property_id: string;
  user_id: string;
  asset_type: string;
  asset_category: string;
  brand: string | null;
  model: string | null;
  location_in_property: string;
  estimated_age_years: number | null;
  status: string;
  confidence_score: number;
  last_service_date: string | null;
  next_service_due: string | null;
  device_passport_id: string | null;
  notes: string | null;
  detected_via: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceSchedule {
  id: string;
  asset_id: string;
  property_id: string;
  user_id: string;
  service_category: string;
  interval_months: number;
  last_service_date: string | null;
  next_service_due: string | null;
  technician_notes: string | null;
  status: string;
  created_at: string;
}

export interface PropertyInsight {
  id: string;
  property_id: string;
  user_id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: string;
  category: string | null;
  action_url: string | null;
  dismissed_at: string | null;
  created_at: string;
}

// Category → maintenance interval mapping
const MAINTENANCE_INTERVALS: Record<string, number> = {
  AC: 6, CCTV: 12, NETWORK: 12, SOLAR: 6, COPIER: 6, ELECTRICAL: 18,
  CONSUMER_ELEC: 18, PLUMBING: 12, APPLIANCE_INSTALL: 18, SMART_HOME_OFFICE: 12,
  HOME_SECURITY: 12, POWER_BACKUP: 12, IT: 12, MOBILE: 0,
};

const ASSET_CATEGORY_ICONS: Record<string, string> = {
  AC: "❄️", CCTV: "📹", NETWORK: "📡", SOLAR: "☀️", COPIER: "🖨️",
  ELECTRICAL: "⚡", CONSUMER_ELEC: "📺", PLUMBING: "🔧", SMART_HOME_OFFICE: "🏠",
  HOME_SECURITY: "🔒", POWER_BACKUP: "🔋", IT: "💻", MOBILE: "📱",
  APPLIANCE_INSTALL: "🏗️",
};

export function usePropertyDigitalTwin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<PropertyAsset[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [insights, setInsights] = useState<PropertyInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    const [pRes, aRes, sRes, iRes] = await Promise.all([
      supabase.from("properties").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("property_assets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("asset_maintenance_schedule").select("*").eq("user_id", user.id).order("next_service_due", { ascending: true }),
      supabase.from("property_insights").select("*").eq("user_id", user.id).is("dismissed_at", null).order("created_at", { ascending: false }),
    ]);
    if (pRes.data) setProperties(pRes.data as unknown as Property[]);
    if (aRes.data) setAssets(aRes.data as unknown as PropertyAsset[]);
    if (sRes.data) setSchedules(sRes.data as unknown as MaintenanceSchedule[]);
    if (iRes.data) setInsights(iRes.data as unknown as PropertyInsight[]);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createProperty = async (data: Partial<Property>) => {
    if (!user) return null;
    const { data: created, error } = await supabase
      .from("properties")
      .insert({ ...data, user_id: user.id } as any)
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    await fetchAll();
    return created;
  };

  const addAsset = async (propertyId: string, data: Partial<PropertyAsset>) => {
    if (!user) return null;
    const interval = MAINTENANCE_INTERVALS[data.asset_category || ""] || 12;
    const { data: created, error } = await supabase
      .from("property_assets")
      .insert({ ...data, property_id: propertyId, user_id: user.id } as any)
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    // Auto-create maintenance schedule
    if (interval > 0 && created) {
      const nextDue = new Date();
      nextDue.setMonth(nextDue.getMonth() + interval);
      await supabase.from("asset_maintenance_schedule").insert({
        asset_id: (created as any).id,
        property_id: propertyId,
        user_id: user.id,
        service_category: data.asset_category || "GENERAL",
        interval_months: interval,
        next_service_due: nextDue.toISOString().split("T")[0],
      } as any);
    }
    await fetchAll();
    return created;
  };

  const dismissInsight = async (insightId: string) => {
    await supabase.from("property_insights").update({ dismissed_at: new Date().toISOString() } as any).eq("id", insightId);
    setInsights((prev) => prev.filter((i) => i.id !== insightId));
  };

  const getAssetsForProperty = (propertyId: string) => assets.filter((a) => a.property_id === propertyId);
  const getSchedulesForProperty = (propertyId: string) => schedules.filter((s) => s.property_id === propertyId);
  const getInsightsForProperty = (propertyId: string) => insights.filter((i) => i.property_id === propertyId);

  const computeHealthScore = (propertyId: string): { overall: number; cooling: number; electrical: number; security: number; energy: number } => {
    const propAssets = getAssetsForProperty(propertyId);
    if (propAssets.length === 0) return { overall: 80, cooling: 80, electrical: 80, security: 80, energy: 80 };

    const score = (cats: string[]) => {
      const relevant = propAssets.filter((a) => cats.includes(a.asset_category));
      if (relevant.length === 0) return 80;
      let s = 100;
      for (const a of relevant) {
        if (a.status === "needs_repair") s -= 25;
        else if (a.status === "inspection_recommended") s -= 10;
        if (a.estimated_age_years && a.estimated_age_years > 5) s -= 5;
        if (!a.last_service_date) s -= 10;
      }
      return Math.max(0, Math.min(100, s));
    };

    const cooling = score(["AC"]);
    const electrical = score(["ELECTRICAL", "POWER_BACKUP"]);
    const security = score(["CCTV", "HOME_SECURITY"]);
    const energy = score(["SOLAR", "POWER_BACKUP", "ELECTRICAL"]);
    const overall = Math.round((cooling + electrical + security + energy) / 4);
    return { overall, cooling, electrical, security, energy };
  };

  return {
    properties, assets, schedules, insights, isLoading,
    createProperty, addAsset, dismissInsight,
    getAssetsForProperty, getSchedulesForProperty, getInsightsForProperty,
    computeHealthScore, refetch: fetchAll,
    ASSET_CATEGORY_ICONS,
  };
}
