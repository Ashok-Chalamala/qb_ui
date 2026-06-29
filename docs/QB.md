QUEST BEYOND — Lovable Prompt Document
Project Overview
Project Name: Quest Beyond — The Non-Clinical Data Aggregator

Tagline: Making the Invisible Visible — What Happens Between Visits

Core Value Proposition: Epic knows the clinic. We know everything else. Quest Beyond captures, unifies, and activates the health data that lives outside clinical walls—wearables, home tests, symptoms, SDOH, and family observations.

Design System
Color Palette
:root {
  /* Primary */
  --bg: #060D18;
  --surface: #0B1525;
  --surface2: #0F1C30;
  --surface3: #142236;
  
  /* Borders */
  --border: rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.1);
  
  /* Accent Colors */
  --teal: #00E5C9;
  --teal2: rgba(0,229,201,0.12);
  --amber: #FFB347;
  --amber2: rgba(255,179,71,0.12);
  --violet: #A78BFA;
  --violet2: rgba(167,139,250,0.12);
  --rose: #FF6B8A;
  --rose2: rgba(255,107,138,0.12);
  --sky: #38BDF8;
  --sky2: rgba(56,189,248,0.12);
  --lime: #86EFAC;
  --lime2: rgba(134,239,172,0.12);
  
  /* Text */
  --white: #EEF2FF;
  --grey: #7B8CAA;
  --grey2: #3D4F6A;
}

Typography
Use Case	Font	Weight	Size
Headings	Space Grotesk	600-700	15-24px
Body	Inter	400-500	12-14px
Data/Mono	JetBrains Mono	400-500	9-12px


Spacing Scale
Small: 6px, 8px

Medium: 12px, 14px, 16px

Large: 20px, 24px, 28px


Screen Inventory (7 Screens)
1. Dashboard (Home)
Purpose: Single-pane view of patient's health status, data sources, alerts, and predictions.

Components:

4 Stat Cards (Health Score, Active Alerts, Steps, Glucose)

"Patient-Generated Data Sources" card showing 5 data streams

Active Alerts list (3 alerts)

Forecast card with glucose prediction chart

Mock dataconst dashboardData = {
  healthScore: 82,
  activeAlerts: 3,
  stepsToday: 7421,
  stepsGoal: 10000,
  glucoseLatest: 142,
  glucoseUnit: "mg/dL",
  glucoseTrend: "+12%",
  dataSources: [
    { name: "Apple Watch Series 9", status: "Live", icon: "⌚" },
    { name: "Dexcom G7 CGM", status: "Live", icon: "🩸" },
    { name: "Home Test Kit", status: "New", icon: "🧪" },
    { name: "Symptom Logger", status: "Live", icon: "📝" },
    { name: "SDOH Survey", status: "Flagged", icon: "🏠" }
  ],
  alerts: [
    { title: "Glucose >200 for 3 days", severity: "Critical", icon: "🚨" },
    { title: "Sleep <5h for 4 nights", severity: "High", icon: "😴" },
    { title: "SDOH: Transport barrier", severity: "Medium", icon: "🚗" }
  ],
  forecast: {
    peak: 185,
    risk: 68,
    trend: "rising"
  }
};

2. Timeline
Purpose: Chronological view of ALL patient-generated data with filtering.

Components:

Filter chips (All, Glucose, Wearable, Symptoms, Tests, SDOH)

Date sections with timeline items

Side panel: 7-day glucose trend chart

Side panel: Data coverage metrics

Mock Data:

const timelineData = [
  {
    date: "Today",
    events: [
      { time: "08:14 AM", source: "Dexcom G7 CGM", title: "Fasting Glucose: 234 mg/dL", severity: "Alert" },
      { time: "07:30 AM", source: "Apple Watch", title: "Sleep: 4h 22m", detail: "Deep: 42min · REM: 58min" }
    ]
  },
  {
    date: "Yesterday",
    events: [
      { time: "09:00 PM", source: "Symptom Logger", title: "Fatigue 7/10 · Headache 4/10", detail: "Caregiver note included" },
      { time: "02:15 PM", source: "Quest Home Test", title: "A1C: 7.8%", detail: "Captured via API" }
    ]
  }
];

3. Devices
Purpose: Manage connected devices and data sources.

Components:

"Add Device" button

Device list with status, last sync time

Sync and Remove buttons per device

API reference footer



