export const patient = {
  name: "Sarah Martinez",
  age: 45,
  gender: "F",
  condition: "Type 2 Diabetes",
  mrn: "00429",
  riskScore: "High",
};

export const dashboardData = {
  healthScore: 82,
  activeAlerts: 3,
  stepsToday: 7421,
  stepsGoal: 10000,
  glucoseLatest: 142,
  glucoseUnit: "mg/dL",
  glucoseTrend: "+12%",
  dataSources: [
    { name: "Apple Watch Series 9", status: "Live", icon: "⌚", accent: "teal" },
    { name: "Dexcom G7 CGM", status: "Live", icon: "🩸", accent: "rose" },
    { name: "Home Test Kit", status: "New", icon: "🧪", accent: "sky" },
    { name: "Symptom Logger", status: "Live", icon: "📝", accent: "violet" },
    { name: "SDOH Survey", status: "Flagged", icon: "🏠", accent: "amber" },
  ],
  alerts: [
    { title: "Glucose >200 for 3 days", severity: "Critical", icon: "🚨" },
    { title: "Sleep <5h for 4 nights", severity: "High", icon: "😴" },
    { title: "SDOH: Transport barrier", severity: "Medium", icon: "🚗" },
  ],
  forecast: { peak: 185, risk: 68, trend: "rising" },
};

// 14-day sparkline trends per metric
export const metricTrends = {
  health: [76, 78, 75, 79, 80, 78, 81, 79, 82, 81, 83, 82, 84, 82],
  alerts: [1, 0, 2, 1, 1, 3, 2, 1, 4, 2, 3, 2, 3, 3],
  steps: [6200, 7800, 8400, 5900, 9100, 7200, 6800, 8800, 7500, 9300, 6400, 7100, 8200, 7421],
  glucose: [128, 132, 138, 141, 145, 152, 148, 156, 162, 158, 165, 158, 148, 142],
};

// 24-hour glucose forecast points
export const glucoseForecast = Array.from({ length: 24 }, (_, i) => {
  const base = 120 + Math.sin(i / 3) * 25 + i * 2.4;
  const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 6;
  return {
    hour: `${i}:00`,
    actual: i < 10 ? Math.round(base + noise) : null,
    forecast: Math.round(base + noise + (i >= 10 ? (i - 10) * 4 : 0)),
    upper: Math.round(base + noise + (i >= 10 ? (i - 10) * 6 + 18 : 12)),
    lower: Math.round(base + noise - (i >= 10 ? 8 : 10)),
  };
});

export const timelineData = [
  {
    date: "Today",
    events: [
      { time: "08:14 AM", source: "Dexcom G7 CGM", title: "Fasting Glucose: 234 mg/dL", severity: "Alert", category: "Glucose" },
      { time: "07:30 AM", source: "Apple Watch", title: "Sleep: 4h 22m", detail: "Deep: 42min · REM: 58min", category: "Wearable" },
      { time: "06:48 AM", source: "Apple Watch", title: "Resting HR: 78 bpm", detail: "↑ 8 bpm vs. baseline", category: "Wearable" },
    ],
  },
  {
    date: "Yesterday",
    events: [
      { time: "09:00 PM", source: "Symptom Logger", title: "Fatigue 7/10 · Headache 4/10", detail: "Caregiver note included", category: "Symptoms" },
      { time: "02:15 PM", source: "Quest Home Test", title: "A1C: 7.8%", detail: "Captured via API", category: "Tests" },
      { time: "10:02 AM", source: "SDOH Survey", title: "Transport barrier reported", detail: "Missed 1 prior appointment", category: "SDOH" },
    ],
  },
  {
    date: "Jun 14",
    events: [
      { time: "11:42 PM", source: "Dexcom G7 CGM", title: "Nocturnal Low: 64 mg/dL", severity: "Alert", category: "Glucose" },
      { time: "07:11 AM", source: "Apple Watch", title: "Steps: 8,210", detail: "Active min: 41", category: "Wearable" },
    ],
  },
];

export const glucoseTrend = [
  { day: "Mon", value: 138 },
  { day: "Tue", value: 156 },
  { day: "Wed", value: 172 },
  { day: "Thu", value: 188 },
  { day: "Fri", value: 201 },
  { day: "Sat", value: 218 },
  { day: "Sun", value: 234 },
];

export const devicesData = [
  { id: "d1", name: "Apple Watch Series 9", icon: "⌚", status: "Connected", lastSync: "2 min ago", dataTypes: "Steps, HR, Sleep, SpO2", accent: "teal" },
  { id: "d2", name: "Dexcom G7 CGM", icon: "🩸", status: "Connected", lastSync: "1 hour ago", dataTypes: "Continuous glucose", accent: "rose" },
  { id: "d3", name: "OneTouch Glucose Meter", icon: "🧪", status: "Needs Reconnect", lastSync: "3 days ago", dataTypes: "Manual glucose", accent: "amber" },
  { id: "d4", name: "Symptom Logger", icon: "📝", status: "Active", lastSync: "Today", dataTypes: "Symptom logs", accent: "violet" },
  { id: "d5", name: "SDOH Survey", icon: "🏠", status: "Active", lastSync: "Jun 10", dataTypes: "Social determinants", accent: "sky" },
];

