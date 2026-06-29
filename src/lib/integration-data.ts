// ─────────────────────────────────────────────────────────────────────────────
// Integration Hub — Data Types, Mock Data & FHIR Samples
// HIPAA-compliant integration layer for healthcare SaaS
// ─────────────────────────────────────────────────────────────────────────────

// ── Core Types ────────────────────────────────────────────────────────────────

export type IntegrationStatus = "Connected" | "Disconnected" | "Error" | "Pending";
export type AuthType = "oauth2" | "api-key" | "mtls";
export type OAuth2Flow = "client_credentials" | "authorization_code";
export type SyncFrequency = "real-time" | "scheduled" | "event-based";
export type DataType = "reports" | "clinical-notes" | "wearables" | "lab-results" | "prescriptions";
export type ProviderType = "EPIC" | "Cerner" | "Custom API" | "Labcorp" | "Quest Diagnostics";
export type Environment = "sandbox" | "production";
export type TriggerType = "new-report" | "new-lab" | "new-prescription" | "daily-batch" | "on-demand";
export type FhirResource = "Patient" | "Observation" | "Encounter" | "MedicationRequest" | "DiagnosticReport" | "Condition";

export interface DataMapping {
  id: string;
  internalField: string;
  internalType: string;
  fhirResource: FhirResource;
  fhirPath: string;
  transform?: string;
  required: boolean;
}

export interface OAuth2Config {
  flow: OAuth2Flow;
  clientId: string;
  clientSecretHash: string; // Never store plaintext — store bcrypt/SHA-256 hash
  tokenUrl: string;
  authorizationUrl?: string;
  scopes: string[];
  accessToken?: string;     // Encrypted at rest (AES-256)
  tokenExpiresAt?: string;
  refreshToken?: string;    // Encrypted at rest
}

export interface ApiKeyConfig {
  keyId: string;
  keyHash: string;          // Hashed — never stored in plaintext
  headerName: string;
}

export interface MtlsConfig {
  publicKeyId: string;
  certificateId: string;
  certExpiry: string;
  certSubject: string;
}

export interface SyncSchedule {
  frequency: SyncFrequency;
  cronExpression?: string;   // e.g. "0 6 * * *" for daily at 6am
  triggers: TriggerType[];
}

export interface SyncHistory {
  id: string;
  timestamp: string;
  recordsSent: number;
  recordsReceived: number;
  duration: number;
  status: "success" | "partial" | "failed";
  errorMessage?: string;
}

export interface Integration {
  id: string;
  name: string;
  provider: ProviderType;
  environment: Environment;
  status: IntegrationStatus;
  lastSync: string | null;
  dataTypes: DataType[];
  authType: AuthType;
  baseUrl: string;
  apiVersion: string;
  webhookUrl?: string;
  syncSchedule: SyncSchedule;
  mappings: DataMapping[];
  syncHistory: SyncHistory[];
  oauth2Config?: OAuth2Config;
  apiKeyConfig?: ApiKeyConfig;
  mtlsConfig?: MtlsConfig;
  errorMessage?: string;
  totalSyncCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  ipWhitelist?: string[];
}

export interface ApiLog {
  id: string;
  integrationId: string;
  integrationName: string;
  timestamp: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  statusCode: number;
  duration: number;
  correlationId: string;
  requestSize?: number;
  responseSize?: number;
  retryAttempt?: number;
  error?: string;
  userId?: string;         // HIPAA audit: which user triggered the call
  patientId?: string;      // HIPAA audit: PHI access tracking
  subjectType?: "SELF" | "FAMILY";  // context type when the log was created
  subjectId?: string;               // patient-00429 | fm1 | fm2 | fm3
  subjectName?: string;             // human-readable subject
  subjectRelationship?: string;     // null for self, "Son" / "Spouse" etc. for family
}

// ── Mock Integrations ─────────────────────────────────────────────────────────

