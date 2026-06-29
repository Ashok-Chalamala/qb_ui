// ─────────────────────────────────────────────────────────────────────────────
// Patient Provider Connection — Backend API Service Layer
//
// DESIGN PRINCIPLE:
//   Patients connect to providers using only:
//     1. Provider name (selected from admin-configured list)
//     2. Their registered email / phone number
//     3. A 6-digit OTP sent to that contact
//
//   They NEVER enter: FHIR URLs, Client IDs, secrets, certs, or IP addresses.
//   All technical config is pulled from AdminProvider records.
//
// OTP Flow:
//   1. POST /connect/request-otp  → generate OTP, send via email/SMS
//   2. POST /connect/verify-otp   → validate OTP, issue session token
//   3. POST /connect/link          → link patient ↔ provider using session token
//   4. POST /connect/consent       → record consent
//   5. (backend) use AdminProvider config to authenticate with Epic/Cerner
//
// ─────────────────────────────────────────────────────────────────────────────

import {
  mockAdminProviders,
  mockPatientLinks,
  type AdminProvider,
  type PatientProviderLink,
  type OtpSession,
  type OtpChannel,
  type PatientLinkStatus,
} from "@/lib/admin-data";
import type { SharingDataType } from "@/lib/consent-data";

// ── Request / Response types ──────────────────────────────────────────────────

export interface RequestOtpRequest {
  contact: string;        // email address or phone number
  channel: OtpChannel;   // "email" | "sms"
  providerId: string;     // which provider the patient is connecting to
  subjectId: string;      // patient-00429 | fm1 | fm2 | fm3
}

export interface RequestOtpResponse {
  sessionId: string;
  maskedContact: string;  // "s***@example.com" | "+1 *** ***-4321"
  expiresInSeconds: number;
  channel: OtpChannel;
}

export interface VerifyOtpRequest {
  sessionId: string;
  otp: string;            // 6-digit code
  contact: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
  sessionToken: string;   // short-lived JWT; used in next step
  message: string;
}

export interface ConnectProviderRequest {
  subjectId: string;
  subjectName: string;
  subjectType: "SELF" | "FAMILY";
  providerId: string;
  dataTypes: SharingDataType[];
  sessionToken: string;   // from verifyOtp
  consentGiven: boolean;
  consentSignature: string;
}

export interface ConnectProviderResponse {
  linkId: string;
  providerName: string;
  status: PatientLinkStatus;
  dataTypes: string[];
  connectedAt: string;
  message: string;
}

export interface DisconnectProviderRequest {
  linkId: string;
  subjectId: string;
  reason?: string;
}

export interface PatientLinksResponse {
  items: PatientProviderLink[];
  total: number;
}

// ── In-memory OTP session store (demo) ───────────────────────────────────────
// Real implementation: Redis with TTL + bcrypt hash of OTP (never plaintext)

const otpSessionStore = new Map<string, OtpSession & { otpHash: string }>();

// Demo mode: any 6-digit code is accepted, OR use hardcoded "123456"
const DEMO_VALID_OTP = "123456";
const OTP_TTL_SECONDS = 300; // 5 minutes

// ── POST /connect/request-otp ────────────────────────────────────────────────

/**
 * Generates a 6-digit OTP and sends it to the patient's email or phone.
 *
 * Real implementation:
 *  1. Rate-limit by (subjectId, providerId) — max 3 attempts / 15 min
 *  2. Generate crypto-secure 6-digit OTP: crypto.randomInt(100000, 999999).toString()
 *  3. Hash with bcrypt: await bcrypt.hash(otp, 10)
 *  4. Store session: { sessionId, otpHash, contact, channel, expiresAt } in Redis (TTL = 5 min)
 *  5. Send via email (SES) or SMS (Twilio/SNS)
 *  6. Return masked contact + sessionId
 */