export const alertsData = [
  {
    id: "alt1",
    severity: "Critical",
    icon: "🚨",
    title: "Glucose Crisis Pattern Detected",
    description: "Fasting glucose >200 mg/dL for 3 consecutive days. Combined with fatigue and poor sleep.",
    meta: ["Dexcom G7", "3 days", "Confidence 94%"],
    actions: ["Call Patient", "Acknowledge"],
  },
  {
    id: "alt2",
    severity: "High",
    icon: "😴",
    title: "Sleep Deprivation + Fatigue Correlation",
    description: "Sleep averaging 4.5h/night this week. Fatigue rated 6-8/10 on 4 of 7 days.",
    meta: ["Apple Watch", "7 days", "Confidence 88%"],
    actions: ["View Data", "Acknowledge"],
  },
  {
    id: "alt3",
    severity: "Medium",
    icon: "🚗",
    title: "SDOH: Transport Barrier",
    description: "Patient reported transport difficulty. Next appointment Jun 17 — 5 days away.",
    meta: ["SDOH Survey", "1 day", "Confidence 76%"],
    actions: ["Arrange Lyft", "Dismiss"],
  },
];

export const alertHistory = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  count: Math.max(0, Math.round(Math.sin(i / 3) * 2 + (i > 22 ? 3 : 1) + Math.random())),
}));

export const genieMessages = [
  {
    role: "assistant" as const,
    content:
      "👋 Hi Sarah! I'm Genie. I see your glucose has been elevated for 3 days and your sleep is below 5 hours. Would you like me to explain what this pattern means?",
  },
  {
    role: "user" as const,
    content: "Why is my glucose so high this week?",
  },
  {
    role: "assistant" as const,
    content:
      "Let me analyze your last 7 days of data...\n\nKey findings:\n1. Sleep avg: 4.5h (↓ 18% from baseline)\n2. Evening carbs: 65g avg (↑ 25%)\n3. Stress flagged in SDOH survey\n\nCombined, these factors explain 84% of your glucose variability.",
    actions: ["Set appointment reminder", "Log Meal"],
  },
];

export const demoSteps = [
  { icon: "👋", title: "Welcome", body: "Quest Beyond captures what Epic misses." },
  { icon: "📊", title: "Dashboard", body: "Sarah Martinez · Health Score 82 · 3 active alerts.", path: "/" },
  { icon: "🩸", title: "Alerts", body: "Glucose >200 for 3 days. Sleep <5h.", path: "/alerts" },
  { icon: "🧞", title: "Genie AI", body: "84% of glucose variability explained by sleep, carbs, stress.", path: "/genie" },
  { icon: "🚀", title: "Vision", body: "Today: 5 sources. Tomorrow: millions." },
];

export const accentClass: Record<string, { text: string; bg: string; ring: string }> = {
  teal:   { text: "text-teal",   bg: "bg-teal-soft",   ring: "ring-teal/30"   },
  amber:  { text: "text-amber",  bg: "bg-amber-soft",  ring: "ring-amber/30"  },
  violet: { text: "text-violet", bg: "bg-violet-soft", ring: "ring-violet/30" },
  rose:   { text: "text-rose",   bg: "bg-rose-soft",   ring: "ring-rose/30"   },
  sky:    { text: "text-sky",    bg: "bg-sky-soft",    ring: "ring-sky/30"    },
  lime:   { text: "text-lime",   bg: "bg-lime-soft",   ring: "ring-lime/30"   },
};

export const severityAccent: Record<string, string> = {
  Critical: "rose",
  High: "amber",
  Medium: "sky",
  Low: "lime",
  Alert: "rose",
};

// ── Family module types ────────────────────────────────────────────────────────

export type Relationship =
  | "Father"
  | "Mother"
  | "Spouse"
  | "Son"
  | "Daughter"
  | "Sibling"
  | "Guardian"
  | "Other";

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export type Gender = "Male" | "Female" | "Non-binary" | "Prefer not to say";

export type WellbeingStatus = "Good" | "Monitor" | "Alert";

export interface MetricEntry {
  id: string;
  date: string;
  bloodPressure?: string;
  bloodSugar?: number;
  weight?: number;
  heartRate?: number;
  oxygenSaturation?: number;
  temperature?: number;
  notes?: string;
}

export interface FamilyMember {
  id: string;
  fullName: string;
  relationship: Relationship;
  age: number;
  gender: Gender;
  bloodGroup: BloodGroup;
  phone: string;
  email: string;
  emergencyContact: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  healthNotes: string;
  wellbeingNotes: string;
  metrics: MetricEntry[];
  wellbeingStatus: WellbeingStatus;
  lastUpdated: string;
  reportsCount: number;
}