export const mockIntegrations: Integration[] = [
  {
    id: "int-001",
    name: "Epic EHR – Main Hospital",
    provider: "EPIC",
    environment: "production",
    status: "Connected",
    lastSync: "2026-06-29T08:32:00Z",
    dataTypes: ["reports", "clinical-notes", "lab-results"],
    authType: "oauth2",
    baseUrl: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    apiVersion: "R4",
    webhookUrl: "https://app.questbeyond.com/webhooks/epic",
    syncSchedule: {
      frequency: "real-time",
      triggers: ["new-report", "new-lab"],
    },
    mappings: [
      { id: "m-001", internalField: "patientId", internalType: "string", fhirResource: "Patient", fhirPath: "Patient.id", required: true },
      { id: "m-002", internalField: "glucoseReading", internalType: "number", fhirResource: "Observation", fhirPath: "Observation.valueQuantity.value", transform: "mg/dL → mmol/L", required: true },
      { id: "m-003", internalField: "encounterDate", internalType: "date", fhirResource: "Encounter", fhirPath: "Encounter.period.start", required: true },
      { id: "m-004", internalField: "labResult", internalType: "object", fhirResource: "DiagnosticReport", fhirPath: "DiagnosticReport.result[0].reference", required: false },
    ],
    oauth2Config: {
      flow: "client_credentials",
      clientId: "qb-epic-prod-client",
      clientSecretHash: "$2b$12$redacted",
      tokenUrl: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
      authorizationUrl: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize",
      scopes: ["patient/Patient.read", "patient/Observation.read", "patient/MedicationRequest.read", "launch/patient"],
      tokenExpiresAt: "2026-06-29T09:32:00Z",
    },
    syncHistory: [
      { id: "sh-001", timestamp: "2026-06-29T08:32:00Z", recordsSent: 12, recordsReceived: 45, duration: 1240, status: "success" },
      { id: "sh-002", timestamp: "2026-06-29T07:00:00Z", recordsSent: 8, recordsReceived: 32, duration: 987, status: "success" },
      { id: "sh-003", timestamp: "2026-06-28T20:00:00Z", recordsSent: 3, recordsReceived: 18, duration: 632, status: "partial", errorMessage: "1 record skipped: missing required field" },
    ],
    totalSyncCount: 1284,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-06-29T08:32:00Z",
    createdBy: "admin@questbeyond.com",
    ipWhitelist: ["52.14.22.1", "52.14.22.2"],
  },
  {
    id: "int-002",
    name: "Cerner Millennium – Sandbox",
    provider: "Cerner",
    environment: "sandbox",
    status: "Error",
    lastSync: "2026-06-28T14:10:00Z",
    dataTypes: ["reports", "prescriptions"],
    authType: "oauth2",
    baseUrl: "https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    apiVersion: "R4",
    syncSchedule: {
      frequency: "scheduled",
      cronExpression: "0 */6 * * *",
      triggers: ["daily-batch"],
    },
    mappings: [
      { id: "m-005", internalField: "patientId", internalType: "string", fhirResource: "Patient", fhirPath: "Patient.id", required: true },
      { id: "m-006", internalField: "prescription", internalType: "object", fhirResource: "MedicationRequest", fhirPath: "MedicationRequest.medicationCodeableConcept", required: true },
    ],
    oauth2Config: {
      flow: "authorization_code",
      clientId: "qb-cerner-sandbox",
      clientSecretHash: "$2b$12$redacted",
      tokenUrl: "https://authorization.cerner.com/tenants/ec2458f2/protocols/oauth2/profiles/smart-v1/token",
      authorizationUrl: "https://authorization.cerner.com/tenants/ec2458f2/protocols/oauth2/profiles/smart-v1/personas/patient/authorize",
      scopes: ["patient/Patient.read", "patient/MedicationRequest.read"],
    },
    syncHistory: [
      { id: "sh-004", timestamp: "2026-06-28T14:10:00Z", recordsSent: 0, recordsReceived: 0, duration: 95, status: "failed", errorMessage: "Token refresh failed: 401 Unauthorized" },
      { id: "sh-005", timestamp: "2026-06-28T08:00:00Z", recordsSent: 5, recordsReceived: 12, duration: 820, status: "success" },
    ],
    errorMessage: "Token refresh failed: 401 Unauthorized — client credentials may have expired.",
    totalSyncCount: 342,
    createdAt: "2026-03-10T09:00:00Z",
    updatedAt: "2026-06-28T14:10:00Z",
    createdBy: "admin@questbeyond.com",
  },
  {
    id: "int-003",
    name: "Labcorp Direct API",
    provider: "Labcorp",
    environment: "production",
    status: "Connected",
    lastSync: "2026-06-29T06:00:05Z",
    dataTypes: ["lab-results"],
    authType: "api-key",
    baseUrl: "https://api.labcorp.com/v2",
    apiVersion: "v2",
    syncSchedule: {
      frequency: "scheduled",
      cronExpression: "0 6 * * *",
      triggers: ["new-lab"],
    },
    mappings: [
      { id: "m-007", internalField: "labResult", internalType: "object", fhirResource: "DiagnosticReport", fhirPath: "DiagnosticReport.result", required: true },
      { id: "m-008", internalField: "hba1cValue", internalType: "number", fhirResource: "Observation", fhirPath: "Observation.valueQuantity", required: true },
    ],
    apiKeyConfig: {
      keyId: "lc-key-prod-001",
      keyHash: "sha256:redacted",
      headerName: "X-API-Key",
    },
    syncHistory: [
      { id: "sh-006", timestamp: "2026-06-29T06:00:05Z", recordsSent: 0, recordsReceived: 8, duration: 223, status: "success" },
      { id: "sh-007", timestamp: "2026-06-28T06:00:04Z", recordsSent: 0, recordsReceived: 5, duration: 198, status: "success" },
    ],
    totalSyncCount: 156,
    createdAt: "2026-04-20T14:00:00Z",
    updatedAt: "2026-06-29T06:00:05Z",
    createdBy: "admin@questbeyond.com",
  },
  {
    id: "int-004",
    name: "Wearable Data Gateway",
    provider: "Custom API",
    environment: "production",
    status: "Disconnected",
    lastSync: null,
    dataTypes: ["wearables"],
    authType: "mtls",
    baseUrl: "https://gateway.wearable.internal/api/v1",
    apiVersion: "v1",
    syncSchedule: {
      frequency: "real-time",
      triggers: ["new-report"],
    },
    mappings: [
      { id: "m-009", internalField: "heartRate", internalType: "number", fhirResource: "Observation", fhirPath: "Observation.component[0].valueQuantity", required: true },
      { id: "m-010", internalField: "steps", internalType: "number", fhirResource: "Observation", fhirPath: "Observation.component[1].valueQuantity", required: false },
      { id: "m-011", internalField: "sleepHours", internalType: "number", fhirResource: "Observation", fhirPath: "Observation.component[2].valueQuantity", required: false },
    ],
    mtlsConfig: {
      publicKeyId: "mtls-pub-wearable-001",
      certificateId: "cert-wearable-001",
      certExpiry: "2027-06-01T00:00:00Z",
      certSubject: "CN=qb-wearable-gateway, O=QuestBeyond, C=US",
    },
    syncHistory: [],
    totalSyncCount: 0,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    createdBy: "admin@questbeyond.com",
  },
];

