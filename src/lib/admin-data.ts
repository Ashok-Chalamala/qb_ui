// ─────────────────────────────────────────────────────────────────────────────
// Admin Integration Management — Types, Mock Data
//
// SEPARATION OF CONCERNS:
//   Admin   → configures providers (FHIR URLs, OAuth, certs, templates)
//   Patient → picks a provider by name, verifies identity via OTP, consents
//
// Patients NEVER see: FHIR endpoints, Client IDs, secrets, IP whitelist,
// certificates, API versions, or any technical configuration.
// ─────────────────────────────────────────────────────────────────────────────

// ── Core Admin Types ──────────────────────────────────────────────────────────

export type AdminProviderStatus  = "active" | "inactive" | "pending" | "error";
export type AdminProviderType    = "EPIC" | "Cerner" | "Labcorp" | "Quest Diagnostics" | "Custom";
export type AdminAuthType        = "oauth2" | "api-key" | "mtls";
export type TemplateStatus       = "official" | "community" | "custom";
export type CertStatus           = "active" | "expired" | "revoked";
export type PatientLinkStatus    = "connected" | "pending-otp" | "disconnected" | "error";
export type OtpChannel           = "email" | "sms";

export interface AdminOAuth2Config {
  clientId: string;
  tokenUrl: string;
  authorizationUrl?: string;
  scopes: string[];
  // clientSecretHash stored in vault — never exposed
}

export interface AdminApiKeyConfig {
  keyId: string;
  headerName: string;
  // keyHash stored in vault
}

export interface AdminMtlsConfig {
  certificateId: string;
  certSubject: string;
  certExpiry: string;
  publicKeyId: string;
}