export const initialFamilyMembers: FamilyMember[] = [
  {
    id: "fm1",
    fullName: "Carlos Martinez",
    relationship: "Father",
    age: 72,
    gender: "Male",
    bloodGroup: "O+",
    phone: "+1 (555) 234-5678",
    email: "carlos.m@email.com",
    emergencyContact: "Maria Martinez · +1 (555) 234-0001",
    conditions: ["Hypertension", "Arthritis"],
    allergies: ["Penicillin"],
    medications: ["Lisinopril 10mg", "Aspirin 81mg"],
    healthNotes: "BP trending higher in the mornings. Monitoring closely.",
    wellbeingNotes: "Feeling good overall, slightly less active this week.",
    metrics: [
      { id: "m1", date: "Jun 23, 2026", bloodPressure: "145/92", heartRate: 78, weight: 168, oxygenSaturation: 97, temperature: 98.4, notes: "Morning reading" },
      { id: "m2", date: "Jun 20, 2026", bloodPressure: "138/88", heartRate: 74, weight: 169, oxygenSaturation: 98, temperature: 98.2 },
      { id: "m3", date: "Jun 17, 2026", bloodPressure: "142/90", heartRate: 76, weight: 169, oxygenSaturation: 97, temperature: 98.6 },
    ],
    wellbeingStatus: "Monitor",
    lastUpdated: "2 hours ago",
    reportsCount: 4,
  },
  {
    id: "fm2",
    fullName: "Maria Martinez",
    relationship: "Mother",
    age: 68,
    gender: "Female",
    bloodGroup: "A+",
    phone: "+1 (555) 234-5679",
    email: "maria.m@email.com",
    emergencyContact: "Carlos Martinez · +1 (555) 234-5678",
    conditions: ["Type 2 Diabetes", "Hypothyroidism"],
    allergies: ["Sulfa drugs", "Shellfish"],
    medications: ["Metformin 500mg", "Levothyroxine 50mcg"],
    healthNotes: "Blood sugar well-controlled with diet changes this month.",
    wellbeingNotes: "Active, walking 30 min daily. Mood positive.",
    metrics: [
      { id: "m4", date: "Jun 23, 2026", bloodSugar: 118, heartRate: 72, weight: 142, oxygenSaturation: 98, temperature: 98.1 },
      { id: "m5", date: "Jun 21, 2026", bloodSugar: 124, heartRate: 70, weight: 142, oxygenSaturation: 98, temperature: 98.3 },
      { id: "m6", date: "Jun 18, 2026", bloodSugar: 131, heartRate: 73, weight: 143, oxygenSaturation: 97, temperature: 98.0 },
    ],
    wellbeingStatus: "Good",
    lastUpdated: "1 day ago",
    reportsCount: 6,
  },
  {
    id: "fm3",
    fullName: "Jake Martinez",
    relationship: "Son",
    age: 14,
    gender: "Male",
    bloodGroup: "B+",
    phone: "",
    email: "",
    emergencyContact: "Sarah Martinez · +1 (555) 912-3456",
    conditions: ["Asthma"],
    allergies: ["Peanuts", "Dust mites"],
    medications: ["Albuterol inhaler (as needed)"],
    healthNotes: "Asthma well-managed. No recent episodes.",
    wellbeingNotes: "Very active with sports. Energy levels high.",
    metrics: [
      { id: "m7", date: "Jun 22, 2026", heartRate: 82, weight: 125, oxygenSaturation: 99, temperature: 98.5 },
    ],
    wellbeingStatus: "Good",
    lastUpdated: "3 days ago",
    reportsCount: 2,
  },
];

// ── Medical Reports module ────────────────────────────────────────────────────