// ── Mock API Logs ─────────────────────────────────────────────────────────────

export const mockApiLogs: ApiLog[] = [
  // ── Primary patient (SELF) logs ────────────────────────────────────────────
  { id: "log-001", integrationId: "int-001", integrationName: "Epic EHR – Main Hospital", timestamp: "2026-06-29T08:32:14Z", method: "POST", endpoint: "/Patient/$match", statusCode: 200, duration: 342, correlationId: "corr-a1b2c3", requestSize: 512, responseSize: 2048, patientId: "PAT-00429", userId: "system", subjectType: "SELF", subjectId: "patient-00429", subjectName: "Sarah Martinez" },
  { id: "log-002", integrationId: "int-001", integrationName: "Epic EHR – Main Hospital", timestamp: "2026-06-29T08:32:10Z", method: "GET", endpoint: "/Observation?patient=PAT-00429&code=2339-0", statusCode: 200, duration: 189, correlationId: "corr-a1b2c3", responseSize: 8192, patientId: "PAT-00429", userId: "system", subjectType: "SELF", subjectId: "patient-00429", subjectName: "Sarah Martinez" },
  { id: "log-003", integrationId: "int-002", integrationName: "Cerner Millennium", timestamp: "2026-06-28T14:10:12Z", method: "POST", endpoint: "/oauth2/token", statusCode: 401, duration: 95, correlationId: "corr-d4e5f6", error: "Invalid client credentials: token_error", userId: "system", subjectType: "SELF", subjectId: "patient-00429", subjectName: "Sarah Martinez" },
  { id: "log-004", integrationId: "int-001", integrationName: "Epic EHR – Main Hospital", timestamp: "2026-06-29T07:00:04Z", method: "POST", endpoint: "/Bundle", statusCode: 201, duration: 412, correlationId: "corr-g7h8i9", requestSize: 4096, responseSize: 256, patientId: "PAT-00429", userId: "system", subjectType: "SELF", subjectId: "patient-00429", subjectName: "Sarah Martinez" },
  { id: "log-005", integrationId: "int-003", integrationName: "Labcorp Direct API", timestamp: "2026-06-29T06:00:05Z", method: "GET", endpoint: "/results/recent?patientId=00429", statusCode: 200, duration: 223, correlationId: "corr-j1k2l3", responseSize: 3072, patientId: "PAT-00429", userId: "system", subjectType: "SELF", subjectId: "patient-00429", subjectName: "Sarah Martinez" },
  { id: "log-006", integrationId: "int-001", integrationName: "Epic EHR – Main Hospital", timestamp: "2026-06-29T06:00:01Z", method: "POST", endpoint: "/Observation", statusCode: 201, duration: 387, correlationId: "corr-m4n5o6", requestSize: 1024, responseSize: 512, patientId: "PAT-00429", userId: "system", subjectType: "SELF", subjectId: "patient-00429", subjectName: "Sarah Martinez" },
  { id: "log-007", integrationId: "int-002", integrationName: "Cerner Millennium", timestamp: "2026-06-28T14:09:58Z", method: "POST", endpoint: "/oauth2/token", statusCode: 401, duration: 88, correlationId: "corr-d4e5f6", error: "Invalid client credentials: token_error", retryAttempt: 2, userId: "system", subjectType: "SELF", subjectId: "patient-00429", subjectName: "Sarah Martinez" },
  { id: "log-008", integrationId: "int-001", integrationName: "Epic EHR – Main Hospital", timestamp: "2026-06-28T20:00:03Z", method: "GET", endpoint: "/Patient/PAT-00429", statusCode: 200, duration: 156, correlationId: "corr-p7q8r9", responseSize: 1024, patientId: "PAT-00429", userId: "system", subjectType: "SELF", subjectId: "patient-00429", subjectName: "Sarah Martinez" },
  // ── Family member — Jake Martinez (fm3 · Son · Minor) ─────────────────────
  { id: "log-009", integrationId: "int-001", integrationName: "Epic EHR – Main Hospital", timestamp: "2026-06-29T06:02:10Z", method: "POST", endpoint: "/Bundle", statusCode: 201, duration: 398, correlationId: "corr-fm3-a001", requestSize: 2048, responseSize: 512, patientId: "PAT-00103", userId: "system", subjectType: "FAMILY", subjectId: "fm3", subjectName: "Jake Martinez", subjectRelationship: "Son" },
  { id: "log-010", integrationId: "int-001", integrationName: "Epic EHR – Main Hospital", timestamp: "2026-06-28T06:01:55Z", method: "GET", endpoint: "/Observation?patient=PAT-00103&category=wearable", statusCode: 200, duration: 204, correlationId: "corr-fm3-a002", responseSize: 4096, patientId: "PAT-00103", userId: "system", subjectType: "FAMILY", subjectId: "fm3", subjectName: "Jake Martinez", subjectRelationship: "Son" },
  { id: "log-011", integrationId: "int-001", integrationName: "Epic EHR – Main Hospital", timestamp: "2026-06-27T06:00:45Z", method: "POST", endpoint: "/DocumentReference", statusCode: 201, duration: 311, correlationId: "corr-fm3-a003", requestSize: 1536, responseSize: 256, patientId: "PAT-00103", userId: "system", subjectType: "FAMILY", subjectId: "fm3", subjectName: "Jake Martinez", subjectRelationship: "Son" },
  // ── Family member — Maria Martinez (fm2 · Mother) ─────────────────────────
  { id: "log-012", integrationId: "int-003", integrationName: "Labcorp Direct API", timestamp: "2026-06-28T06:02:30Z", method: "GET", endpoint: "/results/recent?patientId=00102", statusCode: 200, duration: 188, correlationId: "corr-fm2-a001", responseSize: 2560, patientId: "PAT-00102", userId: "system", subjectType: "FAMILY", subjectId: "fm2", subjectName: "Maria Martinez", subjectRelationship: "Mother" },
  { id: "log-013", integrationId: "int-003", integrationName: "Labcorp Direct API", timestamp: "2026-06-21T06:01:10Z", method: "GET", endpoint: "/results/recent?patientId=00102", statusCode: 200, duration: 210, correlationId: "corr-fm2-a002", responseSize: 1920, patientId: "PAT-00102", userId: "system", subjectType: "FAMILY", subjectId: "fm2", subjectName: "Maria Martinez", subjectRelationship: "Mother" },
];

