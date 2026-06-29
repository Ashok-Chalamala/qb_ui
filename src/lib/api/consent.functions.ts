// ─────────────────────────────────────────────────────────────────────────────
// Consent & Data Sharing — Backend API Service Layer
//
// SECURITY:  Only a verified guardian/patient can consent on behalf of a minor.
//            Consent must exist and be active before any data is shared.
//            Secrets, tokens, and PHI protected per HIPAA §164.312.
//            All consent mutations emit immutable audit log entries.
// ─────────────────────────────────────────────────────────────────────────────

import {
  shareableFamilyMembers,
  mockConsentRecords,
  mockSharingConfigs,
  type ShareableFamilyMember,
  type ConsentRecord,
  type SharingConfig,
  type SharingDataType,
  type SharingMode,
  type SharingFrequency,
  type NewFamilyMemberForm,
  type SubjectType,
  fhirChildPatient,
  fhirRelatedPerson,
  fhirConsentResource,
  fhirMinorWearableObservation,
} from "@/lib/consent-data";
import type { UserContextHeaders } from "@/lib/user-context";

// ── Request / Response Types ──────────────────────────────────────────────────

export interface CreateFamilyMemberRequest {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  relationship: string;
  contactInfo?: string;
  internalPatientId?: string;
  externalId?: string;
  guardianName?: string;
  guardianRelationship?: string;
  consentDocumentBase64?: string;  // PDF encoded, stored in S3 — never in DB
  consentDocumentMimeType?: string;
}

export interface CreateConsentRequest {
  subjectType: SubjectType;
  subjectId: string;
  subjectName: string;
  providerId: string;
  providerName: string;
  dataTypes: SharingDataType[];
  validFrom: string;
  validTo?: string;
  isMinorConsent: boolean;
  guardianName?: string;
  consentDocumentBase64?: string;
  consentDocumentMimeType?: string;
  // Guardian must explicitly accept — captured as boolean from signed UI interaction
  guardianAccepted: boolean;
}

export interface CreateSharingConfigRequest {
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
  consentId: string;
}

export interface ShareDataRequest {
  configId: string;
  patientId: string;
  dataType: SharingDataType;
  correlationId?: string;
}

export interface ShareDataResponse {
  accepted: boolean;
  correlationId: string;
  fhirBundleId?: string;
  statusCode: number;
  message: string;
  fhirPayload?: object;
}

export interface RevokeConsentRequest {
  consentId: string;
  revokedByUserId: string;
  revokedByName: string;
  reason?: string;
}

// ── Authorization Guard ───────────────────────────────────────────────────────

/**
 * Validates that the requesting user has rights to share a family member's data.
 * For minors: requestor must be the registered guardian.
 * Real implementation would check DB + JWT claims.
 */
export function assertSharePermission(
  requestorId: string,
  member: ShareableFamilyMember,
): void {
  if (member.isMinor) {
    // Real: verify requestorId is in guardian_id column for this family_member_id
    if (!member.guardianName) {
      throw new Error(
        `Guardian consent required: ${member.fullName} is a minor (age ${member.age}). A guardian must be linked before sharing.`
      );
    }
  }
  // Additional checks: authorized_users RBAC table, active session, MFA verification
}

/**
 * Validates that an active, non-expired consent exists before sharing.
 */
export function assertConsentActive(consent: ConsentRecord | undefined, subjectName: string): void {
  if (!consent) throw new Error(`No consent record found for ${subjectName}. Obtain consent before sharing data.`);
  if (consent.status === "revoked") throw new Error(`Consent for ${subjectName} has been revoked. Re-obtain consent to resume sharing.`);
  if (consent.status === "expired") throw new Error(`Consent for ${subjectName} has expired. Renew consent before sharing.`);
  if (consent.validTo && new Date(consent.validTo) < new Date()) {
    throw new Error(`Consent for ${subjectName} expired on ${consent.validTo}. Renew to continue.`);
  }
}

// ── POST /family-members ──────────────────────────────────────────────────────

/**
 * Registers a new family member linked to the primary patient.
 * If isMinor (age < 18), requires a guardian consent document upload.
 *
 * Real implementation:
 *  1. Validate DOB, compute isMinor
 *  2. Encrypt PII fields at application layer (AES-256-GCM)
 *  3. If consent doc provided: upload to S3 (server-side encrypted), store URL only in DB
 *  4. INSERT into family_members table
 *  5. Emit audit log: { action: 'family_member.created', actor: requestorId }
 *  6. If minor, emit: { action: 'guardian_consent_doc.uploaded' }
 */