export const REPORT_CATEGORIES = [
  "Blood Test",
  "Diabetes",
  "Blood Pressure",
  "Heart Health",
  "ECG",
  "X-Ray",
  "MRI",
  "CT Scan",
  "Prescription",
  "Vaccination",
  "Discharge Summary",
  "Allergy Report",
  "Specialist Consultation",
  "Other",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportOwnerType = "PATIENT" | "FAMILY_MEMBER";

export interface MedicalReport {
  id: string;
  ownerType: ReportOwnerType;
  ownerId?: string;
  reportName: string;
  reportCategory: ReportCategory;
  reportDate: string;
  healthcareFacility: string;
  notes: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedDate: string;
  createdBy: string;
}

export const initialReports: MedicalReport[] = [
  // ── Primary patient reports ────────────────────────────────────────────────
  {
    id: "r1", ownerType: "PATIENT",
    reportName: "Complete Blood Count",
    reportCategory: "Blood Test", reportDate: "Jun 20, 2026",
    healthcareFacility: "Quest Diagnostics",
    notes: "Routine annual blood panel. WBC, RBC, platelets all within normal range.",
    fileName: "cbc_jun2026.pdf", fileType: "application/pdf",
    fileSize: 1241600, fileUrl: "", uploadedDate: "Jun 20, 2026", createdBy: "Sarah Martinez",
  },
  {
    id: "r2", ownerType: "PATIENT",
    reportName: "HbA1c Diabetes Panel",
    reportCategory: "Diabetes", reportDate: "Jun 15, 2026",
    healthcareFacility: "LabCorp",
    notes: "HbA1c: 7.8%. Slightly elevated — monitoring and dietary changes recommended.",
    fileName: "hba1c_jun2026.pdf", fileType: "application/pdf",
    fileSize: 982400, fileUrl: "", uploadedDate: "Jun 16, 2026", createdBy: "Sarah Martinez",
  },
  {
    id: "r3", ownerType: "PATIENT",
    reportName: "Chest X-Ray",
    reportCategory: "X-Ray", reportDate: "May 28, 2026",
    healthcareFacility: "Memorial Hospital",
    notes: "Routine screening. Lungs clear. No abnormalities detected.",
    fileName: "chest_xray_may2026.jpg", fileType: "image/jpeg",
    fileSize: 2457600, fileUrl: "", uploadedDate: "May 29, 2026", createdBy: "Sarah Martinez",
  },
  {
    id: "r4", ownerType: "PATIENT",
    reportName: "12-Lead ECG",
    reportCategory: "ECG", reportDate: "May 10, 2026",
    healthcareFacility: "Cardiology Associates",
    notes: "Normal sinus rhythm. PR interval 160ms. No ischemic changes.",
    fileName: "ecg_may2026.pdf", fileType: "application/pdf",
    fileSize: 748800, fileUrl: "", uploadedDate: "May 10, 2026", createdBy: "Sarah Martinez",
  },
  {
    id: "r5", ownerType: "PATIENT",
    reportName: "Metformin Prescription",
    reportCategory: "Prescription", reportDate: "Jun 01, 2026",
    healthcareFacility: "Primary Care Clinic",
    notes: "Metformin 500mg twice daily. 90-day supply. Refill before Aug 30.",
    fileName: "prescription_jun2026.pdf", fileType: "application/pdf",
    fileSize: 512000, fileUrl: "", uploadedDate: "Jun 01, 2026", createdBy: "Sarah Martinez",
  },
  // ── Family member reports ──────────────────────────────────────────────────
  {
    id: "r6", ownerType: "FAMILY_MEMBER", ownerId: "fm1",
    reportName: "24-Hour Ambulatory BP",
    reportCategory: "Blood Pressure", reportDate: "Jun 18, 2026",
    healthcareFacility: "Walgreens Health",
    notes: "Average daytime BP: 142/88 mmHg. Nighttime dip normal. Review medication.",
    fileName: "bp_monitor_jun2026.pdf", fileType: "application/pdf",
    fileSize: 1024000, fileUrl: "", uploadedDate: "Jun 18, 2026", createdBy: "Sarah Martinez",
  },
  {
    id: "r7", ownerType: "FAMILY_MEMBER", ownerId: "fm1",
    reportName: "Arthritis X-Ray – Left Knee",
    reportCategory: "X-Ray", reportDate: "Jun 05, 2026",
    healthcareFacility: "Orthopedic Center",
    notes: "Grade 2 osteoarthritis left knee. Joint space narrowing noted. Follow-up in 6 months.",
    fileName: "knee_xray_jun2026.png", fileType: "image/png",
    fileSize: 3145728, fileUrl: "", uploadedDate: "Jun 06, 2026", createdBy: "Sarah Martinez",
  },
  {
    id: "r8", ownerType: "FAMILY_MEMBER", ownerId: "fm2",
    reportName: "Thyroid Panel (TSH/T4)",
    reportCategory: "Blood Test", reportDate: "Jun 22, 2026",
    healthcareFacility: "Quest Diagnostics",
    notes: "TSH: 3.2 mIU/L. Free T4: 0.9 ng/dL. Levothyroxine dose adjustment recommended.",
    fileName: "thyroid_panel_jun2026.pdf", fileType: "application/pdf",
    fileSize: 876544, fileUrl: "", uploadedDate: "Jun 22, 2026", createdBy: "Sarah Martinez",
  },
  {
    id: "r9", ownerType: "FAMILY_MEMBER", ownerId: "fm2",
    reportName: "Diabetes Annual Review",
    reportCategory: "Diabetes", reportDate: "Jun 10, 2026",
    healthcareFacility: "Endocrinology Clinic",
    notes: "HbA1c: 6.9%. Well-controlled with diet and Metformin. Continue current regimen.",
    fileName: "diabetes_annual_jun2026.pdf", fileType: "application/pdf",
    fileSize: 1126400, fileUrl: "", uploadedDate: "Jun 11, 2026", createdBy: "Sarah Martinez",
  },
  {
    id: "r10", ownerType: "FAMILY_MEMBER", ownerId: "fm3",
    reportName: "Allergy Panel – Peanut & Dust",
    reportCategory: "Allergy Report", reportDate: "Jun 14, 2026",
    healthcareFacility: "Allergy & Asthma Center",
    notes: "Severe peanut allergy confirmed (Class 4, IgE 85 kU/L). Dust mite sensitivity moderate.",
    fileName: "allergy_panel_jun2026.pdf", fileType: "application/pdf",
    fileSize: 921600, fileUrl: "", uploadedDate: "Jun 15, 2026", createdBy: "Sarah Martinez",
  },
  {
    id: "r11", ownerType: "FAMILY_MEMBER", ownerId: "fm3",
    reportName: "Pulmonary Function Test",
    reportCategory: "Specialist Consultation", reportDate: "Jun 08, 2026",
    healthcareFacility: "Pediatric Pulmonology",
    notes: "FEV1: 82% predicted. FEV1/FVC: 0.78. Well-controlled asthma — continue protocol.",
    fileName: "pfts_jun2026.pdf", fileType: "application/pdf",
    fileSize: 1048576, fileUrl: "", uploadedDate: "Jun 09, 2026", createdBy: "Sarah Martinez",
  },
];

// ── Per-member page data (global state payloads) ───────────────────────────────

export interface MemberDashboard {
  healthScore: number;
  activeAlerts: number;
  stepsToday: number;
  stepsGoal: number;
  glucoseLatest: number;
  glucoseUnit: string;
  glucoseTrend: string;
  dataSources: Array<{ name: string; status: string; icon: string; accent: string }>;
  alerts: Array<{ title: string; severity: string; icon: string }>;
  forecast: { peak: number; risk: number; trend: string };
}

export interface MemberTimelineEvent {
  time: string;
  source: string;
  title: string;
  detail?: string;
  severity?: string;
  category: string;
}

export interface MemberPageData {
  memberName: string;
  memberCondition: string;
  dashboard: MemberDashboard;
  metricTrends: { health: number[]; alerts: number[]; steps: number[]; glucose: number[] };
  glucoseForecast: Array<{ hour: string; actual: number | null; forecast: number; upper: number; lower: number }>;
  timelineData: Array<{ date: string; events: MemberTimelineEvent[] }>;
  weeklyTrend: Array<{ day: string; value: number }>;
  weeklyTrendLabel: string;
  weeklyTrendRefLine: number;
  alertsData: Array<{ id: string; severity: string; icon: string; title: string; description: string; meta: string[]; actions: string[] }>;
  alertHistory: Array<{ day: number; count: number }>;
  genieMessages: Array<{ role: "assistant" | "user"; content: string; actions?: string[] }>;
}

function generateForecast(baseMg: number) {
  return Array.from({ length: 24 }, (_, i) => {
    const base = baseMg + Math.sin(i / 3) * 18 + i * 1.6;
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 5;
    return {
      hour: `${i}:00`,
      actual: i < 10 ? Math.round(base + noise) : null,
      forecast: Math.round(base + noise + (i >= 10 ? (i - 10) * 2.5 : 0)),
      upper: Math.round(base + noise + (i >= 10 ? (i - 10) * 4 + 12 : 10)),
      lower: Math.round(base + noise - (i >= 10 ? 6 : 8)),
    };
  });
}

const primaryMemberPageData: MemberPageData = {
  memberName: patient.name,
  memberCondition: patient.condition,
  dashboard: dashboardData,
  metricTrends,
  glucoseForecast,
  timelineData,
  weeklyTrend: glucoseTrend,
  weeklyTrendLabel: "7-day Glucose Trend",
  weeklyTrendRefLine: 180,
  alertsData,
  alertHistory,
  genieMessages,
};

const carlosMemberPageData: MemberPageData = {
  memberName: "Carlos Martinez",
  memberCondition: "Hypertension · Arthritis",
  dashboard: {
    healthScore: 68,
    activeAlerts: 2,
    stepsToday: 4200,
    stepsGoal: 7000,
    glucoseLatest: 143,
    glucoseUnit: "mmHg",
    glucoseTrend: "+4%",
    dataSources: [
      { name: "Omron BP Monitor", status: "Live", icon: "💓", accent: "rose" },
      { name: "Fitbit Inspire 3", status: "Live", icon: "⌚", accent: "teal" },
      { name: "Medication Tracker", status: "Active", icon: "💊", accent: "violet" },
      { name: "Symptom Logger", status: "Live", icon: "📝", accent: "amber" },
    ],
    alerts: [
      { title: "BP >140/90 for 4 mornings", severity: "High", icon: "💓" },
      { title: "Arthritis flare — reduced mobility", severity: "Medium", icon: "🦴" },
    ],
    forecast: { peak: 152, risk: 52, trend: "elevated" },
  },
  metricTrends: {
    health: [64, 66, 63, 65, 67, 65, 66, 68, 67, 69, 68, 70, 68, 68],
    alerts: [1, 2, 1, 2, 2, 3, 2, 1, 2, 3, 2, 3, 2, 2],
    steps: [3900, 4800, 5100, 3600, 5500, 4400, 4000, 5200, 4600, 5700, 3900, 4300, 4900, 4200],
    glucose: [138, 141, 139, 144, 142, 145, 142, 148, 146, 143, 145, 142, 144, 142],
  },
  glucoseForecast: generateForecast(140),
  timelineData: [
    {
      date: "Today",
      events: [
        { time: "07:30 AM", source: "Omron BP Monitor", title: "Morning BP: 145/92 mmHg", severity: "Alert", category: "Glucose" },
        { time: "07:00 AM", source: "Fitbit Inspire 3", title: "Sleep: 6h 10m", detail: "Light sleep 62% · Restless 3×", category: "Wearable" },
        { time: "08:15 AM", source: "Medication Tracker", title: "Lisinopril 10mg taken", detail: "On schedule", category: "Tests" },
      ],
    },
    {
      date: "Yesterday",
      events: [
        { time: "08:00 PM", source: "Symptom Logger", title: "Left knee pain: 5/10", detail: "After evening walk — arthritis flare", category: "Symptoms" },
        { time: "07:15 AM", source: "Omron BP Monitor", title: "Morning BP: 142/88 mmHg", category: "Glucose" },
        { time: "06:30 AM", source: "Fitbit Inspire 3", title: "Steps: 4,800", detail: "Active min: 28", category: "Wearable" },
      ],
    },
    {
      date: "Jun 23",
      events: [
        { time: "09:00 AM", source: "Omron BP Monitor", title: "BP check: 148/94 mmHg", severity: "Alert", category: "Glucose" },
        { time: "03:00 PM", source: "Medication Tracker", title: "Aspirin 81mg taken", detail: "Post-lunch", category: "Tests" },
      ],
    },
  ],
  weeklyTrend: [
    { day: "Mon", value: 138 }, { day: "Tue", value: 141 }, { day: "Wed", value: 139 },
    { day: "Thu", value: 144 }, { day: "Fri", value: 142 }, { day: "Sat", value: 145 }, { day: "Sun", value: 143 },
  ],
  weeklyTrendLabel: "7-day BP Trend (Systolic mmHg)",
  weeklyTrendRefLine: 130,
  alertsData: [
    {
      id: "ca1", severity: "High", icon: "💓",
      title: "Persistent Elevated Blood Pressure",
      description: "Morning BP averaging 143/91 mmHg over 4 days. Exceeds target of <130/80.",
      meta: ["Omron Monitor", "4 days", "Confidence 91%"],
      actions: ["Contact Doctor", "Acknowledge"],
    },
    {
      id: "ca2", severity: "Medium", icon: "🦴",
      title: "Arthritis Mobility Alert",
      description: "Reported knee pain 5/10 for 2 consecutive evenings. Activity dropped 22% vs baseline.",
      meta: ["Symptom Logger", "2 days", "Confidence 79%"],
      actions: ["View Data", "Acknowledge"],
    },
  ],
  alertHistory: Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    count: Math.max(0, Math.round(Math.sin(i / 4) * 1.5 + (i > 20 ? 2 : 0.5) + Math.random())),
  })),
  genieMessages: [
    {
      role: "assistant",
      content: "👋 Hi Sarah! I'm reviewing Carlos's data. His morning BP has been consistently elevated (avg 143/91 mmHg) over 4 days — above his <130/80 target. Would you like a summary or notes for his physician?",
    },
    { role: "user", content: "What might be causing Dad's BP to spike in the mornings?" },
    {
      role: "assistant",
      content: "Based on Carlos's last 7 days:\n\n1. Sleep quality: Averaging 6h 10m with frequent restlessness (↓ quality)\n2. Morning cortisol surge — common BP driver in seniors\n3. Sodium intake: Symptom notes suggest takeout 3× this week\n4. Medication timing: Lisinopril taken after the morning spike window\n\nRecommendation: Shift Lisinopril to bedtime (discuss with physician) and monitor sodium closely.",
      actions: ["Schedule appointment", "Log meal"],
    },
  ],
};