// ── FHIR Sample Payloads ──────────────────────────────────────────────────────

export const sampleFhirPatient = {
  resourceType: "Patient",
  id: "patient-00429",
  meta: {
    versionId: "1",
    lastUpdated: "2026-06-29T08:00:00Z",
    profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
  },
  identifier: [
    { use: "official", system: "urn:oid:2.16.840.1.113883.4.6", value: "00429", type: { text: "MRN" } },
  ],
  name: [{ use: "official", family: "Martinez", given: ["Sarah"] }],
  gender: "female",
  birthDate: "1981-03-15",
  address: [{ use: "home", line: ["123 Main St"], city: "Anytown", state: "CA", postalCode: "90210", country: "US" }],
  telecom: [
    { system: "phone", value: "+1-555-867-5309", use: "home" },
    { system: "email", value: "sarah.m@example.com" },
  ],
  communication: [{ language: { coding: [{ system: "urn:ietf:bcp:47", code: "en-US" }] }, preferred: true }],
};

export const sampleFhirGlucoseObservation = {
  resourceType: "Observation",
  id: "obs-glucose-00429-001",
  meta: {
    profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab"],
  },
  status: "final",
  category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
  code: {
    coding: [{ system: "http://loinc.org", code: "2339-0", display: "Glucose [Mass/volume] in Blood" }],
    text: "Blood Glucose",
  },
  subject: { reference: "Patient/patient-00429", display: "Sarah Martinez" },
  effectiveDateTime: "2026-06-29T07:30:00Z",
  issued: "2026-06-29T07:32:00Z",
  performer: [{ reference: "Organization/org-questbeyond" }],
  valueQuantity: { value: 142, unit: "mg/dL", system: "http://unitsofmeasure.org", code: "mg/dL" },
  referenceRange: [
    { low: { value: 70, unit: "mg/dL" }, high: { value: 99, unit: "mg/dL" }, text: "Normal fasting" },
  ],
  interpretation: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "H", display: "High" }] }],
};

