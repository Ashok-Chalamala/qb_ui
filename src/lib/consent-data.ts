// ─────────────────────────────────────────────────────────────────────────────
// Consent & Data Sharing — Types, Mock Data, FHIR Payloads
// HIPAA-compliant consent management for patient & dependent data sharing
// ─────────────────────────────────────────────────────────────────────────────

// ── Core Types ────────────────────────────────────────────────────────────────

export type ConsentStatus = "active" | "revoked" | "expired" | "pending";
export type SubjectType   = "self" | "family-member";
export type SharingMode   = "real-time" | "scheduled";
export type SharingFrequency = "immediate" | "daily" | "weekly" | "monthly";
export type GuardianRelationship = "Parent" | "Legal Guardian" | "Authorized Representative";
export type SharingConfigStatus = "active" | "paused" | "expired" | "revoked";

export type SharingDataType =
  | "demographics"
  | "reports"
  | "clinical-notes"
  | "lab-results"
  | "prescriptions"
  | "wearables";

export interface ShareableFamilyMember {
  id: string;
  fullName: string;
  dateOfBirth: string;     // ISO date string
  gender: "Male" | "Female" | "Other" | "Prefer not to say";
  relationship: string;
  age: number;
  isMinor: boolean;        // age < 18 → auto-requires guardian consent
  guardianName?: string;
  guardianRelationship?: GuardianRelationship;
  consentDocumentUrl?: string;
  consentDocumentName?: string;
  internalPatientId?: string;
  externalId?: string;
  contactInfo?: string;
  consentStatus: ConsentStatus;
  activeShares: number;    // # of active sharing configs
}

export interface ConsentRecord {
  consentId: string;
  subjectType: SubjectType;
  subjectId: string;
  subjectName: string;
  providerId: string;
  providerName: string;
  grantedBy: string;           // userId
  grantedByName: string;
  dataTypes: SharingDataType[];
  consentDocumentUrl?: string;
  consentDocumentName?: string;
  validFrom: string;
  validTo?: string;
  status: ConsentStatus;
  version: string;
  timestamp: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedByName?: string;
  isMinorConsent: boolean;
  guardianName?: string;
  auditTrail: AuditEntry[];
}