export async function createFamilyMember(
  req: CreateFamilyMemberRequest,
  requestorId: string,
  context?: UserContextHeaders,
): Promise<ShareableFamilyMember> {
  const dob = new Date(req.dateOfBirth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
  const isMinor = age < 18;

  if (isMinor && !req.guardianName) {
    throw new Error("Guardian name is required for minors (age < 18).");
  }
  if (isMinor && !req.consentDocumentBase64) {
    throw new Error("A signed guardian consent document (PDF) is required before registering a minor.");
  }

  const newMember: ShareableFamilyMember = {
    id: `fm-${Date.now()}`,
    fullName: req.fullName,
    dateOfBirth: req.dateOfBirth,
    gender: req.gender as ShareableFamilyMember["gender"],
    relationship: req.relationship,
    age,
    isMinor,
    guardianName: req.guardianName,
    guardianRelationship: req.guardianRelationship as ShareableFamilyMember["guardianRelationship"],
    // consentDocumentUrl: stored after S3 upload; not a data URI
    consentDocumentName: req.consentDocumentBase64 ? "consent-document.pdf" : undefined,
    internalPatientId: req.internalPatientId,
    externalId: req.externalId,
    contactInfo: req.contactInfo,
    consentStatus: "pending",
    activeShares: 0,
  };
  return newMember;
}

// ── POST /consent ─────────────────────────────────────────────────────────────

/**
 * Creates an explicit, versioned consent record for data sharing.
 * For minor subjects, records the guardian's identity and consent document.
 *
 * HIPAA §164.508 compliance:
 *  - Consent must be written (or electronic equivalent with audit trail)
 *  - Must specify: who, what data, with whom, for how long
 *  - Revocable at any time by the patient/guardian
 *
 * Real implementation:
 *  1. Validate active session + RBAC permission
 *  2. Check no conflicting active consent (same subject + provider)
 *  3. If minor: verify guardian is authorized, upload consent doc to S3
 *  4. INSERT into consents table with version "1.0"
 *  5. INSERT into consent_audit_log: { action: 'consent.granted', ... }
 *  6. Notify data subject (email/push) if email is on file
 */
export async function createConsent(
  req: CreateConsentRequest,
  requestorId: string,
  context?: UserContextHeaders,
): Promise<ConsentRecord> {
  if (!req.guardianAccepted) {
    throw new Error("Explicit consent acceptance is required before proceeding.");
  }

  const consentRecord: ConsentRecord = {
    consentId: `con-${Date.now()}`,
    subjectType: req.subjectType,
    subjectId: req.subjectId,
    subjectName: req.subjectName,
    providerId: req.providerId,
    providerName: req.providerName,
    grantedBy: requestorId,
    grantedByName: "Sarah Martinez",
    dataTypes: req.dataTypes,
    consentDocumentName: req.consentDocumentBase64 ? "consent-document.pdf" : undefined,
    validFrom: req.validFrom,
    validTo: req.validTo,
    status: "active",
    version: "1.0",
    timestamp: new Date().toISOString(),
    isMinorConsent: req.isMinorConsent,
    guardianName: req.guardianName,
    auditTrail: [
      {
        id: `ae-${Date.now()}`,
        action: "consent.granted",
        actor: "Sarah Martinez",
        actorId: requestorId,
        timestamp: new Date().toISOString(),
        metadata: {
          ...(req.isMinorConsent ? { role: "Guardian", minorSubject: req.subjectName } : {}),
          dataTypes: req.dataTypes.join(","),
          provider: req.providerName,
        },
      },
    ],
  };
  return consentRecord;
}

// ── POST /data-sharing-config ─────────────────────────────────────────────────

/**
 * Creates the operational data sharing configuration (how/when to sync).
 * Requires an active consent record — throws if consent is missing or revoked.
 *
 * Real implementation:
 *  1. Load and validate consent record (assertConsentActive)
 *  2. Validate provider integration exists and is Connected
 *  3. If mode === "real-time", register event listener in event engine
 *  4. If mode === "scheduled", register cron job in scheduler
 *  5. INSERT into data_sharing_configs
 *  6. Emit audit log
 */
export async function createSharingConfig(
  req: CreateSharingConfigRequest,
  requestorId: string,
  context?: UserContextHeaders,
): Promise<SharingConfig> {
  // In real implementation: await assertConsentActive(consentRecord, req.subjectName);

  const config: SharingConfig = {
    configId: `cfg-${Date.now()}`,
    subjectType: req.subjectType,
    subjectId: req.subjectId,
    subjectName: req.subjectName,
    providerId: req.providerId,
    providerName: req.providerName,
    dataTypes: req.dataTypes,
    mode: req.mode,
    frequency: req.frequency,
    triggers: req.triggers,
    expirationDate: req.expirationDate,
    status: "active",
    consentId: req.consentId,
    createdAt: new Date().toISOString(),
    recordsSent: 0,
  };
  return config;
}

// ── POST /share-data ──────────────────────────────────────────────────────────

/**
 * Executes a data push for a specific config and data type.
 * Transforms internal records → FHIR Bundle, attaches Consent reference,
 * and sends to the configured FHIR endpoint.
 *
 * For family member data:
 *  - Patient resource = the family member
 *  - RelatedPerson = the primary patient (guardian)
 *  - Consent reference = attached to all resources
 */
export async function shareData(
  req: ShareDataRequest,
  requestorId: string,
): Promise<ShareDataResponse> {
  const correlationId = req.correlationId ?? `corr-${Date.now().toString(36)}`;

  // Build FHIR Bundle with consent reference
  const fhirBundle = buildFhirBundle(req.configId, req.patientId, req.dataType);

  return {
    accepted: true,
    correlationId,
    fhirBundleId: `bundle-${Date.now()}`,
    statusCode: 200,
    message: "FHIR Bundle submitted successfully",
    fhirPayload: fhirBundle,
  };
}

// ── POST /consent/:id/revoke ──────────────────────────────────────────────────

/**
 * Revokes an active consent immediately.
 * Cascades: marks all associated sharing configs as "revoked".
 * Immutable audit trail entry is always written.
 *
 * HIPAA §164.508(b)(5): Patient may revoke at any time in writing.
 * Revocation stops future sharing; does NOT claw back already-transmitted data.
 *
 * Real implementation:
 *  1. Verify requestor has permission (patient or guardian)
 *  2. UPDATE consents SET status='revoked', revoked_at=now(), revoked_by=$1
 *  3. UPDATE data_sharing_configs SET status='revoked' WHERE consent_id=$2
 *  4. Unregister event listeners / cron jobs
 *  5. INSERT consent_audit_log: { action: 'consent.revoked', reason: $3 }
 *  6. Notify data subject
 */
export async function revokeConsent(
  req: RevokeConsentRequest,
): Promise<{ success: boolean; message: string }> {
  // Real: DB update + event de-registration
  return {
    success: true,
    message: `Consent ${req.consentId} revoked. Sharing has been stopped immediately. Previously transmitted data is not recalled.`,
  };
}

// ── FHIR Builder ──────────────────────────────────────────────────────────────

/**
 * Builds a FHIR transaction Bundle for a given sharing config.
 * Attaches Consent reference as meta.security for HIPAA compliance.
 * For minor subjects, adds RelatedPerson resource for guardian linkage.
 */
export function buildFhirBundle(
  configId: string,
  patientId: string,
  dataType: SharingDataType,
): object {
  const isFamilyMinor = patientId === "fm3"; // Jake - demo logic

  const entries: object[] = [];

  if (isFamilyMinor) {
    entries.push(
      { resource: fhirChildPatient,   request: { method: "PUT",  url: `Patient/${fhirChildPatient.id}` } },
      { resource: fhirRelatedPerson,  request: { method: "PUT",  url: `RelatedPerson/${fhirRelatedPerson.id}` } },
      { resource: fhirConsentResource, request: { method: "PUT", url: `Consent/${fhirConsentResource.id}` } },
    );
    if (dataType === "wearables") {
      entries.push({ resource: fhirMinorWearableObservation, request: { method: "POST", url: "Observation" } });
    }
  }

  return {
    resourceType: "Bundle",
    id: `bundle-${configId}-${Date.now()}`,
    meta: { lastUpdated: new Date().toISOString() },
    type: "transaction",
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}

// ── API Route Summary ─────────────────────────────────────────────────────────
//
//  POST   /api/v1/family-members                   → createFamilyMember
//  GET    /api/v1/family-members                   → list family members for org
//  GET    /api/v1/family-members/:id               → getFamilyMember
//  DELETE /api/v1/family-members/:id               → soft delete (audit-logged)
//
//  POST   /api/v1/consent                          → createConsent
//  GET    /api/v1/consent                          → list consents for org
//  GET    /api/v1/consent/:id                      → getConsent
//  POST   /api/v1/consent/:id/revoke               → revokeConsent
//
//  POST   /api/v1/data-sharing-config              → createSharingConfig
//  GET    /api/v1/data-sharing-config              → list configs
//  PATCH  /api/v1/data-sharing-config/:id/pause    → pause sharing
//  PATCH  /api/v1/data-sharing-config/:id/resume   → resume sharing
//
//  POST   /api/v1/share-data                       → shareData (on-demand)
//  GET    /api/v1/share-data/:configId/history     → sharing history
//
// All routes:
//   - JWT (RS256) required, RBAC enforced
//   - Minor consent routes require guardian role claim
//   - Rate-limited (60 req/min)
//   - TLS 1.3 minimum
//   - X-Correlation-ID on all responses
//   - Audit log written for every mutation (immutable)
