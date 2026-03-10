/**
 * Hook to sync device passport data between Zustand store and database.
 * Loads from DB on mount when user is authenticated, falls back to local store.
 */
import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useDevicePassportStore,
  calculateHealthScore,
  generateDeviceQR,
  type DevicePassport,
  type ServiceLedgerEntry,
  type WarrantyRecord,
  type ReplacedPart,
} from "@/store/devicePassportStore";

// ─── DB row → Store type mappers ────────────────────────────────

function dbToPassport(row: any): DevicePassport {
  return {
    devicePassportId: row.id,
    customerId: row.user_id,
    deviceCategory: row.device_category,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serial_number ?? undefined,
    deviceNickname: row.device_nickname,
    installationLocation: row.installation_location,
    installationDate: row.installation_date ?? undefined,
    purchaseDate: row.purchase_date ?? undefined,
    purchaseSeller: row.purchase_seller ?? undefined,
    purchaseInvoiceUrl: row.purchase_invoice_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    healthScore: row.health_score,
    totalServiceCost: row.total_service_cost,
    totalServicesPerformed: row.total_services_performed,
    ownerId: row.user_id,
    ownerName: row.owner_name ?? undefined,
    qrCode: row.qr_code ?? generateDeviceQR(row.id),
  };
}

function dbToService(row: any): ServiceLedgerEntry {
  return {
    id: row.id,
    devicePassportId: row.device_passport_id,
    serviceDate: row.service_date,
    technicianId: row.technician_id ?? "",
    technicianName: row.technician_name ?? "",
    partnerId: row.partner_id ?? undefined,
    partnerName: row.partner_name ?? undefined,
    serviceType: row.service_type,
    diagnosisResult: row.diagnosis_result ?? undefined,
    workCompleted: row.work_completed,
    partsReplaced: (row.parts_replaced ?? []) as ReplacedPart[],
    servicePhotos: (row.service_photos ?? []) as any[],
    serviceCost: row.service_cost,
    jobId: row.job_id ?? undefined,
    recommendations: row.recommendations ?? undefined,
  };
}

function dbToWarranty(row: any): WarrantyRecord {
  return {
    id: row.id,
    devicePassportId: row.device_passport_id,
    warrantyProvider: row.warranty_provider,
    warrantyStartDate: row.warranty_start_date,
    warrantyEndDate: row.warranty_end_date,
    warrantyType: row.warranty_type as any,
    status: row.status as any,
    description: row.description ?? "",
  };
}

// ─── Hook ───────────────────────────────────────────────────────

export function useDevicePassportsDB() {
  const store = useDevicePassportStore();
  const loadedRef = useRef(false);

  const loadFromDB = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [passRes, svcRes, warRes] = await Promise.all([
      supabase.from("device_passports").select("*").eq("user_id", user.id),
      supabase.from("device_service_ledger").select("*"),
      supabase.from("device_warranties").select("*"),
    ]);

    if (passRes.data && passRes.data.length > 0) {
      const passports = passRes.data.map(dbToPassport);
      const services = svcRes.data?.map(dbToService) ?? [];
      const warranties = warRes.data?.map(dbToWarranty) ?? [];

      useDevicePassportStore.setState({
        passports,
        serviceLedger: services,
        warranties,
      });
    }
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      loadFromDB();
    }
  }, [loadFromDB]);

  // ─── DB-synced mutations ────────────────────────────────────

  const addPassportToDB = useCallback(async (data: Omit<DevicePassport, "devicePassportId" | "createdAt" | "updatedAt" | "qrCode" | "healthScore" | "totalServiceCost" | "totalServicesPerformed">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Fallback to local store
      return store.addPassport(data);
    }

    const { data: row, error } = await supabase.from("device_passports").insert({
      user_id: user.id,
      device_category: data.deviceCategory,
      brand: data.brand,
      model: data.model,
      serial_number: data.serialNumber ?? null,
      device_nickname: data.deviceNickname,
      installation_location: data.installationLocation,
      installation_date: data.installationDate ?? null,
      purchase_date: data.purchaseDate ?? null,
      purchase_seller: data.purchaseSeller ?? null,
      purchase_invoice_url: data.purchaseInvoiceUrl ?? null,
      owner_name: data.ownerName ?? null,
      qr_code: generateDeviceQR("temp"),
    }).select().single();

    if (error || !row) {
      console.error("Failed to save device passport:", error);
      return store.addPassport(data);
    }

    // Update QR with actual ID
    await supabase.from("device_passports").update({ qr_code: generateDeviceQR(row.id) }).eq("id", row.id);

    const passport = dbToPassport({ ...row, qr_code: generateDeviceQR(row.id) });
    useDevicePassportStore.setState((s) => ({
      passports: [...s.passports, passport],
    }));
    return row.id;
  }, [store]);

  const addServiceEntryToDB = useCallback(async (data: Omit<ServiceLedgerEntry, "id">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      store.addServiceEntry(data);
      return;
    }

    const { data: row, error } = await supabase.from("device_service_ledger").insert({
      device_passport_id: data.devicePassportId,
      service_date: data.serviceDate,
      technician_id: data.technicianId,
      technician_name: data.technicianName,
      partner_id: data.partnerId ?? null,
      partner_name: data.partnerName ?? null,
      service_type: data.serviceType,
      diagnosis_result: data.diagnosisResult ?? null,
      work_completed: data.workCompleted,
      parts_replaced: data.partsReplaced as any,
      service_photos: data.servicePhotos as any,
      service_cost: data.serviceCost,
      job_id: data.jobId ?? null,
      recommendations: data.recommendations ?? null,
    }).select().single();

    if (error || !row) {
      console.error("Failed to save service entry:", error);
      store.addServiceEntry(data);
      return;
    }

    // Update passport totals in DB
    const passport = store.getPassport(data.devicePassportId);
    if (passport) {
      const newTotal = passport.totalServicesPerformed + 1;
      const newCost = passport.totalServiceCost + data.serviceCost;
      await supabase.from("device_passports").update({
        total_services_performed: newTotal,
        total_service_cost: newCost,
        updated_at: new Date().toISOString(),
      }).eq("id", data.devicePassportId);
    }

    // Update local store
    store.addServiceEntry(data);
  }, [store]);

  const addWarrantyToDB = useCallback(async (data: Omit<WarrantyRecord, "id">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      store.addWarranty(data);
      return;
    }

    const { error } = await supabase.from("device_warranties").insert({
      device_passport_id: data.devicePassportId,
      warranty_provider: data.warrantyProvider,
      warranty_start_date: data.warrantyStartDate,
      warranty_end_date: data.warrantyEndDate,
      warranty_type: data.warrantyType,
      status: data.status,
      description: data.description,
    });

    if (error) {
      console.error("Failed to save warranty:", error);
    }
    store.addWarranty(data);
  }, [store]);

  return {
    ...store,
    addPassport: addPassportToDB,
    addServiceEntry: addServiceEntryToDB,
    addWarranty: addWarrantyToDB,
    refreshFromDB: loadFromDB,
  };
}