export async function requestOtp(req: RequestOtpRequest): Promise<RequestOtpResponse> {
  const sessionId = `otp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  // In demo: store "123456" as the valid OTP
  const session: OtpSession & { otpHash: string } = {
    sessionId,
    contact: req.contact,
    channel: req.channel,
    issuedAt: new Date().toISOString(),
    expiresAt,
    verified: false,
    attempts: 0,
    otpHash: DEMO_VALID_OTP, // Real: bcrypt.hash(otp, 10)
  };
  otpSessionStore.set(sessionId, session);

  // Mask contact
  const maskedContact = req.channel === "email"
    ? req.contact.replace(/(.{1}).+(@.+)/, "$1***$2")
    : req.contact.replace(/(\+\d{1,3})\s?\d+(\d{4})/, "$1 *** ***-$2");

  console.info(`[OTP-DEMO] Code for session ${sessionId}: ${DEMO_VALID_OTP} (sent to ${maskedContact})`);

  return {
    sessionId,
    maskedContact,
    expiresInSeconds: OTP_TTL_SECONDS,
    channel: req.channel,
  };
}

// ── POST /connect/verify-otp ──────────────────────────────────────────────────

/**
 * Validates the 6-digit OTP entered by the patient.
 *
 * Real implementation:
 *  1. Load session from Redis; check TTL
 *  2. Verify OTP: await bcrypt.compare(req.otp, session.otpHash)
 *  3. Increment attempt counter; lock out after 5 failures
 *  4. On success: issue short-lived signed JWT (15 min TTL)
 *     { sub: contact, sessionId, exp: ... }
 *  5. Mark session as verified; delete from Redis
 */
export async function verifyOtp(req: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  const session = otpSessionStore.get(req.sessionId);

  if (!session) {
    return { verified: false, sessionToken: "", message: "Session expired or not found. Please request a new OTP." };
  }

  if (new Date(session.expiresAt) < new Date()) {
    otpSessionStore.delete(req.sessionId);
    return { verified: false, sessionToken: "", message: "OTP expired. Please request a new code." };
  }

  session.attempts++;

  // Demo: accept DEMO_VALID_OTP OR any 6-digit numeric code
  const isValid = req.otp === session.otpHash || /^\d{6}$/.test(req.otp);

  if (!isValid) {
    const remaining = Math.max(0, 5 - session.attempts);
    return {
      verified: false,
      sessionToken: "",
      message: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
        : "Too many incorrect attempts. Please request a new OTP.",
    };
  }

  session.verified = true;
  const sessionToken = `demo-verified-${req.sessionId}-${Date.now()}`;
  otpSessionStore.delete(req.sessionId);

  return { verified: true, sessionToken, message: "Identity verified successfully." };
}

// ── POST /connect/link ────────────────────────────────────────────────────────

/**
 * Creates a patient ↔ provider link using the admin-configured provider settings.
 * Patients never provide technical details — all config is loaded from AdminProvider.
 *
 * Real implementation:
 *  1. Validate sessionToken JWT (verify signature, check exp)
 *  2. Load AdminProvider config from DB
 *  3. If authType = oauth2: initiate client_credentials or authorization_code flow
 *     using admin-stored clientId + clientSecret (decrypted from KMS)
 *  4. If authType = api-key: use admin-stored hashed key to generate auth header
 *  5. If authType = mtls: load cert from Vault
 *  6. Store PatientProviderLink with encrypted authReference
 *  7. Create ConsentRecord (HIPAA §164.508)
 *  8. Emit audit log
 *
 * SQL:
 *   INSERT INTO patient_provider_links
 *     (link_id, subject_id, subject_type, provider_id, data_types, status, consent_id)
 *   VALUES (...)
 */
export async function connectProvider(
  req: ConnectProviderRequest,
): Promise<ConnectProviderResponse> {
  if (!req.consentGiven) {
    throw new Error("Consent is required before connecting a provider.");
  }
  if (!req.sessionToken || !req.sessionToken.startsWith("demo-verified-")) {
    throw new Error("OTP verification required before connecting.");
  }

  const provider = mockAdminProviders.find((p) => p.id === req.providerId);
  if (!provider) throw new Error("Provider not found.");
  if (provider.status !== "active") {
    throw new Error(`Provider ${provider.displayName} is not currently active.`);
  }

  const linkId = `lnk-${Date.now()}`;
  const now = new Date().toISOString();

  const link: PatientProviderLink = {
    linkId,
    subjectId: req.subjectId,
    subjectName: req.subjectName,
    subjectType: req.subjectType,
    providerId: req.providerId,
    providerName: provider.displayName,
    providerType: provider.providerType,
    status: "connected",
    dataTypes: req.dataTypes,
    connectedAt: now,
    otpVerified: true,
    consentId: `con-${Date.now()}`,
    authReference: `[ENCRYPTED-TOKEN-REF-${linkId}]`, // Real: AES-256-GCM encrypted FHIR token ref
  };

  // Real: db.insert("patient_provider_links", link) + auditLog.write(...)
  emitPatientAuditLog({
    action: "patient.provider.connected",
    subjectId: req.subjectId,
    providerId: req.providerId,
    metadata: { linkId, dataTypes: req.dataTypes.join(",") },
  });

  return {
    linkId: link.linkId,
    providerName: provider.displayName,
    status: "connected",
    dataTypes: req.dataTypes,
    connectedAt: now,
    message: `${provider.displayName} connected successfully. Your health data will begin syncing shortly.`,
  };
}

// ── DELETE /connect/links/:linkId ─────────────────────────────────────────────

export async function disconnectProvider(req: DisconnectProviderRequest): Promise<void> {
  // Real: UPDATE patient_provider_links SET status='disconnected', disconnected_at=NOW()
  //       Revoke OAuth token at provider
  //       Revoke consent record
  //       Emit audit log
  emitPatientAuditLog({
    action: "patient.provider.disconnected",
    subjectId: req.subjectId,
    providerId: req.linkId,
    metadata: { reason: req.reason ?? "user_initiated" },
  });
}

// ── GET /connect/links?subjectId=... ─────────────────────────────────────────

/**
 * Returns all active provider links for a patient/family member.
 *
 * SQL (SELF context):
 *   SELECT * FROM patient_provider_links
 *   WHERE subject_id = $userId OR subject_id IN (linked family members)
 *
 * SQL (FAMILY context):
 *   SELECT * FROM patient_provider_links
 *   WHERE subject_id = $familyMemberId
 */
export async function listPatientLinks(
  subjectId: string,
  contextType: "SELF" | "FAMILY" = "SELF",
): Promise<PatientLinksResponse> {
  let items: PatientProviderLink[];
  if (contextType === "SELF") {
    items = mockPatientLinks; // Show primary patient's links (demo)
  } else {
    items = mockPatientLinks.filter((l) => l.subjectId === subjectId);
  }
  return { items, total: items.length };
}

// ── POST /connect/links/:linkId/sync ─────────────────────────────────────────

export async function triggerManualSync(linkId: string, subjectId: string): Promise<{ queued: boolean; message: string }> {
  emitPatientAuditLog({ action: "patient.provider.manual_sync", subjectId, providerId: linkId });
  return { queued: true, message: "Sync queued. Data will update within 2–5 minutes." };
}

// ── Audit Logging ─────────────────────────────────────────────────────────────

function emitPatientAuditLog(entry: {
  action: string;
  subjectId: string;
  providerId: string;
  metadata?: Record<string, unknown>;
}): void {
  console.info("[PATIENT-CONNECT-AUDIT]", JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "AUDIT",
    ...entry,
  }));
}

// ── API Route contracts ────────────────────────────────────────────────────────
//
//  POST  /api/v1/connect/request-otp     → requestOtp
//  POST  /api/v1/connect/verify-otp      → verifyOtp
//  POST  /api/v1/connect/link            → connectProvider
//  DELETE /api/v1/connect/links/:linkId  → disconnectProvider
//  GET   /api/v1/connect/links           → listPatientLinks
//  POST  /api/v1/connect/links/:id/sync  → triggerManualSync
//
// Example EPIC connection flow (backend):
//   1. Admin has stored: clientId, encrypted(clientSecret), tokenUrl, scopes
//   2. Patient connects → backend decrypts clientSecret from KMS
//   3. POST tokenUrl with client_credentials → receives access_token
//   4. Encrypts access_token → stores as authReference in patient_provider_links
//   5. All future FHIR calls use: Authorization: Bearer decrypt(authReference)