const mariaMemberPageData: MemberPageData = {
  memberName: "Maria Martinez",
  memberCondition: "Type 2 Diabetes · Hypothyroidism",
  dashboard: {
    healthScore: 79,
    activeAlerts: 1,
    stepsToday: 6800,
    stepsGoal: 8000,
    glucoseLatest: 118,
    glucoseUnit: "mg/dL",
    glucoseTrend: "-8%",
    dataSources: [
      { name: "OneTouch Glucometer", status: "Live", icon: "🩸", accent: "amber" },
      { name: "Garmin Vívosmart 5", status: "Live", icon: "⌚", accent: "teal" },
      { name: "Thyroid Tracker", status: "Active", icon: "🔬", accent: "violet" },
      { name: "Symptom Logger", status: "Live", icon: "📝", accent: "sky" },
    ],
    alerts: [
      { title: "Thyroid med: dose review needed", severity: "Medium", icon: "🔬" },
    ],
    forecast: { peak: 142, risk: 34, trend: "stable" },
  },
  metricTrends: {
    health: [74, 76, 75, 77, 78, 77, 78, 79, 78, 80, 79, 81, 80, 79],
    alerts: [1, 0, 1, 1, 0, 2, 1, 0, 1, 1, 0, 1, 1, 1],
    steps: [5900, 7200, 7800, 5500, 8400, 6600, 6200, 7800, 6800, 8600, 5900, 6500, 7500, 6800],
    glucose: [124, 119, 122, 118, 121, 116, 119, 115, 118, 114, 117, 113, 116, 118],
  },
  glucoseForecast: generateForecast(116),
  timelineData: [
    {
      date: "Today",
      events: [
        { time: "07:45 AM", source: "OneTouch Glucometer", title: "Fasting Glucose: 118 mg/dL", detail: "In range · Target <126", category: "Glucose" },
        { time: "07:00 AM", source: "Garmin Vívosmart 5", title: "Sleep: 7h 04m", detail: "Deep: 1h 12m · Morning steps: 2,200", category: "Wearable" },
        { time: "08:30 AM", source: "Medication Tracker", title: "Metformin 500mg taken", detail: "With breakfast — on schedule", category: "Tests" },
      ],
    },
    {
      date: "Yesterday",
      events: [
        { time: "07:30 AM", source: "OneTouch Glucometer", title: "Fasting Glucose: 116 mg/dL", detail: "Well-controlled", category: "Glucose" },
        { time: "06:00 PM", source: "Garmin Vívosmart 5", title: "Evening walk: 3,200 steps", detail: "30 min · Avg HR: 108 bpm", category: "Wearable" },
        { time: "09:15 AM", source: "Medication Tracker", title: "Levothyroxine 50mcg taken", category: "Tests" },
      ],
    },
    {
      date: "Jun 22",
      events: [
        { time: "10:00 AM", source: "Quest Diagnostics", title: "Thyroid Panel — TSH: 3.2", detail: "Slight elevation — dose review scheduled", severity: "Alert", category: "Tests" },
        { time: "07:30 AM", source: "OneTouch Glucometer", title: "Fasting Glucose: 121 mg/dL", category: "Glucose" },
      ],
    },
  ],
  weeklyTrend: [
    { day: "Mon", value: 124 }, { day: "Tue", value: 119 }, { day: "Wed", value: 122 },
    { day: "Thu", value: 118 }, { day: "Fri", value: 121 }, { day: "Sat", value: 116 }, { day: "Sun", value: 118 },
  ],
  weeklyTrendLabel: "7-day Glucose Trend",
  weeklyTrendRefLine: 126,
  alertsData: [
    {
      id: "ma1", severity: "Medium", icon: "🔬",
      title: "Thyroid Medication Review Due",
      description: "TSH at 3.2 mIU/L (borderline elevated). Endocrinologist recommends Levothyroxine dose adjustment.",
      meta: ["Quest Diagnostics", "1 day", "Confidence 87%"],
      actions: ["Book Appointment", "Acknowledge"],
    },
  ],
  alertHistory: Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    count: Math.max(0, Math.round(Math.sin(i / 5) * 1 + 0.3 + Math.random() * 0.5)),
  })),
  genieMessages: [
    {
      role: "assistant",
      content: "👋 Hi Sarah! Maria's glucose is well-controlled this week — averaging 118 mg/dL, down 8% from last week. Great progress! However, her thyroid panel shows TSH at 3.2 — slightly above target. Would you like me to explain what this means?",
    },
    { role: "user", content: "Is Mom's diabetes under control?" },
    {
      role: "assistant",
      content: "Yes — Maria's diabetes management looks excellent right now:\n\n✅ Fasting glucose avg: 119 mg/dL (target <126)\n✅ No readings >140 in the past 7 days\n✅ Daily 30-min walks contributing to control\n\nThe main watch item is thyroid function — TSH elevation can increase insulin resistance over time. Monitoring both together is the right approach.",
      actions: ["View glucose history", "Set appointment reminder"],
    },
  ],
};

