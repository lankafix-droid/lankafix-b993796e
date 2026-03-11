/**
 * LankaFix Booking Service
 * Handles real booking creation, duplicate prevention, zone validation,
 * timeline initialization, and notification events.
 */
import { supabase } from "@/integrations/supabase/client";
import type { V2BookingState } from "@/pages/V2BookingPage";
import type { V2CategoryFlow } from "@/data/v2CategoryFlows";
import { isCategoryConsultation, isCategoryComingSoon } from "@/config/categoryLaunchConfig";
import { validateServiceZone } from "@/store/locationStore";

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
  errorCode?: "zone_not_supported" | "coming_soon" | "duplicate" | "auth_required" | "insert_failed";
}

// ─── Launch Zone IDs that allow real booking ───
// Greater Colombo zones + Gampaha suburbs
const LAUNCH_ZONE_IDS = new Set([
  "col_01", "col_02", "col_03", "col_04", "col_05", "col_06", "col_07",
  "col_08", "col_09", "col_10", "col_11", "col_12", "col_13", "col_14", "col_15",
  "nugegoda", "rajagiriya", "battaramulla", "nawala", "dehiwala", "mt_lavinia",
  "thalawathugoda", "maharagama", "kotte", "kaduwela", "malabe", "piliyandala",
  "moratuwa", "boralesgamuwa", "athurugiriya", "wattala", "ratmalana", "kelaniya",
  "ja_ela", "gampaha", "negombo",
]);

/**
 * Validate that the booking location is within a supported launch zone.
 * Returns zoneId if valid, null if outside.
 */
function validateLaunchZone(lat?: number, lng?: number, zoneCode?: string | null): {
  valid: boolean;
  zoneId: string | null;
  zoneStatus: "inside" | "edge" | "outside";
} {
  // If we already have a zone code from location picker, check it
  if (zoneCode && LAUNCH_ZONE_IDS.has(zoneCode)) {
    return { valid: true, zoneId: zoneCode, zoneStatus: "inside" };
  }

  // If we have coordinates, validate against zone data
  if (lat && lng) {
    const result = validateServiceZone(lat, lng);
    if (result.zoneId && LAUNCH_ZONE_IDS.has(result.zoneId)) {
      return { valid: true, zoneId: result.zoneId, zoneStatus: result.status };
    }
    // Edge zones are allowed but with travel fee
    if (result.status === "edge" && result.zoneId) {
      return { valid: true, zoneId: result.zoneId, zoneStatus: "edge" };
    }
    return { valid: false, zoneId: null, zoneStatus: "outside" };
  }

  // No location data — allow but log (user may not have set location)
  return { valid: true, zoneId: null, zoneStatus: "inside" };
}

/**
 * Check for duplicate bookings within the last 30 seconds
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
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Record a notification event for internal tracking.
 */
async function recordNotificationEvent(
  eventType: string,
  opts: {
    bookingId?: string;
    customerId?: string;
    partnerId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from("notification_events").insert({
      event_type: eventType,
      booking_id: opts.bookingId || null,
      customer_id: opts.customerId || null,
      partner_id: opts.partnerId || null,
      metadata: opts.metadata || {},
    } as any);
  } catch (e) {
    console.warn("[BookingService] Notification event insert failed:", e);
  }
}

/**
 * Create a real booking in the database with timeline events and notification records.
 */