Mock Data:
const devicesData = [
  { id: "d1", name: "Apple Watch Series 9", icon: "⌚", status: "Connected", lastSync: "2 min ago", dataTypes: "Steps, HR, Sleep, SpO2" },
  { id: "d2", name: "Dexcom G7 CGM", icon: "🩸", status: "Connected", lastSync: "1 hour ago", dataTypes: "Continuous glucose" },
  { id: "d3", name: "OneTouch Glucose Meter", icon: "🧪", status: "Needs Reconnect", lastSync: "3 days ago", dataTypes: "Manual glucose" },
  { id: "d4", name: "Symptom Logger", icon: "📝", status: "Active", lastSync: "Today", dataTypes: "Symptom logs" },
  { id: "d5", name: "SDOH Survey", icon: "🏠", status: "Active", lastSync: "Jun 10", dataTypes: "Social determinants" }
];

4. Alerts Center
Purpose: Active alerts with severity filtering and acknowledgment.

Components:

Severity filter chips (Critical, High, All)

Alert cards with details and action buttons

Alert summary sidebar (counts, history chart)

Mock Data:
const alertsData = [
  {
    id: "alt1",
    severity: "Critical",
    icon: "🚨",
    title: "Glucose Crisis Pattern Detected",
    description: "Fasting glucose >200 mg/dL for 3 consecutive days. Combined with fatigue and poor sleep.",
    actions: ["Call", "Acknowledge"]
  },
  {
    id: "alt2",
    severity: "High",
    icon: "😴",
    title: "Sleep Deprivation + Fatigue Correlation",
    description: "Sleep averaging 4.5h/night this week. Fatigue rated 6-8/10 on 4 of 7 days.",
    actions: ["View Data", "Acknowledge"]
  },
  {
    id: "alt3",
    severity: "Medium",
    icon: "🚗",
    title: "SDOH: Transport Barrier",
    description: "Patient reported transport difficulty. Next appointment Jun 17 — 5 days away.",
    actions: ["Arrange Lyft", "Dismiss"]
  }
];

5. Genie AI
Purpose: Voice + text AI assistant for patient engagement.

Components:

Chat interface with message bubbles

Voice input button (with recording animation)

Text input with send button

AI-generated responses with action buttons

API status footer

Mock Data (Chat):
const genieMessages = [
  {
    role: "assistant",
    content: "👋 Hi Sarah! I'm Genie. I see your glucose has been elevated for 3 days and your sleep is below 5 hours. Would you like me to explain what this pattern means?"
  },
  {
    role: "user",
    content: "Why is my glucose so high this week?"
  },
  {
    role: "assistant",
    content: "Let me analyze your last 7 days of data...\n\nKey findings:\n1. Sleep avg: 4.5h (↓ 18% from baseline)\n2. Evening carbs: 65g avg (↑ 25%)\n3. Stress flagged in SDOH survey\n\nCombined, these factors explain 84% of your glucose variability.",
    actions: ["Schedule with Dr. Patel", "Log Meal"]
  }
];

6. Provider Command
Purpose: Epic-integrated provider view with FHIR export.

Components:

Patient header (name, age, MRN, risk score)

Clinical metrics table (last 7 days)

FHIR export section with sync status

Push to Epic button

Mock Data:
const providerData = {
  patient: {
    name: "Sarah Martinez",
    age: 45,
    gender: "F",
    condition: "Type 2 Diabetes",
    mrn: "00429",
    riskScore: "High"
  },
  metrics: [
    { metric: "Glucose", value: "142 mg/dL", trend: "↑", status: "High" },
    { metric: "Sleep", value: "4.5h avg", trend: "↓", status: "Low" },
    { metric: "Steps", value: "7,421 avg", trend: "↑", status: "Good" },
    { metric: "Fatigue", value: "Moderate", trend: "↑", status: "Monitor" },
    { metric: "Weight", value: "182 lbs", trend: "↓", status: "Good" }
  ],
  fhir: {
    records: 28,
    lastSync: "2 min ago",
    resources: [
      { type: "Observation", count: 14, status: "Synced" },
      { type: "DiagnosticReport", count: 2, status: "Synced" },
      { type: "SocialHistory", count: 2, status: "Synced" }
    ]
  }
};

7. Settings
Purpose: Manage notifications, thresholds, privacy, and integrations.

Components:

Notification toggles (Push, Email, SMS)

Threshold settings (Glucose, Sleep, HR)

Privacy & Security toggles

Integration status cards