const jakeMemberPageData: MemberPageData = {
  memberName: "Jake Martinez",
  memberCondition: "Asthma · Peanut Allergy",
  dashboard: {
    healthScore: 91,
    activeAlerts: 1,
    stepsToday: 12400,
    stepsGoal: 12000,
    glucoseLatest: 94,
    glucoseUnit: "mg/dL",
    glucoseTrend: "stable",
    dataSources: [
      { name: "Garmin Forerunner 255", status: "Live", icon: "⌚", accent: "teal" },
      { name: "Smart Inhaler (Propeller)", status: "Live", icon: "💨", accent: "sky" },
      { name: "Allergy Alert App", status: "Active", icon: "🌿", accent: "lime" },
      { name: "Symptom Logger", status: "Live", icon: "📝", accent: "violet" },
    ],
    alerts: [
      { title: "High pollen — asthma risk today", severity: "Medium", icon: "🌿" },
    ],
    forecast: { peak: 102, risk: 14, trend: "stable" },
  },
  metricTrends: {
    health: [88, 90, 89, 91, 90, 92, 91, 93, 92, 94, 91, 93, 92, 91],
    alerts: [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1],
    steps: [9800, 14200, 13600, 8900, 15400, 12600, 11200, 14800, 12200, 15800, 10400, 13200, 14600, 12400],
    glucose: [91, 93, 90, 94, 92, 96, 93, 95, 91, 94, 92, 96, 93, 94],
  },
  glucoseForecast: generateForecast(92),
  timelineData: [
    {
      date: "Today",
      events: [
        { time: "03:45 PM", source: "Garmin Forerunner 255", title: "Soccer practice: 8,400 steps", detail: "Peak HR: 178 bpm · Duration: 62 min", category: "Wearable" },
        { time: "03:30 PM", source: "Smart Inhaler", title: "Reliever used pre-exercise", detail: "Pollen count high today (76 µg/m³)", category: "Symptoms" },
        { time: "07:15 AM", source: "Garmin Forerunner 255", title: "Sleep: 8h 22m", detail: "Deep: 2h 04m · Resting HR: 58 bpm", category: "Wearable" },
      ],
    },
    {
      date: "Yesterday",
      events: [
        { time: "05:00 PM", source: "Allergy Alert App", title: "Tree pollen: Very High (92 µg/m³)", detail: "Advised to limit outdoor activity", severity: "Alert", category: "Symptoms" },
        { time: "04:30 PM", source: "Smart Inhaler", title: "Reliever inhaler used", detail: "Post-recess · mild wheeze", category: "Symptoms" },
        { time: "07:30 AM", source: "Garmin Forerunner 255", title: "Morning run: 3.2 miles", detail: "Avg pace 8:42/mi", category: "Wearable" },
      ],
    },
    {
      date: "Jun 23",
      events: [
        { time: "02:00 PM", source: "Garmin Forerunner 255", title: "Steps: 15,800 — Basketball game", detail: "90 min · Avg HR: 162 bpm", category: "Wearable" },
        { time: "09:00 AM", source: "Symptom Logger", title: "No symptoms today", detail: "Green day 🟢", category: "Symptoms" },
      ],
    },
  ],
  weeklyTrend: [
    { day: "Mon", value: 91 }, { day: "Tue", value: 93 }, { day: "Wed", value: 90 },
    { day: "Thu", value: 94 }, { day: "Fri", value: 92 }, { day: "Sat", value: 96 }, { day: "Sun", value: 94 },
  ],
  weeklyTrendLabel: "7-day Glucose (mg/dL)",
  weeklyTrendRefLine: 100,
  alertsData: [
    {
      id: "ja1", severity: "Medium", icon: "🌿",
      title: "High Pollen — Asthma Risk Elevated",
      description: "Tree pollen count reached 92 µg/m³ today. Reliever inhaler used twice this week during pollen peaks.",
      meta: ["Allergy Alert + Smart Inhaler", "2 days", "Confidence 83%"],
      actions: ["Limit Outdoor Activity", "Acknowledge"],
    },
  ],
  alertHistory: Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    count: Math.max(0, Math.round(Math.sin(i / 6) * 0.8 + (i > 15 ? 1 : 0) + Math.random() * 0.4)),
  })),
  genieMessages: [
    {
      role: "assistant",
      content: "👋 Hi Sarah! Jake's having a great health week — score 91, exceeding his step goal, and sleeping 8+ hours. One watch item: pollen is very high today (92 µg/m³) and he used his reliever inhaler pre-exercise. Want me to track his inhaler usage pattern?",
    },
    { role: "user", content: "Is Jake's asthma well controlled?" },
    {
      role: "assistant",
      content: "Jake's asthma is generally well-controlled with some pollen-season sensitivity:\n\n✅ FEV1: 82% predicted (good range for mild asthma)\n✅ No nighttime symptoms logged this week\n⚠️ Reliever used 2× this week — both on high-pollen days\n\nRecommendation: Pre-dose with albuterol before outdoor exercise when pollen >50 µg/m³. Consider allergist review before fall season.",
      actions: ["Set pollen alert", "Log inhaler use"],
    },
  ],
};

const memberDataMap: Record<string, MemberPageData> = {
  fm1: carlosMemberPageData,
  fm2: mariaMemberPageData,
  fm3: jakeMemberPageData,
};

/** Returns the full page-data payload for the given family member (null = primary patient). */
export function getMemberPageData(member: FamilyMember | null): MemberPageData {
  if (!member) return primaryMemberPageData;
  return memberDataMap[member.id] ?? primaryMemberPageData;
}