// Wearable data mapped to FHIR Observation (multi-component)
export const sampleFhirWearableObservation = {
  resourceType: "Observation",
  id: "obs-wearable-00429-001",
  meta: {
    profile: ["http://hl7.org/fhir/StructureDefinition/Observation"],
  },
  status: "final",
  category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "activity" }] }],
  code: {
    coding: [{ system: "http://loinc.org", code: "55421-2", display: "Short Sleep duration panel" }],
    text: "Wearable Vitals Panel – Apple Watch",
  },
  subject: { reference: "Patient/patient-00429" },
  effectiveDateTime: "2026-06-29T08:00:00Z",
  device: { reference: "Device/apple-watch-sarah-001", display: "Apple Watch Series 9" },
  component: [
    {
      code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
      valueQuantity: { value: 72, unit: "beats/min", system: "http://unitsofmeasure.org", code: "/min" },
    },
    {
      code: { coding: [{ system: "http://loinc.org", code: "55423-8", display: "Number of steps in unspecified time Pedometer" }] },
      valueQuantity: { value: 7421, unit: "steps", system: "http://unitsofmeasure.org", code: "steps" },
    },
    {
      code: { coding: [{ system: "http://loinc.org", code: "93832-4", display: "Sleep duration" }] },
      valueQuantity: { value: 6.5, unit: "h", system: "http://unitsofmeasure.org", code: "h" },
    },
  ],
};