export interface AdminProvider {
  id: string;
  name: string;                   // machine name
  displayName: string;            // shown to patients (no tech details)
  description: string;            // short patient-facing description
  logoInitials: string;
  logoColor: string;              // tailwind class
  providerType: AdminProviderType;
  fhirEndpoint: string;           // ADMIN ONLY — never shown to patient
  apiVersion: string;
  webhookUrl?: string;
  environment: "sandbox" | "production";
  status: AdminProviderStatus;
  authType: AdminAuthType;
  oauth2?: AdminOAuth2Config;
  apiKey?: AdminApiKeyConfig;
  mtls?: AdminMtlsConfig;
  ipWhitelist: string[];
  supportedDataTypes: string[];
  templateId?: string;
  connectedPatients: number;
  supportsOtp: boolean;           // can patients link via OTP?
  supportsOAuth: boolean;         // can patients link via OAuth redirect?
  otpContactMethods: OtpChannel[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
}

export interface IntegrationTemplate {
  id: string;
  name: string;
  providerType: AdminProviderType;
  description: string;
  version: string;
  fhirEndpoint: string;
  apiVersion: string;
  authType: AdminAuthType;
  scopes: string[];
  defaultDataTypes: string[];
  setupSteps: string[];
  docsUrl?: string;
  status: TemplateStatus;
}

export interface SecurityCertificate {
  id: string;
  providerId: string;
  providerName: string;
  keyType: "public-key" | "private-key" | "tls-cert" | "api-key";
  keyId: string;
  fingerprint: string;
  uploadedAt: string;
  uploadedBy: string;
  expiresAt?: string;
  status: CertStatus;
  notes?: string;
}

export interface IpWhitelistEntry {
  id: string;
  providerId: string;
  ipAddress: string;
  description: string;
  addedAt: string;
  addedBy: string;
}

export interface AdminDataMapping {
  id: string;
  providerId: string;
  providerName: string;
  internalField: string;
  internalType: string;
  fhirResource: string;
  fhirPath: string;
  transform?: string;
  required: boolean;
}

// ── Patient-side types (result of patient connecting to admin-configured provider) ──

export interface PatientProviderLink {
  linkId: string;
  subjectId: string;           // patient-00429 or fm1/fm2/fm3
  subjectName: string;
  subjectType: "SELF" | "FAMILY";
  providerId: string;          // references AdminProvider.id
  providerName: string;        // display name
  providerType: AdminProviderType;
  status: PatientLinkStatus;
  dataTypes: string[];
  connectedAt: string;
  lastSync?: string;
  authReference?: string;      // encrypted token ref (never plaintext)
  consentId?: string;
  otpVerified: boolean;
  otpChannel?: OtpChannel;
  disconnectedAt?: string;
  errorMessage?: string;
}

export interface OtpSession {
  sessionId: string;
  contact: string;
  channel: OtpChannel;
  issuedAt: string;
  expiresAt: string;
  verified: boolean;
  attempts: number;
}

// ── Admin add-provider form shape ─────────────────────────────────────────────

export interface AddProviderForm {
  displayName: string;
  description: string;
  providerType: AdminProviderType;
  fhirEndpoint: string;
  apiVersion: string;
  webhookUrl: string;
  environment: "sandbox" | "production";
  authType: AdminAuthType;
  // OAuth
  clientId: string;
  clientSecret: string;        // entered by admin, encrypted before storage
  tokenUrl: string;
  authorizationUrl: string;
  scopes: string;              // comma-separated
  // API Key
  apiKey: string;
  apiKeyHeader: string;
  // mTLS
  certFile: string;
  privateKeyFile: string;
  ipWhitelist: string;         // newline-separated
  supportedDataTypes: string[];
  templateId: string;
  supportsOtp: boolean;
  supportsOAuth: boolean;
  otpContactMethods: OtpChannel[];
}

export const EMPTY_ADD_FORM: AddProviderForm = {
  displayName: "", description: "", providerType: "Custom",
  fhirEndpoint: "", apiVersion: "R4", webhookUrl: "",
  environment: "sandbox", authType: "oauth2",
  clientId: "", clientSecret: "", tokenUrl: "",
  authorizationUrl: "", scopes: "", apiKey: "", apiKeyHeader: "X-API-Key",
  certFile: "", privateKeyFile: "", ipWhitelist: "",
  supportedDataTypes: [], templateId: "", supportsOtp: true, supportsOAuth: false,
  otpContactMethods: ["email"],
};

// ── Mock data ─────────────────────────────────────────────────────────────────

export const mockAdminProviders: AdminProvider[] = [
  {
    id: "ap-001",
    name: "epic-main",
    displayName: "Epic EHR — Main Hospital",
    description: "Connect to Main Hospital's Epic electronic health records for reports, labs, and clinical notes.",
    logoInitials: "EP",
    logoColor: "bg-teal-soft text-teal",
    providerType: "EPIC",
    fhirEndpoint: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    apiVersion: "R4",
    webhookUrl: "https://app.questbeyond.com/webhooks/epic",
    environment: "production",
    status: "active",
    authType: "oauth2",
    oauth2: {
      clientId: "qb-epic-prod-client",
      tokenUrl: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
      authorizationUrl: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize",
      scopes: ["patient/Patient.read", "patient/Observation.read", "patient/MedicationRequest.read", "launch/patient"],
    },
    ipWhitelist: ["52.14.22.1", "52.14.22.2"],
    supportedDataTypes: ["reports", "clinical-notes", "lab-results", "prescriptions"],
    templateId: "tpl-001",
    connectedPatients: 2847,
    supportsOtp: true,
    supportsOAuth: true,
    otpContactMethods: ["email", "sms"],
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-06-29T08:00:00Z",
    createdBy: "admin@questbeyond.com",
  },
  {
    id: "ap-002",
    name: "cerner-sandbox",
    displayName: "Cerner Millennium — Sandbox",
    description: "Cerner-based healthcare system for medications, lab results, and clinical summaries.",
    logoInitials: "CN",
    logoColor: "bg-violet-soft text-violet",
    providerType: "Cerner",
    fhirEndpoint: "https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    apiVersion: "R4",
    environment: "sandbox",
    status: "active",
    authType: "oauth2",
    oauth2: {
      clientId: "qb-cerner-sandbox",
      tokenUrl: "https://authorization.cerner.com/tenants/ec2458f2/protocols/oauth2/profiles/smart-v1/token",
      authorizationUrl: "https://authorization.cerner.com/tenants/ec2458f2/protocols/oauth2/profiles/smart-v1/personas/patient/authorize",
      scopes: ["patient/Patient.read", "patient/MedicationRequest.read"],
    },
    ipWhitelist: [],
    supportedDataTypes: ["prescriptions", "clinical-notes"],
    templateId: "tpl-002",
    connectedPatients: 124,
    supportsOtp: true,
    supportsOAuth: true,
    otpContactMethods: ["email"],
    createdAt: "2026-03-10T09:00:00Z",
    updatedAt: "2026-06-28T14:00:00Z",
    createdBy: "admin@questbeyond.com",
    notes: "Sandbox environment — for testing only",
  },
  {
    id: "ap-003",
    name: "labcorp-direct",
    displayName: "Labcorp — Lab Results",
    description: "Direct access to your Labcorp laboratory results including blood panels, HbA1c, and urinalysis.",
    logoInitials: "LC",
    logoColor: "bg-sky-soft text-sky",
    providerType: "Labcorp",
    fhirEndpoint: "https://api.labcorp.com/v2/fhir",
    apiVersion: "v2",
    environment: "production",
    status: "active",
    authType: "api-key",
    apiKey: { keyId: "lc-key-prod-001", headerName: "X-API-Key" },
    ipWhitelist: [],
    supportedDataTypes: ["lab-results"],
    templateId: "tpl-003",
    connectedPatients: 891,
    supportsOtp: true,
    supportsOAuth: false,
    otpContactMethods: ["sms", "email"],
    createdAt: "2026-04-20T14:00:00Z",
    updatedAt: "2026-06-29T06:00:00Z",
    createdBy: "admin@questbeyond.com",
  },
  {
    id: "ap-004",
    name: "hospital-xyz",
    displayName: "Hospital XYZ — Community Health",
    description: "Community hospital integration for full medical records including imaging and surgical reports.",
    logoInitials: "HX",
    logoColor: "bg-amber-soft text-amber",
    providerType: "Custom",
    fhirEndpoint: "https://fhir.hospitalxyz.org/api/R4",
    apiVersion: "R4",
    environment: "production",
    status: "pending",
    authType: "mtls",
    mtls: {
      certificateId: "cert-hxyz-001",
      certSubject: "CN=qb-hospital-xyz, O=QuestBeyond, C=US",
      certExpiry: "2027-06-01T00:00:00Z",
      publicKeyId: "mtls-pub-hxyz-001",
    },
    ipWhitelist: ["10.0.0.1"],
    supportedDataTypes: ["reports", "clinical-notes", "lab-results", "prescriptions", "wearables"],
    connectedPatients: 0,
    supportsOtp: false,
    supportsOAuth: false,
    otpContactMethods: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    createdBy: "admin@questbeyond.com",
    notes: "Pending mTLS certificate exchange with hospital IT",
  },
];

export const integrationTemplates: IntegrationTemplate[] = [
  {
    id: "tpl-001",
    name: "Epic SMART on FHIR R4",
    providerType: "EPIC",
    description: "Standard SMART on FHIR R4 integration for Epic EHR. Supports patient-context launch and full R4 resource set.",
    version: "2.0",
    fhirEndpoint: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    apiVersion: "R4",
    authType: "oauth2",
    scopes: ["patient/Patient.read", "patient/Observation.read", "patient/MedicationRequest.read", "launch/patient", "openid", "fhirUser"],
    defaultDataTypes: ["reports", "clinical-notes", "lab-results", "prescriptions"],
    setupSteps: [
      "Register your app at https://fhir.epic.com/developer",
      "Set redirect URI to https://app.questbeyond.com/oauth/callback",
      "Copy Client ID into the Client ID field below",
      "Enable required SMART scopes",
      "Submit for Epic production app approval",
    ],
    docsUrl: "https://fhir.epic.com/developer",
    status: "official",
  },
  {
    id: "tpl-002",
    name: "Cerner SMART Health IT",
    providerType: "Cerner",
    description: "Cerner Millennium SMART on FHIR integration with patient-facing OAuth. Requires tenant ID from hospital IT.",
    version: "1.5",
    fhirEndpoint: "https://fhir-ehr-code.cerner.com/r4/{tenant-id}",
    apiVersion: "R4",
    authType: "oauth2",
    scopes: ["patient/Patient.read", "patient/MedicationRequest.read", "patient/Observation.read", "launch/patient"],
    defaultDataTypes: ["prescriptions", "lab-results", "clinical-notes"],
    setupSteps: [
      "Create an app at Cerner Central (code.cerner.com)",
      "Obtain tenant ID from the hospital IT team",
      "Replace {tenant-id} in the FHIR endpoint URL",
      "Configure required SMART scopes",
    ],
    docsUrl: "https://code.cerner.com/developer",
    status: "official",
  },
  {
    id: "tpl-003",
    name: "Labcorp Direct API v2",
    providerType: "Labcorp",
    description: "API key-based integration for Labcorp laboratory results via FHIR DiagnosticReport.",
    version: "2.1",
    fhirEndpoint: "https://api.labcorp.com/v2/fhir",
    apiVersion: "v2",
    authType: "api-key",
    scopes: [],
    defaultDataTypes: ["lab-results"],
    setupSteps: [
      "Register at developer.labcorp.com",
      "Request API key for FHIR R4 DiagnosticReport endpoints",
      "Store API key in the Admin security vault",
    ],
    docsUrl: "https://developer.labcorp.com",
    status: "official",
  },
  {
    id: "tpl-004",
    name: "Custom FHIR R4 (mTLS)",
    providerType: "Custom",
    description: "Template for hospitals and clinics requiring mutual TLS certificate authentication.",
    version: "1.0",
    fhirEndpoint: "https://fhir.{hospital-domain}/api/R4",
    apiVersion: "R4",
    authType: "mtls",
    scopes: [],
    defaultDataTypes: ["reports", "clinical-notes", "lab-results", "prescriptions"],
    setupSteps: [
      "Obtain the server's CA certificate from hospital IT",
      "Generate a client certificate + private key pair",
      "Register your public key with the hospital's mTLS gateway",
      "Upload private key to the QuestBeyond secure vault (HSM-backed)",
      "Configure IP whitelist with the hospital's allowed egress IPs",
    ],
    status: "community",
  },
];

export const mockCertificates: SecurityCertificate[] = [
  {
    id: "cert-001",
    providerId: "ap-001",
    providerName: "Epic EHR — Main Hospital",
    keyType: "tls-cert",
    keyId: "epic-tls-prod-2026",
    fingerprint: "SHA256:2f:8b:a1:4c:9e:3d:7f:11:22:ab",
    uploadedAt: "2026-01-15T10:00:00Z",
    uploadedBy: "admin@questbeyond.com",
    expiresAt: "2027-01-15T00:00:00Z",
    status: "active",
  },
  {
    id: "cert-002",
    providerId: "ap-004",
    providerName: "Hospital XYZ",
    keyType: "tls-cert",
    keyId: "hxyz-mtls-cert-001",
    fingerprint: "SHA256:9c:4a:12:3f:7b:88:ee:02:14:cd",
    uploadedAt: "2026-06-01T00:00:00Z",
    uploadedBy: "admin@questbeyond.com",
    expiresAt: "2027-06-01T00:00:00Z",
    status: "active",
  },
];

export const mockAdminMappings: AdminDataMapping[] = [
  { id: "am-001", providerId: "ap-001", providerName: "Epic EHR", internalField: "patientId",      internalType: "string", fhirResource: "Patient",           fhirPath: "Patient.id",                          required: true },
  { id: "am-002", providerId: "ap-001", providerName: "Epic EHR", internalField: "glucoseReading",  internalType: "number", fhirResource: "Observation",       fhirPath: "Observation.valueQuantity.value",     required: true,  transform: "mg/dL → mmol/L" },
  { id: "am-003", providerId: "ap-001", providerName: "Epic EHR", internalField: "encounterDate",   internalType: "date",   fhirResource: "Encounter",         fhirPath: "Encounter.period.start",              required: true },
  { id: "am-004", providerId: "ap-001", providerName: "Epic EHR", internalField: "labResult",       internalType: "object", fhirResource: "DiagnosticReport",  fhirPath: "DiagnosticReport.result[0].reference", required: false },
  { id: "am-005", providerId: "ap-003", providerName: "Labcorp",  internalField: "hba1cValue",      internalType: "number", fhirResource: "Observation",       fhirPath: "Observation.valueQuantity",           required: true },
  { id: "am-006", providerId: "ap-002", providerName: "Cerner",   internalField: "medicationName",  internalType: "string", fhirResource: "MedicationRequest", fhirPath: "MedicationRequest.medicationCodeableConcept.text", required: true },
];

export const mockPatientLinks: PatientProviderLink[] = [
  {
    linkId: "lnk-001",
    subjectId: "patient-00429",
    subjectName: "Sarah Martinez",
    subjectType: "SELF",
    providerId: "ap-001",
    providerName: "Epic EHR — Main Hospital",
    providerType: "EPIC",
    status: "connected",
    dataTypes: ["reports", "lab-results", "clinical-notes"],
    connectedAt: "2026-01-15T10:30:00Z",
    lastSync: "2026-06-29T08:32:00Z",
    consentId: "con-001",
    otpVerified: true,
    otpChannel: "email",
  },
  {
    linkId: "lnk-002",
    subjectId: "patient-00429",
    subjectName: "Sarah Martinez",
    subjectType: "SELF",
    providerId: "ap-003",
    providerName: "Labcorp — Lab Results",
    providerType: "Labcorp",
    status: "connected",
    dataTypes: ["lab-results"],
    connectedAt: "2026-04-20T15:00:00Z",
    lastSync: "2026-06-29T06:00:00Z",
    consentId: "con-003",
    otpVerified: true,
    otpChannel: "sms",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function adminProviderStatusColor(status: AdminProviderStatus) {
  switch (status) {
    case "active":   return { bg: "bg-lime-soft",   text: "text-lime",   border: "border-lime/30",   dot: "bg-lime" };
    case "inactive": return { bg: "bg-surface-3",   text: "text-muted",  border: "border-border-strong", dot: "bg-muted" };
    case "pending":  return { bg: "bg-amber-soft",  text: "text-amber",  border: "border-amber/30",  dot: "bg-amber" };
    case "error":    return { bg: "bg-rose-soft",   text: "text-rose",   border: "border-rose/30",   dot: "bg-rose" };
  }
}

export function patientLinkStatusColor(status: PatientLinkStatus) {
  switch (status) {
    case "connected":    return { bg: "bg-lime-soft",  text: "text-lime",  border: "border-lime/30" };
    case "pending-otp":  return { bg: "bg-amber-soft", text: "text-amber", border: "border-amber/30" };
    case "disconnected": return { bg: "bg-surface-3",  text: "text-muted", border: "border-border-strong" };
    case "error":        return { bg: "bg-rose-soft",  text: "text-rose",  border: "border-rose/30" };
  }
}

export const DATA_TYPE_LABELS: Record<string, string> = {
  "demographics":   "Demographics",
  "reports":        "Reports",
  "clinical-notes": "Clinical Notes",
  "lab-results":    "Lab Results",
  "prescriptions":  "Prescriptions",
  "wearables":      "Wearable Data",
};

export const DATA_TYPE_ICONS: Record<string, string> = {
  "demographics":   "👤",
  "reports":        "📋",
  "clinical-notes": "🩺",
  "lab-results":    "🧪",
  "prescriptions":  "💊",
  "wearables":      "⌚",
};