export interface SharingConfig {
  configId: string;
  subjectType: SubjectType;
  subjectId: string;
  subjectName: string;
  providerId: string;
  providerName: string;
  dataTypes: SharingDataType[];
  mode: SharingMode;
  frequency: SharingFrequency;
  triggers: string[];
  expirationDate: string;
  status: SharingConfigStatus;
  consentId: string;
  createdAt: string;
  lastSync?: string;
  recordsSent: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  actorId: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

// ── New-member form shape (used by the wizard) ────────────────────────────────
export interface NewFamilyMemberForm {
  fullName: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other" | "Prefer not to say";
  relationship: string;
  contactInfo: string;
  internalPatientId: string;
  externalId: string;
  guardianName: string;
  guardianRelationship: GuardianRelationship | "";
  consentDocumentName: string;
}

// ── Mock shareable family members ─────────────────────────────────────────────
// Note: isMinor determined by age < 18

export const shareableFamilyMembers: ShareableFamilyMember[] = [
  {
    id: "fm1",
    fullName: "Carlos Martinez",
    dateOfBirth: "1954-03-22",
    gender: "Male",
    relationship: "Father",
    age: 72,
    isMinor: false,
    internalPatientId: "PAT-00101",
    contactInfo: "+1 (555) 234-5678",
    consentStatus: "active",
    activeShares: 1,
  },
  {
    id: "fm2",
    fullName: "Maria Martinez",
    dateOfBirth: "1958-07-14",
    gender: "Female",
    relationship: "Mother",
    age: 68,
    isMinor: false,
    internalPatientId: "PAT-00102",
    contactInfo: "+1 (555) 234-5679",
    consentStatus: "active",
    activeShares: 2,
  },
  {
    id: "fm3",
    fullName: "Jake Martinez",
    dateOfBirth: "2012-05-08",
    gender: "Male",
    relationship: "Son",
    age: 14,
    isMinor: true,
    guardianName: "Sarah Martinez",
    guardianRelationship: "Parent",
    internalPatientId: "PAT-00103",
    consentDocumentUrl: "/consents/jake-guardian-consent-2026.pdf",
    consentDocumentName: "guardian-consent-jake-2026.pdf",
    consentStatus: "active",
    activeShares: 1,
  },
];

// ── Mock consent records ──────────────────────────────────────────────────────

export const mockConsentRecords: ConsentRecord[] = [
  {
    consentId: "con-001",
    subjectType: "self",
    subjectId: "patient-00429",
    subjectName: "Sarah Martinez",
    providerId: "int-001",
    providerName: "Epic EHR – Main Hospital",
    grantedBy: "user-sarah",
    grantedByName: "Sarah Martinez",
    dataTypes: ["demographics", "lab-results", "clinical-notes"],
    validFrom: "2026-01-15T00:00:00Z",
    validTo: "2027-01-15T00:00:00Z",
    status: "active",
    version: "1.2",
    timestamp: "2026-01-15T10:23:00Z",
    isMinorConsent: false,
    auditTrail: [
      { id: "ae-001", action: "consent.granted",   actor: "Sarah Martinez", actorId: "user-sarah", timestamp: "2026-01-15T10:23:00Z" },
      { id: "ae-002", action: "consent.version_bump", actor: "system",   actorId: "system",       timestamp: "2026-03-01T08:00:00Z", metadata: { from: "1.0", to: "1.2" } },
    ],
  },
  {
    consentId: "con-002",
    subjectType: "family-member",
    subjectId: "fm3",
    subjectName: "Jake Martinez",
    providerId: "int-001",
    providerName: "Epic EHR – Main Hospital",
    grantedBy: "user-sarah",
    grantedByName: "Sarah Martinez",
    dataTypes: ["demographics", "reports", "wearables"],
    consentDocumentUrl: "/consents/jake-guardian-consent-2026.pdf",
    consentDocumentName: "guardian-consent-jake-2026.pdf",
    validFrom: "2026-02-20T00:00:00Z",
    validTo: "2027-02-20T00:00:00Z",
    status: "active",
    version: "1.0",
    timestamp: "2026-02-20T14:10:00Z",
    isMinorConsent: true,
    guardianName: "Sarah Martinez",
    auditTrail: [
      { id: "ae-003", action: "consent.granted", actor: "Sarah Martinez", actorId: "user-sarah", timestamp: "2026-02-20T14:10:00Z", metadata: { role: "Guardian", minorAge: "13" } },
      { id: "ae-004", action: "consent.document_uploaded", actor: "Sarah Martinez", actorId: "user-sarah", timestamp: "2026-02-20T14:09:00Z", metadata: { file: "guardian-consent-jake-2026.pdf" } },
    ],
  },
  {
    consentId: "con-003",
    subjectType: "family-member",
    subjectId: "fm2",
    subjectName: "Maria Martinez",
    providerId: "int-003",
    providerName: "Labcorp Direct API",
    grantedBy: "user-sarah",
    grantedByName: "Sarah Martinez",
    dataTypes: ["lab-results", "prescriptions"],
    validFrom: "2026-04-01T00:00:00Z",
    status: "active",
    version: "1.0",
    timestamp: "2026-04-01T09:00:00Z",
    isMinorConsent: false,
    auditTrail: [
      { id: "ae-005", action: "consent.granted", actor: "Sarah Martinez", actorId: "user-sarah", timestamp: "2026-04-01T09:00:00Z" },
    ],
  },
  {
    consentId: "con-004",
    subjectType: "self",
    subjectId: "patient-00429",
    subjectName: "Sarah Martinez",
    providerId: "int-002",
    providerName: "Cerner Millennium",
    grantedBy: "user-sarah",
    grantedByName: "Sarah Martinez",
    dataTypes: ["reports", "prescriptions"],
    validFrom: "2026-03-10T00:00:00Z",
    validTo: "2026-06-10T00:00:00Z",
    status: "expired",
    version: "1.0",
    timestamp: "2026-03-10T11:00:00Z",
    isMinorConsent: false,
    auditTrail: [
      { id: "ae-006", action: "consent.granted", actor: "Sarah Martinez", actorId: "user-sarah", timestamp: "2026-03-10T11:00:00Z" },
      { id: "ae-007", action: "consent.expired",  actor: "system",         actorId: "system",     timestamp: "2026-06-10T00:00:00Z" },
    ],
  },
];

// ── Mock active sharing configs ───────────────────────────────────────────────

export const mockSharingConfigs: SharingConfig[] = [
  {
    configId: "cfg-001",
    subjectType: "self",
    subjectId: "patient-00429",
    subjectName: "Sarah Martinez",
    providerId: "int-001",
    providerName: "Epic EHR – Main Hospital",
    dataTypes: ["demographics", "lab-results", "clinical-notes"],
    mode: "real-time",
    frequency: "immediate",
    triggers: ["new-lab", "new-report"],
    expirationDate: "2027-01-15",
    status: "active",
    consentId: "con-001",
    createdAt: "2026-01-15T10:23:00Z",
    lastSync: "2026-06-29T08:32:00Z",
    recordsSent: 287,
  },
  {
    configId: "cfg-002",
    subjectType: "family-member",
    subjectId: "fm3",
    subjectName: "Jake Martinez",
    providerId: "int-001",
    providerName: "Epic EHR – Main Hospital",
    dataTypes: ["demographics", "reports", "wearables"],
    mode: "scheduled",
    frequency: "daily",
    triggers: ["daily-batch"],
    expirationDate: "2027-02-20",
    status: "active",
    consentId: "con-002",
    createdAt: "2026-02-20T14:10:00Z",
    lastSync: "2026-06-29T06:00:00Z",
    recordsSent: 124,
  },
  {
    configId: "cfg-003",
    subjectType: "family-member",
    subjectId: "fm2",
    subjectName: "Maria Martinez",
    providerId: "int-003",
    providerName: "Labcorp Direct API",
    dataTypes: ["lab-results", "prescriptions"],
    mode: "scheduled",
    frequency: "weekly",
    triggers: ["new-lab"],
    expirationDate: "2027-04-01",
    status: "active",
    consentId: "con-003",
    createdAt: "2026-04-01T09:00:00Z",
    lastSync: "2026-06-28T06:00:00Z",
    recordsSent: 38,
  },
];

// ── Sharing data type definitions ─────────────────────────────────────────────

export const SHARING_DATA_TYPES: {
  value: SharingDataType;
  label: string;
  icon: string;
  description: string;
  fhirResource: string;
}[] = [
  { value: "demographics",    label: "Patient Demographics", icon: "👤", description: "Name, DOB, gender, address, contact",               fhirResource: "Patient" },
  { value: "reports",         label: "Reports",              icon: "📋", description: "PDF reports, discharge summaries, imaging",         fhirResource: "DocumentReference" },
  { value: "clinical-notes",  label: "Clinical Notes",       icon: "🩺", description: "SOAP notes, progress notes, encounter summaries",    fhirResource: "Composition" },
  { value: "lab-results",     label: "Lab Results",          icon: "🧪", description: "Blood panels, urinalysis, cultures, HbA1c",          fhirResource: "DiagnosticReport / Observation" },
  { value: "prescriptions",   label: "Prescriptions",        icon: "💊", description: "Medication orders, dosage, refill history",          fhirResource: "MedicationRequest" },
  { value: "wearables",       label: "Wearable Data",        icon: "⌚", description: "Heart rate, steps, sleep, SpO2, blood glucose",     fhirResource: "Observation (Panel)" },
];

// ── FHIR Sample Payloads ──────────────────────────────────────────────────────

// Patient resource for a minor (Jake Martinez)
export const fhirChildPatient = {
  resourceType: "Patient",
  id: "patient-jake-00103",
  meta: {
    profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
  },
  identifier: [
    { use: "official", system: "urn:questbeyond:patient", value: "PAT-00103", type: { text: "Internal ID" } },
  ],
  name: [{ use: "official", family: "Martinez", given: ["Jake"] }],
  gender: "male",
  birthDate: "2012-05-08",
  address: [{ use: "home", line: ["123 Main St"], city: "Anytown", state: "CA", postalCode: "90210" }],
  // Link to guardian via contact
  contact: [
    {
      relationship: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", code: "MTH", display: "Mother" }] }],
      name: { family: "Martinez", given: ["Sarah"] },
      telecom: [{ system: "phone", value: "+1-555-867-5309" }],
    },
  ],
};

// RelatedPerson resource — Sarah Martinez as Jake's guardian/mother
export const fhirRelatedPerson = {
  resourceType: "RelatedPerson",
  id: "related-sarah-guardian-jake",
  meta: {
    profile: ["http://hl7.org/fhir/StructureDefinition/RelatedPerson"],
  },
  active: true,
  patient: { reference: "Patient/patient-jake-00103", display: "Jake Martinez" },
  relationship: [
    {
      coding: [
        { system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", code: "MTH", display: "mother" },
        { system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", code: "GUARD", display: "guardian" },
      ],
    },
  ],
  name: [{ use: "official", family: "Martinez", given: ["Sarah"] }],
  telecom: [{ system: "phone", value: "+1-555-867-5309" }],
  birthDate: "1981-03-15",
  gender: "female",
};

// FHIR Consent resource — Parent consenting to share Jake's data with Epic
export const fhirConsentResource = {
  resourceType: "Consent",
  id: "consent-jake-epic-001",
  meta: {
    profile: ["http://hl7.org/fhir/StructureDefinition/Consent"],
  },
  status: "active",
  scope: {
    coding: [{ system: "http://terminology.hl7.org/CodeSystem/consentscope", code: "patient-privacy", display: "Privacy Consent" }],
  },
  category: [
    { coding: [{ system: "http://loinc.org", code: "59284-0", display: "Patient Consent" }] },
  ],
  patient: { reference: "Patient/patient-jake-00103", display: "Jake Martinez" },
  dateTime: "2026-02-20T14:10:00Z",
  performer: [
    { reference: "RelatedPerson/related-sarah-guardian-jake", display: "Sarah Martinez (Guardian)" },
  ],
  organization: [
    { display: "Quest Beyond Health Platform" },
  ],
  sourceAttachment: {
    contentType: "application/pdf",
    url: "/consents/jake-guardian-consent-2026.pdf",
    title: "Guardian Consent Form — Jake Martinez",
  },
  policy: [{ authority: "https://www.hhs.gov/hipaa/", uri: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-consent" }],
  provision: {
    type: "permit",
    period: { start: "2026-02-20", end: "2027-02-20" },
    actor: [
      {
        role: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", code: "IRCP" }] },
        reference: { display: "Epic EHR – Main Hospital" },
      },
    ],
    data: [
      { meaning: "dependents", reference: { reference: "Patient/patient-jake-00103" } },
    ],
    class: [
      { system: "http://hl7.org/fhir/resource-types", code: "Observation", display: "Observation" },
      { system: "http://hl7.org/fhir/resource-types", code: "DocumentReference", display: "DocumentReference" },
    ],
  },
};

// Observation — Jake's wearable data (multi-component panel)
export const fhirMinorWearableObservation = {
  resourceType: "Observation",
  id: "obs-wearable-jake-00103-001",
  status: "final",
  category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "activity" }] }],
  code: { coding: [{ system: "http://loinc.org", code: "55421-2", display: "Wearable Vitals Panel" }] },
  subject: { reference: "Patient/patient-jake-00103", display: "Jake Martinez" },
  effectiveDateTime: "2026-06-29T07:00:00Z",
  // Consent reference — required when sharing minor data
  meta: {
    security: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "MINORCONSENT", display: "minor consent" }],
    extension: [
      { url: "http://hl7.org/fhir/StructureDefinition/consent-reference", valueReference: { reference: "Consent/consent-jake-epic-001" } },
    ],
  },
  component: [
    {
      code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
      valueQuantity: { value: 84, unit: "beats/min", system: "http://unitsofmeasure.org", code: "/min" },
    },
    {
      code: { coding: [{ system: "http://loinc.org", code: "55423-8", display: "Number of steps" }] },
      valueQuantity: { value: 9240, unit: "steps", system: "http://unitsofmeasure.org", code: "steps" },
    },
  ],
};