export async function createBooking(payload: BookingCreatePayload): Promise<BookingCreateResult> {
  const { flow, booking, userId, locationData } = payload;

  // 1. Auth check
  if (!userId) {
    await recordNotificationEvent("booking_failed", {
      metadata: { reason: "auth_required", category: flow.code },
    });
    return { success: false, error: "Authentication required", errorCode: "auth_required" };
  }

  // 2. Coming-soon gate — should not reach here but safety check
  if (isCategoryComingSoon(flow.code)) {
    return { success: false, error: "This category is coming soon.", errorCode: "coming_soon" };
  }

  // 3. Zone validation
  const zoneCheck = validateLaunchZone(locationData.lat, locationData.lng, locationData.zoneCode);
  if (!zoneCheck.valid) {
    await recordNotificationEvent("zone_not_supported", {
      customerId: userId,
      metadata: {
        category: flow.code,
        lat: locationData.lat,
        lng: locationData.lng,
        address: locationData.address,
      },
    });
    return {
      success: false,
      error: "Service is launching soon in your area. We currently serve Greater Colombo.",
      errorCode: "zone_not_supported",
    };
  }

  // 4. Duplicate prevention
  const isDuplicate = await checkDuplicate(userId, flow.code);
  if (isDuplicate) {
    return {
      success: false,
      error: "A similar booking was just submitted. Please wait before trying again.",
      errorCode: "duplicate",
    };
  }

  // 5. Determine if this is a consultation booking
  const isConsultation = isCategoryConsultation(flow.code);

  // 6. Build device details
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

  // 7. Determine pricing archetype
  const pricingArchetype = flow.pricingArchetype === "fixed_price"
    ? "fixed_price" as const
    : flow.pricingArchetype === "diagnostic_first"
    ? "diagnostic_first" as const
    : "quote_required" as const;

  // 8. Determine service mode
  const serviceModeMap: Record<string, "on_site" | "drop_off" | "pickup_return" | "remote"> = {
    on_site: "on_site",
    drop_off: "drop_off",
    pickup_return: "pickup_return",
    remote: "remote",
  };
  const serviceMode = serviceModeMap[booking.serviceModeId] || "on_site";

  // 9. Build estimated price
  const selectedPackage = flow.packages.find(p => p.id === booking.packageId);
  const estimatedPrice = selectedPackage?.price || null;

  // 10. Build notes
  const notesParts: string[] = [];
  if (isConsultation) notesParts.push("📋 Consultation request — manual assignment required");
  if (booking.issueId) {
    const issue = flow.issueSelectors?.find(i => i.id === booking.issueId);
    if (issue) notesParts.push(`Issue: ${issue.label}`);
  }
  if (booking.isEmergency) notesParts.push("🚨 Emergency booking");
  const siteCondEntries = Object.entries(booking.siteConditions);
  if (siteCondEntries.length > 0) {
    notesParts.push(`Site: ${siteCondEntries.map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }

  // 11. Insert booking
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
    zone_code: zoneCheck.zoneId || locationData.zoneCode || null,
    estimated_price_lkr: estimatedPrice,
    notes: notesParts.length > 0 ? notesParts.join(" | ") : null,
    booking_source: "app",
    // Consultation bookings use manual dispatch to prevent auto-dispatch
    dispatch_status: isConsultation ? "manual" : "pending",
    dispatch_mode: isConsultation ? "manual" : "auto",
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
    await recordNotificationEvent("booking_failed", {
      customerId: userId,
      metadata: { category: flow.code, error: bookingError?.message },
    });
    return { success: false, error: bookingError?.message || "Failed to create booking", errorCode: "insert_failed" };
  }

  const bookingId = bookingData.id;

  // 12. Create timeline events
  const timelineEvents = isConsultation
    ? [
        {
          booking_id: bookingId,
          status: "booking_created",
          actor: "system",
          note: `${flow.name} — Consultation request submitted`,
        },
        {
          booking_id: bookingId,
          status: "consultation_pending",
          actor: "system",
          note: "Our team will review your request and assign a specialist.",
        },
      ]
    : [
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
  }

  // 13. Record notification events
  const eventType = isConsultation ? "consultation_requested" : "booking_created";
  await recordNotificationEvent(eventType, {
    bookingId,
    customerId: userId,
    metadata: {
      category: flow.code,
      serviceType: booking.serviceTypeId,
      zoneId: zoneCheck.zoneId,
      isEmergency: booking.isEmergency,
      pricingArchetype,
    },
  });

  // Also record dispatch_started for operational bookings
  if (!isConsultation) {
    await recordNotificationEvent("dispatch_started", {
      bookingId,
      customerId: userId,
      metadata: { category: flow.code },
    });
  }

  return { success: true, bookingId };
}