// ── Database Schema (for documentation & reference) ───────────────────────────
//
// integrations table:
//   id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
//   name            VARCHAR(255) NOT NULL
//   provider        VARCHAR(50) NOT NULL
//   environment     VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox','production'))
//   status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
//   base_url        VARCHAR(512) NOT NULL
//   api_version     VARCHAR(20)
//   webhook_url     VARCHAR(512)
//   auth_type       VARCHAR(20) NOT NULL
//   sync_frequency  VARCHAR(20) NOT NULL
//   cron_expression VARCHAR(50)
//   triggers        JSONB DEFAULT '[]'
//   ip_whitelist    JSONB DEFAULT '[]'
//   created_by      UUID REFERENCES users(id)
//   created_at      TIMESTAMPTZ DEFAULT now()
//   updated_at      TIMESTAMPTZ DEFAULT now()
//
// integration_credentials table (encrypted at rest, separate from main config):
//   id                   UUID PRIMARY KEY
//   integration_id       UUID REFERENCES integrations(id) ON DELETE CASCADE
//   client_id            VARCHAR(512)                        -- AES-256 encrypted
//   client_secret_hash   VARCHAR(512)                        -- bcrypt hashed, never plaintext
//   access_token_enc     TEXT                                -- AES-256 encrypted
//   refresh_token_enc    TEXT                                -- AES-256 encrypted
//   token_expires_at     TIMESTAMPTZ
//   api_key_hash         VARCHAR(512)                        -- SHA-256 hashed
//   public_key_id        VARCHAR(255)
//   cert_id              VARCHAR(255)
//   token_url            VARCHAR(512)
//   auth_url             VARCHAR(512)
//   scopes               JSONB DEFAULT '[]'
//   created_at           TIMESTAMPTZ DEFAULT now()
//   updated_at           TIMESTAMPTZ DEFAULT now()
//   -- Row-level security: only integration service can read
//
// integration_sync_log table:
//   id               UUID PRIMARY KEY
//   integration_id   UUID REFERENCES integrations(id)
//   started_at       TIMESTAMPTZ
//   completed_at     TIMESTAMPTZ
//   records_sent     INT DEFAULT 0
//   records_received INT DEFAULT 0
//   status           VARCHAR(20)
//   error_message    TEXT
//
// api_audit_log table (HIPAA requirement):
//   id               UUID PRIMARY KEY
//   integration_id   UUID REFERENCES integrations(id)
//   correlation_id   UUID NOT NULL
//   user_id          UUID REFERENCES users(id)
//   patient_id       VARCHAR(50)           -- de-identified in non-PHI environments
//   http_method      VARCHAR(10)
//   endpoint         VARCHAR(1024)
//   status_code      INT
//   duration_ms      INT
//   retry_attempt    INT DEFAULT 0
//   error_message    TEXT
//   requested_at     TIMESTAMPTZ DEFAULT now()
//   -- Retention: 7 years per HIPAA §164.530(j)
//   -- Immutable: no UPDATE/DELETE permitted

// ── UI Helper Functions ───────────────────────────────────────────────────────