// DocumentReference — Jake's report shared with Epic
export const fhirDocumentReference = {
  resourceType: "DocumentReference",
  id: "docref-jake-report-001",
  status: "current",
  type: { coding: [{ system: "http://loinc.org", code: "11488-4", display: "Consultation note" }] },
  subject: { reference: "Patient/patient-jake-00103" },
  date: "2026-06-20T10:00:00Z",
  author: [{ display: "Quest Beyond Health Platform" }],
  relatesTo: [
    { code: "appends", target: { reference: "Consent/consent-jake-epic-001" } },
  ],
  content: [
    {
      attachment: { contentType: "application/pdf", url: "/reports/jake-annual-2026.pdf", title: "Jake Martinez Annual Checkup 2026" },
    },
  ],
  context: {
    sourcePatientInfo: { reference: "Patient/patient-jake-00103" },
    related: [{ reference: "RelatedPerson/related-sarah-guardian-jake" }],
  },
};

// ── Database Schema (reference) ───────────────────────────────────────────────
//
// family_members table:
//   family_member_id    UUID PRIMARY KEY
//   linked_patient_id   UUID REFERENCES patients(id)         -- the primary user
//   full_name           VARCHAR(255)
//   date_of_birth       DATE
//   gender              VARCHAR(30)
//   relationship        VARCHAR(50)
//   is_minor            BOOLEAN GENERATED ALWAYS AS (age_at_dob < 18) STORED
//   guardian_id         UUID REFERENCES patients(id)
//   guardian_name       VARCHAR(255)
//   guardian_relationship VARCHAR(50)
//   consent_doc_url     VARCHAR(1024)                        -- encrypted reference; actual file in S3
//   internal_patient_id VARCHAR(50)
//   external_id         VARCHAR(100)
//   contact_info        VARCHAR(255)
//   created_at          TIMESTAMPTZ DEFAULT now()
//   updated_at          TIMESTAMPTZ DEFAULT now()
//
// data_sharing_configs table:
//   config_id           UUID PRIMARY KEY
//   subject_type        VARCHAR(20) CHECK (subject_type IN ('self','family-member'))
//   subject_id          VARCHAR(50)                          -- patient_id or family_member_id
//   provider_id         UUID REFERENCES integrations(id)
//   data_types          JSONB                                -- ["demographics","lab-results",...]
//   mode                VARCHAR(20)
//   frequency           VARCHAR(20)
//   triggers            JSONB
//   expiration_date     DATE
//   status              VARCHAR(20)
//   consent_id          UUID REFERENCES consents(id)
//   created_at          TIMESTAMPTZ DEFAULT now()
//   last_sync           TIMESTAMPTZ
//
// consents table:
//   consent_id          UUID PRIMARY KEY
//   subject_type        VARCHAR(20)
//   subject_id          VARCHAR(50)
//   subject_name        VARCHAR(255)
//   provider_id         UUID REFERENCES integrations(id)
//   granted_by          UUID REFERENCES users(id)
//   data_types          JSONB
//   consent_doc_url     VARCHAR(1024)
//   valid_from          TIMESTAMPTZ
//   valid_to            TIMESTAMPTZ
//   status              VARCHAR(20)
//   version             VARCHAR(10)
//   is_minor_consent    BOOLEAN DEFAULT false
//   guardian_name       VARCHAR(255)
//   revoked_at          TIMESTAMPTZ
//   revoked_by          UUID REFERENCES users(id)
//   -- Immutable: no UPDATE permitted; status changes via INSERT of new record
//   -- Retention: 7 years per HIPAA §164.530(j)
//
// consent_audit_log table:
//   id                  UUID PRIMARY KEY
//   consent_id          UUID REFERENCES consents(id)
//   action              VARCHAR(100)                         -- e.g. 'consent.granted', 'consent.revoked'
//   actor               VARCHAR(255)
//   actor_id            UUID REFERENCES users(id)
//   timestamp           TIMESTAMPTZ DEFAULT now()
//   metadata            JSONB
//   -- Immutable; row-level security: INSERT only

// ── UI helper ─────────────────────────────────────────────────────────────────

export function consentStatusColor(status: ConsentStatus) {
  switch (status) {
    case "active":  return { bg: "bg-lime-soft",  text: "text-lime",  border: "border-lime/30" };
    case "revoked": return { bg: "bg-rose-soft",  text: "text-rose",  border: "border-rose/30" };
    case "expired": return { bg: "bg-amber-soft", text: "text-amber", border: "border-amber/30" };
    case "pending": return { bg: "bg-sky-soft",   text: "text-sky",   border: "border-sky/30" };
  }
}

export function sharingConfigStatusColor(status: SharingConfigStatus) {
  switch (status) {
    case "active":  return { bg: "bg-lime-soft",  text: "text-lime",  border: "border-lime/30" };
    case "paused":  return { bg: "bg-sky-soft",   text: "text-sky",   border: "border-sky/30" };
    case "expired": return { bg: "bg-amber-soft", text: "text-amber", border: "border-amber/30" };
    case "revoked": return { bg: "bg-rose-soft",  text: "text-rose",  border: "border-rose/30" };
  }
}
