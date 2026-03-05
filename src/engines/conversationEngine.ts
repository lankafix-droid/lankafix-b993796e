import type { CategoryCode } from "@/types/booking";
import { categories } from "@/data/categories";
import { track } from "@/lib/analytics";

// ─── Conversation Types ─────────────────────────────────────────

export type ConversationStage =
  | "greeting"
  | "identify_intent"
  | "diagnosis_category"
  | "diagnosis_problem"
  | "diagnosis_result"
  | "booking_confirm"
  | "booking_location"
  | "booking_complete"
  | "tracking"
  | "subscription"
  | "support"
  | "escalation"
  | "idle";

export type UserIntent =
  | "book_service"
  | "track_technician"
  | "cancel_booking"
  | "request_invoice"
  | "amc_inquiry"
  | "troubleshoot"
  | "greeting"
  | "unknown";

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  quickReplies?: QuickReply[];
  metadata?: Record<string, unknown>;
}

export interface QuickReply {
  label: string;
  value: string;
}

export interface ConversationState {
  stage: ConversationStage;
  intent: UserIntent | null;
  categoryCode: CategoryCode | null;
  problemKey: string | null;
  deviceId: string | null;
  bookingJobId: string | null;
  language: "en" | "si" | "ta";
  history: ChatMsg[];
}

export interface SavedDevice {
  deviceId: string;
  label: string;
  categoryCode: CategoryCode;
  brand?: string;
  model?: string;
  purchaseYear?: number;
  lastServiceDate?: string;
}

// ─── Language Detection ─────────────────────────────────────────

const SINHALA_PATTERNS = /[\u0D80-\u0DFF]|eka|wenne|ne\b|karanna|hadanna|hari\b|nehe/i;
const TAMIL_PATTERNS = /[\u0B80-\u0BFF]|இல்லை|வேண்டும்|செய்|என்ன/;

export function detectLanguage(text: string): "en" | "si" | "ta" {
  if (TAMIL_PATTERNS.test(text)) return "ta";
  if (SINHALA_PATTERNS.test(text)) return "si";
  return "en";
}

// ─── Intent Detection ───────────────────────────────────────────