Mock Data:
const settingsData = {
  notifications: {
    push: true,
    email: true,
    sms: false,
    epicAlerts: true
  },
  thresholds: {
    glucoseHigh: 200,
    sleepLow: 5.5,
    hrHigh: 100
  },
  privacy: {
    hipaaAudit: true,
    encryption: true,
    gdprExport: true,
    autoPurge: false
  },
  integrations: {
    epic: { status: "Connected", active: true },
    appleHealth: { status: "Authorized", active: true },
    dexcom: { status: "Connected", active: true }
  }
};

Navigation Structure
Sidebar Navigation (7 Items)

┌─────────────────┐
│  ⬡  Dashboard   │  ← Default active
│  ◈  Timeline    │
│  ◎  Devices     │
│  ◉  Alerts      │  ← Badge: 3
│  🧞  Genie AI   │
│  ⚕  Provider   │
│  ◌  Settings    │
└─────────────────┘

Behavior:

Hover expands sidebar width from 68px to 200px

Active state has accent color (teal) and background

Alerts has a badge with count

Topbar Components
┌─────────────────────────────────────────────────────────────────────┐
│  Dashboard          Sarah Martinez · 45 · T2D · MRN 00429   🔔 ▶ ⚕  09:41 AM │
│  Patient-generated data · What happens between visits                │
└─────────────────────────────────────────────────────────────────────┘


Components:

Screen title + subtitle

Patient pill (avatar, name, details)

Action buttons: Alerts (🔔), Demo Mode (▶), FHIR Export (⚕)

Live clock
Demo Script Mode
Purpose: Guided 5-minute walkthrough for hackathon judges.

Steps:

👋 Welcome — "Quest Beyond captures what Epic misses"

📊 Dashboard — "Sarah Martinez, Health Score 82, 3 alerts"

🩸 Alerts — "Glucose >200 for 3 days, Sleep <5h"

🧞 Genie AI — "84% of variability explained by sleep, carbs, stress"

⚕ Provider — "28 FHIR records, one click to Epic"

🚀 Vision — "Today: 5 sources, Tomorrow: millions"

UI:

Floating overlay at bottom-right

Progress dots (6 steps)

"Next" and "Close" buttons

API Reference (Mock Endpoints)
Display these in the UI for technical credibility:

const apiEndpoints = {
  ingestion: {
    ingest: "POST /ingest",
    batch: "POST /ingest/batch"
  },
  devices: {
    list: "GET /devices",
    add: "POST /devices",
    remove: "DELETE /devices/{id}",
    sync: "POST /sync/{id}"
  },
  timeline: {
    get: "GET /timeline/{patientId}",
    trends: "GET /trends/glucose/{patientId}"
  },
  alerts: {
    list: "GET /alerts",
    acknowledge: "POST /alerts/{id}/acknowledge"
  },
  genie: {
    chat: "POST /genie/chat",
    voice: "WS /genie/voice"
  },
  provider: {
    export: "GET /export/fhir/{patientId}",
    push: "POST /export/fhir/push"
  }
};

Lovable Prompt Template
Copy and paste this into Lovable:


Build a healthcare data dashboard application called "Quest Beyond" with the following requirements:

1. Technology Stack:
   - React with TypeScript
   - Tailwind CSS for styling
   - Dark theme with the following color palette: [paste colors from above]
   - Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (data)

2. Navigation:
   - Collapsible sidebar with 7 items: Dashboard, Timeline, Devices, Alerts, Genie AI, Provider, Settings
   - Sidebar expands on hover from 68px to 200px
   - Active state with accent color

3. Screens (7 total):
   a. Dashboard: Stat cards, data sources, alerts, forecast chart
   b. Timeline: Chronological events with filters
   c. Devices: Connected devices with sync/remove actions
   d. Alerts: Severity-filtered alerts with acknowledgment
   e. Genie AI: Chat interface with voice input
   f. Provider: Epic-integrated view with FHIR export
   g. Settings: Notifications, thresholds, privacy, integrations

4. Demo Script Mode:
   - Floating overlay with step-by-step walkthrough
   - 6 steps with progress dots
   - "Next" and "Close" buttons

5. Data:
   - Use mock data for patient "Sarah Martinez" (45, Type 2 Diabetes)
   - Include all data from the mock data sections above

6. Interactivity:
   - Click handlers for all buttons
   - Alert acknowledgment flow
   - Genie AI chat with simulated responses
   - Voice button with recording animation
   - FHIR export button with success message
   - Device sync and remove actions

