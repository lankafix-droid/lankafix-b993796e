/**
 * LankaFix – Store Metadata
 * For Google Play Store and Apple App Store submission
 */

export const storeMetadata = {
  // ─── App Identity ───
  appTitle: "LankaFix – Smart Repair & Technical Services",
  shortName: "LankaFix",
  packageId: "com.lankafix.app",   // Android + iOS bundle ID

  // ─── Store Listing ───
  shortDescription:
    "Book verified technicians for repairs, installations & technical support across Sri Lanka.",
  longDescription: `LankaFix connects homes and businesses with verified technicians for repairs, installations, and technical support across Sri Lanka.

Key Features:
• 15+ service categories including mobile repair, AC servicing, CCTV installation, electrical, plumbing, IT support, and more
• OTP-verified bookings for maximum security
• Transparent, upfront pricing with no hidden fees
• Real-time technician tracking and live ETAs
• Warranty-backed service with documented quality checks
• Smart diagnostics to identify issues before booking
• Device Passport system to track your appliance history
• Emergency SOS for urgent repairs
• Multiple payment options including cash, card, and bank transfer
• Available across Greater Colombo with expansion planned

Whether you need a quick phone screen fix, a full AC installation, or a complete CCTV security setup — LankaFix has a verified technician ready to help.

Download now and experience Sri Lanka's most trusted tech service marketplace.`,

  // ─── Category ───
  googlePlayCategory: "Home Services",
  appStoreCategory: "Utilities",
  appStoreSubCategory: "Lifestyle",

  // ─── Contact ───
  supportEmail: "hello@lankafix.lk",
  supportWebsite: "https://lankafix.lovable.app",
  privacyPolicyUrl: "https://lankafix.lovable.app/privacy",
  termsOfServiceUrl: "https://lankafix.lovable.app/terms",

  // ─── Ratings ───
  contentRating: "Everyone",
  targetAgeGroup: "18+",

  // ─── Permissions Justification ───
  permissions: {
    location: {
      purpose: "To detect your address for booking and dispatch the nearest technician",
      whenRequested: "When user taps 'Use my location' during booking",
    },
    camera: {
      purpose: "To let users photograph device issues for faster diagnosis",
      whenRequested: "When user taps 'Upload Photo' in the diagnosis flow",
    },
    notifications: {
      purpose: "To send booking confirmations, technician arrival alerts, and payment receipts",
      whenRequested: "After first booking is confirmed",
    },
  },

  // ─── Keywords ───
  keywords: [
    "technician",
    "repair",
    "Sri Lanka",
    "Colombo",
    "AC service",
    "CCTV",
    "mobile repair",
    "plumbing",
    "electrical",
    "home services",
    "LankaFix",
  ],
} as const;