export function statusColor(status: IntegrationStatus) {
  switch (status) {
    case "Connected":    return { bg: "bg-lime-soft", text: "text-lime", border: "border-lime/30", dot: "bg-lime" };
    case "Error":        return { bg: "bg-rose-soft", text: "text-rose", border: "border-rose/30", dot: "bg-rose" };
    case "Disconnected": return { bg: "bg-amber-soft", text: "text-amber", border: "border-amber/30", dot: "bg-amber" };
    case "Pending":      return { bg: "bg-sky-soft", text: "text-sky", border: "border-sky/30", dot: "bg-sky" };
  }
}

export function authLabel(type: AuthType): string {
  switch (type) {
    case "oauth2":   return "OAuth 2.0";
    case "api-key":  return "API Key";
    case "mtls":     return "mTLS";
  }
}

export function dataTypeLabel(type: DataType): string {
  const labels: Record<DataType, string> = {
    "reports": "Reports",
    "clinical-notes": "Clinical Notes",
    "wearables": "Wearables",
    "lab-results": "Lab Results",
    "prescriptions": "Prescriptions",
  };
  return labels[type];
}

export function providerLogo(provider: ProviderType): string {
  const logos: Record<ProviderType, string> = {
    "EPIC": "E",
    "Cerner": "C",
    "Custom API": "⚙",
    "Labcorp": "L",
    "Quest Diagnostics": "Q",
  };
  return logos[provider];
}

export function providerColor(provider: ProviderType): string {
  switch (provider) {
    case "EPIC":             return "bg-teal-soft text-teal";
    case "Cerner":           return "bg-violet-soft text-violet";
    case "Labcorp":          return "bg-sky-soft text-sky";
    case "Quest Diagnostics": return "bg-amber-soft text-amber";
    default:                 return "bg-surface-3 text-muted";
  }
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)   return "Just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const DATA_TYPE_OPTIONS: { value: DataType; label: string; icon: string; description: string }[] = [
  { value: "reports",        label: "Reports",        icon: "📋", description: "Clinical reports, summaries, and documents" },
  { value: "clinical-notes", label: "Clinical Notes", icon: "🩺", description: "SOAP notes, progress notes, and encounter summaries" },
  { value: "wearables",      label: "Wearable Data",  icon: "⌚", description: "Heart rate, steps, sleep, SpO2, and activity" },
  { value: "lab-results",    label: "Lab Results",    icon: "🧪", description: "Blood panels, urinalysis, cultures, and pathology" },
  { value: "prescriptions",  label: "Prescriptions",  icon: "💊", description: "Medication orders and refill history" },
];

export const PROVIDER_OPTIONS: { value: ProviderType; label: string; description: string; fhirVersion: string }[] = [
  { value: "EPIC",             label: "EPIC (FHIR)",          description: "Epic FHIR R4 via Interconnect API", fhirVersion: "R4" },
  { value: "Cerner",           label: "Cerner Millennium",    description: "Oracle Health FHIR R4 via SMART on FHIR", fhirVersion: "R4" },
  { value: "Labcorp",          label: "Labcorp",              description: "LabCorp Patient Results API", fhirVersion: "v2" },
  { value: "Quest Diagnostics",label: "Quest Diagnostics",    description: "Quest Quanum Enterprise Content Solutions", fhirVersion: "v2" },
  { value: "Custom API",       label: "Custom API",           description: "Generic REST or FHIR-compatible endpoint", fhirVersion: "custom" },
];

export const FHIR_RESOURCE_OPTIONS: { value: FhirResource; label: string; description: string }[] = [
  { value: "Patient",           label: "Patient",           description: "Demographics and administrative info" },
  { value: "Observation",       label: "Observation",       description: "Measurements, lab results, vitals, wearable data" },
  { value: "Encounter",         label: "Encounter",         description: "Healthcare visits and encounters" },
  { value: "MedicationRequest", label: "MedicationRequest", description: "Prescriptions and medication orders" },
  { value: "DiagnosticReport",  label: "DiagnosticReport",  description: "Lab reports and imaging reports" },
  { value: "Condition",         label: "Condition",         description: "Diagnoses and problems" },
];