7. Responsive:
   - Desktop-first design
   - Mobile-friendly with collapsed sidebar

8. Additional Requirements:
   - Live clock in topbar
   - API reference footers on relevant screens
   - Professional, space-age dark theme
   - Consistent spacing and typography

Start with the Dashboard screen and build outward.

Screen-by-Screen Lovable Prompts
Screen 1: Dashboard

Build the Dashboard screen for Quest Beyond:

1. Top section: 4 stat cards in a row:
   - Health Score: 82 (with ring visualization)
   - Active Alerts: 3 (with red color)
   - Steps Today: 7,421 (with progress bar)
   - Glucose: 142 mg/dL (with trend indicator)

2. "Patient-Generated Data Sources" card showing 5 sources:
   - Apple Watch (Live) | Dexcom G7 (Live) | Home Test Kit (New) | Symptom Logger (Live) | SDOH Survey (Flagged)

3. "Active Alerts" card with 3 alerts:
   - Glucose >200 for 3 days (Critical)
   - Sleep <5h for 4 nights (High)
   - SDOH Transport barrier (Medium)

4. "Forecast" card with:
   - Glucose prediction chart (Prophet-style)
   - Peak: 185 mg/dL
   - Risk: 68% hyperglycemia
   - "Ask Genie" button

Use the dark theme and mock data provided.

Screen 2: Timeline
Build the Timeline screen for Quest Beyond:

1. Filter chips: All, Glucose, Wearable, Symptoms, Tests, SDOH

2. Chronological events grouped by date:
   - Today: 2 events
   - Yesterday: 2 events

3. Side panel:
   - 7-day glucose trend chart
   - Data coverage metrics (Glucose: 7/7, Wearable: 7/7, Symptoms: 4/7, Tests: 2/7)

Use the dark theme and mock data provided.

Screen 3: Devices

Build the Devices screen for Quest Beyond:

1. "Add Device" button at top

2. Device list with:
   - Apple Watch Series 9 (Connected, 2 min ago)
   - Dexcom G7 CGM (Connected, 1 hour ago)
   - OneTouch Glucose Meter (Needs Reconnect, 3 days ago)
   - Symptom Logger (Active)
   - SDOH Survey (Active)

3. Each device has:
   - Icon, name, status, last sync, data types
   - Sync and Remove buttons

4. API reference footer

Use the dark theme and mock data provided.

Screen 4: Alerts Center
Build the Alerts Center screen for Quest Beyond:

1. Severity filter chips: Critical (1), High (2), All (3)

2. Alert cards with:
   - Severity color coding
   - Icon, title, description
   - Action buttons (Call, Acknowledge, View Data, Arrange Lyft, Dismiss)

3. Sidebar:
   - Alert summary (3 active)
   - Severity breakdown
   - Alert history chart (30 days)

Use the dark theme and mock data provided.

Screen 5: Genie AI
Build the Genie AI screen for Quest Beyond:

1. Chat interface with:
   - Header with Genie avatar and status
   - Message bubbles (assistant and user)
   - Input area with text field and send button

2. Voice input:
   - Microphone button with recording animation
   - Simulates voice recognition

3. AI responses with:
   - Pattern analysis
   - Recommendations
   - Action buttons (Schedule, Log Meal)

4. API status footer

Use the dark theme and mock data provided.

Screen 6: Provider Command
Build the Provider Command screen for Quest Beyond:

1. Patient header: Sarah Martinez, 45, T2D, MRN 00429, Risk Score: High

2. Clinical metrics table: Glucose, Sleep, Steps, Fatigue, Weight with status tags

3. FHIR Export section:
   - Sync status: 2 min ago, 28 records
   - Resource list: Observation (14), DiagnosticReport (2), SocialHistory (2)
   - "Push to Epic" and "Download Bundle" buttons

4. Action buttons: Call, Epic InBasket, Timeline, Open in Epic

Use the dark theme and mock data provided.


Screen 7: Settings
Build the Settings screen for Quest Beyond:

1. Two-column layout:

   Left column:
   - Notifications: Push (on), Email (on), SMS (off)
   - Thresholds: Glucose (200 mg/dL), Sleep (5.5h), HR (100 bpm)

   Right column:
   - Privacy & Security: HIPAA Audit (on), Encryption (on), GDPR Export (on)
   - Integrations: Epic (Connected), Apple Health (Authorized), Dexcom (Active)

2. Toggle switches with smooth animations
3. Status tags for integrations

Use the dark theme and mock data provided.