const INTENT_PATTERNS: { intent: UserIntent; patterns: RegExp[] }[] = [
  { intent: "book_service", patterns: [/book|schedule|arrange|send.*technician|fix|repair|install/i] },
  { intent: "track_technician", patterns: [/track|where.*technician|eta|arriving|coming/i] },
  { intent: "cancel_booking", patterns: [/cancel|stop|don'?t.*want/i] },
  { intent: "request_invoice", patterns: [/invoice|receipt|bill/i] },
  { intent: "amc_inquiry", patterns: [/amc|subscription|care.*plan|maintenance.*plan|renew/i] },
  { intent: "troubleshoot", patterns: [/not.*cool|not.*work|leak|noise|broken|slow|won'?t.*turn|not.*charging|drain|problem|issue|diagnos/i] },
  { intent: "greeting", patterns: [/^(hi|hello|hey|good\s*(morning|afternoon|evening)|ayubowan)/i] },
];

export function detectIntent(text: string): UserIntent {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return intent;
  }
  return "unknown";
}

// ─── Category Detection ─────────────────────────────────────────

const CATEGORY_KEYWORDS: { code: CategoryCode; keywords: RegExp }[] = [
  { code: "AC", keywords: /\bac\b|air\s*condition|cool|not\s*cool|leaking.*water/i },
  { code: "CCTV", keywords: /cctv|camera|security|dvr|nvr/i },
  { code: "MOBILE", keywords: /phone|mobile|screen|battery|charg/i },
  { code: "IT", keywords: /laptop|computer|pc|wifi|router|network|printer|slow.*pc/i },
  { code: "SOLAR", keywords: /solar|panel|inverter/i },
  { code: "COPIER", keywords: /copier|photocopy/i },
  { code: "SMART_HOME_OFFICE", keywords: /smart\s*home|automation|smart\s*office/i },
  { code: "CONSUMER_ELEC", keywords: /tv|television|fridge|washing.*machine|electronics/i },
  { code: "PRINT_SUPPLIES", keywords: /toner|ink|cartridge|print.*supply/i },
];

export function detectCategory(text: string): CategoryCode | null {
  for (const { code, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.test(text)) return code;
  }
  return null;
}

// ─── Problem Detection ──────────────────────────────────────────

const PROBLEM_KEYWORDS: Record<string, { keywords: RegExp; problem: string }[]> = {
  AC: [
    { keywords: /not.*cool|no.*cold/i, problem: "not_cooling" },
    { keywords: /leak|water.*drip/i, problem: "leaking_water" },
    { keywords: /noise|sound|vibrat/i, problem: "making_noise" },
    { keywords: /not.*turn|won'?t.*start|no.*power/i, problem: "not_turning_on" },
    { keywords: /clean|service|maintain/i, problem: "need_cleaning" },
  ],
  CCTV: [
    { keywords: /not.*show|blank|no.*feed/i, problem: "camera_not_showing" },
    { keywords: /dvr|nvr|record/i, problem: "dvr_nvr_issue" },
    { keywords: /remote|app|view.*phone/i, problem: "remote_not_working" },
    { keywords: /install|new.*camera/i, problem: "new_installation" },
  ],
  MOBILE: [
    { keywords: /screen|crack|display/i, problem: "screen_broken" },
    { keywords: /battery|drain/i, problem: "battery_draining" },
    { keywords: /not.*charg|plug/i, problem: "not_charging" },
    { keywords: /not.*turn|won'?t.*start/i, problem: "not_turning_on" },
    { keywords: /slow|virus|software|app/i, problem: "software_issue" },
  ],
  IT: [
    { keywords: /slow|lag/i, problem: "laptop_slow" },
    { keywords: /wifi|internet|network|router/i, problem: "wifi_network" },
    { keywords: /not.*turn|won'?t.*start|no.*power/i, problem: "desktop_not_on" },
    { keywords: /printer/i, problem: "printer_connectivity" },
    { keywords: /software|os|virus|update/i, problem: "software_os" },
  ],
  SOLAR: [
    { keywords: /low.*output|generat|power.*low/i, problem: "low_output" },
    { keywords: /inverter/i, problem: "inverter_issue" },
    { keywords: /battery/i, problem: "battery_issue" },
    { keywords: /install|new/i, problem: "need_installation" },
  ],
};

function detectProblem(text: string, cat: CategoryCode): string | null {
  const problems = PROBLEM_KEYWORDS[cat];
  if (!problems) return null;
  for (const { keywords, problem } of problems) {
    if (keywords.test(text)) return problem;
  }
  return null;
}

// ─── Device Memory ──────────────────────────────────────────────

const DEVICE_STORAGE_KEY = "lankafix_devices";

export function getSavedDevices(): SavedDevice[] {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveDevice(device: SavedDevice): void {
  const devices = getSavedDevices();
  const idx = devices.findIndex((d) => d.deviceId === device.deviceId);
  if (idx >= 0) devices[idx] = device;
  else devices.push(device);
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(devices));
}

// ─── Response Generator ─────────────────────────────────────────

function msgId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function assistantMsg(content: string, quickReplies?: QuickReply[], metadata?: Record<string, unknown>): ChatMsg {
  return { id: msgId(), role: "assistant", content, timestamp: new Date().toISOString(), quickReplies, metadata };
}

export function createInitialState(): ConversationState {
  return {
    stage: "greeting",
    intent: null,
    categoryCode: null,
    problemKey: null,
    deviceId: null,
    bookingJobId: null,
    language: "en",
    history: [
      assistantMsg(
        "👋 Hi! I'm your LankaFix helper.\nI can help you diagnose device issues, book a technician, track your service, or manage your care plan.\n\nHow can I help you today?",
        [
          { label: "🔧 Fix a device", value: "troubleshoot" },
          { label: "📅 Book a service", value: "book_service" },
          { label: "📍 Track technician", value: "track_technician" },
          { label: "💬 Support", value: "support" },
        ]
      ),
    ],
  };
}

export function processUserMessage(state: ConversationState, text: string): ConversationState {
  const lang = detectLanguage(text);
  const userMsg: ChatMsg = { id: msgId(), role: "user", content: text, timestamp: new Date().toISOString() };
  let newState: ConversationState = { ...state, language: lang, history: [...state.history, userMsg] };

  track("chat_message", { stage: state.stage, intent: state.intent, text: text.slice(0, 100) });

  // Route based on current stage
  switch (newState.stage) {
    case "greeting":
    case "idle":
    case "identify_intent":
      return handleIntentDetection(newState, text);

    case "diagnosis_category":
      return handleCategorySelection(newState, text);

    case "diagnosis_problem":
      return handleProblemSelection(newState, text);

    case "diagnosis_result":
      return handlePostDiagnosis(newState, text);

    case "booking_confirm":
      return handleBookingConfirm(newState, text);

    case "booking_location":
      return handleBookingLocation(newState, text);

    case "tracking":
      return handleTracking(newState, text);

    case "support":
    case "subscription":
      return handleSupport(newState, text);

    default:
      return handleIntentDetection(newState, text);
  }
}

function addReply(state: ConversationState, msg: ChatMsg, stage?: ConversationStage): ConversationState {
  return { ...state, history: [...state.history, msg], stage: stage ?? state.stage };
}

// ─── Handlers ───────────────────────────────────────────────────

function handleIntentDetection(state: ConversationState, text: string): ConversationState {
  const intent = detectIntent(text);
  const cat = detectCategory(text);

  if (intent === "greeting") {
    return addReply(
      { ...state, intent: "greeting" },
      assistantMsg("Hello! 😊 What can I help you with today?", [
        { label: "🔧 Fix a device", value: "troubleshoot" },
        { label: "📅 Book service", value: "book_service" },
        { label: "📍 Track technician", value: "track_technician" },
      ]),
      "identify_intent"
    );
  }

  if (intent === "troubleshoot" || text === "troubleshoot") {
    if (cat) {
      const catData = categories.find((c) => c.code === cat);
      const problem = detectProblem(text, cat);
      if (problem) {
        return runDiagnosis({ ...state, intent: "troubleshoot", categoryCode: cat, problemKey: problem });
      }
      const problemOptions = getProblemOptions(cat);
      return addReply(
        { ...state, intent: "troubleshoot", categoryCode: cat },
        assistantMsg(
          `I see you need help with **${catData?.name || cat}**.\nWhat's the issue?`,
          problemOptions
        ),
        "diagnosis_problem"
      );
    }
    return addReply(
      { ...state, intent: "troubleshoot" },
      assistantMsg(
        "Let me help diagnose your device.\nWhich device type are you having trouble with?",
        [
          { label: "❄️ AC", value: "AC" },
          { label: "📹 CCTV", value: "CCTV" },
          { label: "📱 Mobile", value: "MOBILE" },
          { label: "💻 IT / Computer", value: "IT" },
          { label: "☀️ Solar", value: "SOLAR" },
          { label: "🖨️ Other", value: "other" },
        ]
      ),
      "diagnosis_category"
    );
  }

  if (intent === "book_service" || text === "book_service") {
    if (cat) {
      const catData = categories.find((c) => c.code === cat);
      return addReply(
        { ...state, intent: "book_service", categoryCode: cat },
        assistantMsg(
          `Great! I'll help you book a **${catData?.name}** technician.\nWhat area are you located in?`,
          [
            { label: "📍 Colombo", value: "Colombo" },
            { label: "📍 Dehiwala", value: "Dehiwala" },
            { label: "📍 Nugegoda", value: "Nugegoda" },
            { label: "📍 Other", value: "other_location" },
          ]
        ),
        "booking_location"
      );
    }
    return addReply(
      { ...state, intent: "book_service" },
      assistantMsg(
        "What type of service do you need?",
        [
          { label: "❄️ AC Service", value: "AC" },
          { label: "📹 CCTV", value: "CCTV" },
          { label: "📱 Mobile Repair", value: "MOBILE" },
          { label: "💻 IT Support", value: "IT" },
          { label: "☀️ Solar", value: "SOLAR" },
        ]
      ),
      "diagnosis_category"
    );
  }

  if (intent === "track_technician" || text === "track_technician") {
    return addReply(
      { ...state, intent: "track_technician" },
      assistantMsg(
        "Please share your booking ID (e.g., LF-ABC123) and I'll check the status for you.",
        []
      ),
      "tracking"
    );
  }

  if (intent === "amc_inquiry") {
    return addReply(
      { ...state, intent: "amc_inquiry" },
      assistantMsg(
        "LankaFix Care plans provide regular maintenance, priority dispatch, and discounted repairs.\n\n🛡️ **Basic** — LKR 999/mo\n⭐ **Standard** — LKR 1,999/mo\n💎 **Premium** — LKR 3,999/mo\n\nWould you like to learn more or subscribe?",
        [
          { label: "View Plans", value: "view_plans" },
          { label: "Subscribe", value: "subscribe" },
          { label: "Back", value: "back" },
        ]
      ),
      "subscription"
    );
  }

  if (intent === "cancel_booking") {
    return addReply(
      { ...state, intent: "cancel_booking" },
      assistantMsg("Please share your booking ID and I'll help with the cancellation."),
      "support"
    );
  }

  // Unknown or support
  if (intent === "unknown" || text === "support") {
    return addReply(
      { ...state, intent: "unknown" },
      assistantMsg(
        "I can help you with:\n\n🔧 **Troubleshoot** — Diagnose device issues\n📅 **Book** — Schedule a technician\n📍 **Track** — Check technician ETA\n🛡️ **Care Plans** — Manage subscriptions\n\nWhat would you like to do?",
        [
          { label: "🔧 Troubleshoot", value: "troubleshoot" },
          { label: "📅 Book", value: "book_service" },
          { label: "📍 Track", value: "track_technician" },
          { label: "🛡️ Care Plans", value: "amc_inquiry" },
        ]
      ),
      "identify_intent"
    );
  }

  return state;
}

function handleCategorySelection(state: ConversationState, text: string): ConversationState {
  const cat = detectCategory(text) || (text as CategoryCode);
  const catData = categories.find((c) => c.code === cat);

  if (!catData) {
    return addReply(
      state,
      assistantMsg("I didn't catch that. Which device type?", [
        { label: "❄️ AC", value: "AC" },
        { label: "📹 CCTV", value: "CCTV" },
        { label: "📱 Mobile", value: "MOBILE" },
        { label: "💻 IT", value: "IT" },
      ])
    );
  }

  if (state.intent === "book_service") {
    return addReply(
      { ...state, categoryCode: cat },
      assistantMsg(`What area are you located in for your **${catData.name}** service?`, [
        { label: "📍 Colombo", value: "Colombo" },
        { label: "📍 Dehiwala", value: "Dehiwala" },
        { label: "📍 Nugegoda", value: "Nugegoda" },
      ]),
      "booking_location"
    );
  }

  const problemOptions = getProblemOptions(cat);
  return addReply(
    { ...state, categoryCode: cat },
    assistantMsg(`Got it — **${catData.name}**.\nWhat's the issue?`, problemOptions),
    "diagnosis_problem"
  );
}

function handleProblemSelection(state: ConversationState, text: string): ConversationState {
  const cat = state.categoryCode;
  if (!cat) return handleIntentDetection(state, text);

  const problem = detectProblem(text, cat) || text;
  return runDiagnosis({ ...state, problemKey: problem });
}

function runDiagnosis(state: ConversationState): ConversationState {
  const { categoryCode: cat, problemKey: problem } = state;
  if (!cat || !problem) return state;

  const catData = categories.find((c) => c.code === cat);

  // Try to find matching problem from diagnose engine data
  const problemLabels: Record<string, string> = {
    not_cooling: "not cooling properly",
    leaking_water: "leaking water",
    making_noise: "making unusual noise",
    not_turning_on: "not turning on",
    need_cleaning: "needs cleaning/service",
    camera_not_showing: "camera not showing",
    dvr_nvr_issue: "DVR/NVR issue",
    screen_broken: "broken screen",
    battery_draining: "battery draining fast",
    not_charging: "not charging",
    laptop_slow: "running slow",
    wifi_network: "WiFi/network issue",
  };

  const issueLabel = problemLabels[problem] || problem;

  track("chat_diagnosis_complete", { category: cat, problem });

  return addReply(
    state,
    assistantMsg(
      `Based on your description, it sounds like your **${catData?.name}** is **${issueLabel}**.\n\n🔍 **Likely cause:** Common issue that requires professional inspection.\n💰 **Estimated cost:** From LKR ${catData?.fromPrice?.toLocaleString() || "3,000"}\n⏱️ **Estimated time:** 1–2 hours\n\nWould you like me to book a LankaFix technician?`,
      [
        { label: "✅ Book Technician", value: "yes_book" },
        { label: "💡 Self-fix tips", value: "self_fix" },
        { label: "❌ Not now", value: "not_now" },
      ]
    ),
    "diagnosis_result"
  );
}

function handlePostDiagnosis(state: ConversationState, text: string): ConversationState {
  if (/yes|book|arrange|confirm|yes_book/i.test(text)) {
    return addReply(
      { ...state, intent: "book_service" },
      assistantMsg(
        "Great! A LankaFix technician can visit you today.\nWhat area are you in?",
        [
          { label: "📍 Colombo", value: "Colombo" },
          { label: "📍 Dehiwala", value: "Dehiwala" },
          { label: "📍 Nugegoda", value: "Nugegoda" },
          { label: "📍 Other", value: "other_location" },
        ]
      ),
      "booking_location"
    );
  }

  if (/self.*fix|tip|self_fix/i.test(text)) {
    return addReply(
      state,
      assistantMsg(
        "Here are some safe things you can try:\n\n1️⃣ Check power connections\n2️⃣ Clean any filters or vents\n3️⃣ Restart the device\n\n⚠️ *If the issue continues, a LankaFix technician can assist.*\n\nWould you still like to book a technician?",
        [
          { label: "✅ Yes, book", value: "yes_book" },
          { label: "No thanks", value: "not_now" },
        ]
      )
    );
  }

  return addReply(
    state,
    assistantMsg(
      "No problem! Feel free to come back anytime.\nIs there anything else I can help with?",
      [
        { label: "🔧 Another issue", value: "troubleshoot" },
        { label: "📅 Book service", value: "book_service" },
        { label: "No, thanks", value: "bye" },
      ]
    ),
    "idle"
  );
}

function handleBookingConfirm(state: ConversationState, text: string): ConversationState {
  if (/yes|confirm|proceed/i.test(text)) {
    const catData = categories.find((c) => c.code === state.categoryCode);
    return addReply(
      state,
      assistantMsg(
        `✅ **Booking Confirmed!**\n\n📋 Service: ${catData?.name}\n📍 Area: Colombo\n⏰ A technician will be assigned shortly.\n\nYou'll receive updates here and via SMS.\n\nAnything else I can help with?`,
        [
          { label: "📍 Track technician", value: "track_technician" },
          { label: "No, thanks", value: "bye" },
        ]
      ),
      "idle"
    );
  }
  return handleIntentDetection(state, text);
}

function handleBookingLocation(state: ConversationState, text: string): ConversationState {
  const location = text.replace("📍 ", "");
  const catData = categories.find((c) => c.code === state.categoryCode);

  return addReply(
    state,
    assistantMsg(
      `Perfect! Here's your booking summary:\n\n📋 **${catData?.name}**\n📍 **${location}**\n💰 From **LKR ${catData?.fromPrice?.toLocaleString() || "3,000"}**\n\nA technician can arrive within 60 minutes.\nShall I confirm this booking?`,
      [
        { label: "✅ Confirm Booking", value: "confirm" },
        { label: "✏️ Change details", value: "change" },
        { label: "❌ Cancel", value: "not_now" },
      ]
    ),
    "booking_confirm"
  );
}

function handleTracking(state: ConversationState, text: string): ConversationState {
  if (/LF-/i.test(text)) {
    const jobId = text.match(/LF-[A-Z0-9]+/i)?.[0]?.toUpperCase() || text;
    return addReply(
      state,
      assistantMsg(
        `📍 Checking status for **${jobId}**...\n\nYour technician **Kasun** is on the way!\n🚗 ETA: **25 minutes**\n📍 Current location: Kollupitiya\n\n[Track Live →](/tracker/${jobId})`,
        [
          { label: "🔄 Refresh", value: `track ${jobId}` },
          { label: "📞 Contact tech", value: "contact_tech" },
        ]
      ),
      "idle"
    );
  }

  return addReply(
    state,
    assistantMsg("Please provide your booking ID (starts with LF-).")
  );
}

function handleSupport(state: ConversationState, text: string): ConversationState {
  if (/view.*plan|subscribe/i.test(text)) {
    return addReply(
      state,
      assistantMsg(
        "Visit our Care Plans page to explore options and subscribe.\n\n[View Care Plans →](/care)\n\nAnything else?",
        [{ label: "🔧 Fix a device", value: "troubleshoot" }, { label: "No thanks", value: "bye" }]
      ),
      "idle"
    );
  }

  if (/back|bye|no.*thank/i.test(text)) {
    return addReply(
      state,
      assistantMsg("Thank you for using LankaFix! 🙏\nFeel free to chat anytime you need help."),
      "idle"
    );
  }

  return addReply(
    state,
    assistantMsg(
      "I'll connect you with our support team for assistance.\n\n📞 Call: 0112 000 000\n💬 WhatsApp: +94 77 123 4567\n\nOr describe your issue and I'll try to help.",
      [
        { label: "🔧 Troubleshoot", value: "troubleshoot" },
        { label: "📅 Book service", value: "book_service" },
      ]
    ),
    "identify_intent"
  );
}

// ─── Helper ─────────────────────────────────────────────────────

function getProblemOptions(cat: CategoryCode): QuickReply[] {
  const options: Record<string, QuickReply[]> = {
    AC: [
      { label: "Not cooling", value: "not_cooling" },
      { label: "Leaking water", value: "leaking_water" },
      { label: "Making noise", value: "making_noise" },
      { label: "Won't turn on", value: "not_turning_on" },
      { label: "Needs cleaning", value: "need_cleaning" },
    ],
    CCTV: [
      { label: "Camera not showing", value: "camera_not_showing" },
      { label: "DVR/NVR issue", value: "dvr_nvr_issue" },
      { label: "Remote view not working", value: "remote_not_working" },
      { label: "New installation", value: "new_installation" },
    ],
    MOBILE: [
      { label: "Screen broken", value: "screen_broken" },
      { label: "Battery draining", value: "battery_draining" },
      { label: "Not charging", value: "not_charging" },
      { label: "Won't turn on", value: "not_turning_on" },
    ],
    IT: [
      { label: "Running slow", value: "laptop_slow" },
      { label: "WiFi / Network", value: "wifi_network" },
      { label: "Won't turn on", value: "desktop_not_on" },
      { label: "Printer issue", value: "printer_connectivity" },
    ],
    SOLAR: [
      { label: "Low output", value: "low_output" },
      { label: "Inverter issue", value: "inverter_issue" },
      { label: "Battery issue", value: "battery_issue" },
      { label: "New installation", value: "need_installation" },
    ],
  };
  return options[cat] || [{ label: "Not sure", value: "not_sure" }];
}
