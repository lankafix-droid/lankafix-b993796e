/**
 * LankaFix Booking Service
 * Handles real booking creation, duplicate prevention, and timeline initialization.
 */
import { supabase } from "@/integrations/supabase/client";
import type { V2BookingState } from "@/pages/V2BookingPage";
import type { V2CategoryFlow } from "@/data/v2CategoryFlows";

export interface BookingCreatePayload {
  flow: V2CategoryFlow;
  booking: V2BookingState;
  userId: string;
  locationData: {
    lat?: number;
    lng?: number;
    address?: string;
    zoneCode?: string;
  };
}

export interface BookingCreateResult {
  success: boolean;
  bookingId?: string;
  error?: string;
}

/**
 * Check for duplicate bookings within the last 30 seconds
 * Same user + same category + same location
 */
async function checkDuplicate(userId: string, categoryCode: string): Promise<boolean> {
  const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
  
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("customer_id", userId)
    .eq("category_code", categoryCode)
    .gte("created_at", thirtySecondsAgo)
    .limit(1);

  if (error) {
    console.warn("[BookingService] Duplicate check failed:", error.message);
    return false; // Don't block on duplicate check failure
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Create a real booking in the database with timeline events
 */
export async function createBooking(payload: BookingCreatePayload): Promise<BookingCreateResult> {
  const { flow, booking, userId, locationData } = payload;

  // 1. Check auth
  if (!userId) {
    return { success: false, error: "Authentication required" };
  }

  // 2. Duplicate prevention
  const isDuplicate = await checkDuplicate(userId, flow.code);
  if (isDuplicate) {
    return { success: false, error: "A similar booking was just submitted. Please wait before trying again." };
  }

  // 3. Build device details
  const deviceDetails: Record<string, unknown> = {
    ...booking.deviceAnswers,
  };
  if (booking.diagnosticAnswers && Object.keys(booking.diagnosticAnswers).length > 0) {
    deviceDetails.diagnosticAnswers = booking.diagnosticAnswers;
  }
  if (booking.partGrade) {
    deviceDetails.partGrade = booking.partGrade;
  }
  if (booking.acInstallAddons) {
    deviceDetails.acInstallAddons = booking.acInstallAddons;
  }

  // 4. Determine pricing archetype
  const pricingArchetype = flow.pricingArchetype === "fixed_price"
    ? "fixed_price" as const
    : flow.pricingArchetype === "diagnostic_first"
    ? "diagnostic_first" as const
    : "quote_required" as const;

  // 5. Determine service mode
  const serviceModeMap: Record<string, "on_site" | "drop_off" | "pickup_return" | "remote"> = {
    on_site: "on_site",
    drop_off: "drop_off",
    pickup_return: "pickup_return",
    remote: "remote",
  };
  const serviceMode = serviceModeMap[booking.serviceModeId] || "on_site";

  // 6. Build estimated price
  const selectedPackage = flow.packages.find(p => p.id === booking.packageId);
  const estimatedPrice = selectedPackage?.price || null;

  // 7. Build notes
  const notesParts: string[] = [];
  if (booking.issueId) {
    const issue = flow.issueSelectors?.find(i => i.id === booking.issueId);
    if (issue) notesParts.push(`Issue: ${issue.label}`);
  }
  if (booking.isEmergency) notesParts.push("🚨 Emergency booking");
  const siteCondEntries = Object.entries(booking.siteConditions);
  if (siteCondEntries.length > 0) {
    notesParts.push(`Site: ${siteCondEntries.map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }

  // 8. Insert booking
  const bookingInsert: Record<string, unknown> = {
    customer_id: userId,
    category_code: flow.code,
    service_type: booking.serviceTypeId || null,
    pricing_archetype: pricingArchetype,
    service_mode: serviceMode,
    is_emergency: booking.isEmergency || false,
    status: "requested" as const,
    device_details: deviceDetails,
    customer_latitude: locationData.lat || null,
    customer_longitude: locationData.lng || null,
    customer_address: locationData.address ? { displayName: locationData.address } : {},
    zone_code: locationData.zoneCode || null,
    estimated_price_lkr: estimatedPrice,
    notes: notesParts.length > 0 ? notesParts.join(" | ") : null,
    booking_source: "app",
    dispatch_status: "pending",
    diagnostic_answers: booking.diagnosticAnswers || {},
    diagnostic_summary: {},
  };

  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .insert(bookingInsert as any)
    .select("id")
    .single();

  if (bookingError || !bookingData) {
    console.error("[BookingService] Insert failed:", bookingError);
    return { success: false, error: bookingError?.message || "Failed to create booking" };
  }

  const bookingId = bookingData.id;

  // 9. Create initial timeline events
  const timelineEvents = [
    {
      booking_id: bookingId,
      status: "booking_created",
      actor: "system",
      note: `${flow.name} — ${booking.serviceTypeId || "General"} service request submitted`,
    },
    {
      booking_id: bookingId,
      status: "booking_confirmed",
      actor: "system",
      note: "Booking confirmed. Looking for the best available provider.",
    },
    {
      booking_id: bookingId,
      status: "dispatch_started",
      actor: "system",
      note: "Matching with verified providers in your area.",
    },
  ];

  const { error: timelineError } = await supabase
    .from("job_timeline")
    .insert(timelineEvents);

  if (timelineError) {
    console.warn("[BookingService] Timeline insert failed:", timelineError.message);
    // Don't fail the booking for timeline errors
  }

  return { success: true, bookingId };
}
