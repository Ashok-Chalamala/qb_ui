// ─────────────────────────────────────────────────────────────────────────────
// Integration Hub — Backend API Service Layer
// Node.js / TypeScript service structure for healthcare interoperability
//
// SECURITY: All secrets encrypted at rest (AES-256-GCM).
//           HTTPS enforced. OAuth 2.0 scoped. mTLS supported.
//           HIPAA audit logs immutable. RBAC enforced.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Integration,
  DataType,
  DataMapping,
} from "@/lib/integration-data";
import {
  mockIntegrations,
  sampleFhirPatient,
  sampleFhirGlucoseObservation,
} from "@/lib/integration-data";
import type { UserContextHeaders } from "@/lib/user-context";

// ── Request / Response Types ───────────────────────────────────────────────────

export interface CreateIntegrationRequest {
  name: string;
  provider: string;
  environment: "sandbox" | "production";
  baseUrl: string;
  apiVersion: string;
  webhookUrl?: string;
  authType: "oauth2" | "api-key" | "mtls";
  oauth2?: {
    flow: "client_credentials" | "authorization_code";
    clientId: string;
    clientSecret: string;  // Encrypted before storage; never logged
    tokenUrl: string;
    authorizationUrl?: string;
    scopes: string[];
  };
  apiKey?: {
    key: string;           // Hashed before storage (SHA-256)
    headerName: string;
  };
  mtls?: {
    publicKeyPem: string;  // Stored in HSM / Vault
    certificatePem: string;
    privateKeyPem: string; // Stored in HSM / Vault; never leaves server
  };
  dataTypes: DataType[];
  syncFrequency: "real-time" | "scheduled" | "event-based";
  cronExpression?: string;
  triggers?: string[];
  mappings: Omit<DataMapping, "id">[];
  ipWhitelist?: string[];
}

export interface UpdateIntegrationRequest extends Partial<CreateIntegrationRequest> {
  id: string;
}

export interface TestConnectionRequest {
  integrationId: string;
  sendSampleData?: boolean;
}

export interface TestConnectionResponse {
  success: boolean;
  latency: number;
  statusCode: number;
  message: string;
  sampleRequest?: object;
  sampleResponse?: object;
  errorDetail?: string;
}

export interface SendDataRequest {
  integrationId: string;
  dataType: DataType;
  patientId: string;
  payload: object;           // FHIR resource or bundle
  correlationId?: string;
}

export interface SendDataResponse {
  accepted: boolean;
  correlationId: string;
  fhirResourceId?: string;
  statusCode: number;
  message: string;
  retriesUsed: number;
}

export interface OAuthTokenResponse {
  accessToken: string;       // Encrypted before caching
  tokenType: "Bearer";
  expiresIn: number;
  scope: string;
  refreshToken?: string;     // Encrypted before storage
}

export interface IntegrationListResponse {
  items: Integration[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Configuration & Constants ────────────────────────────────────────────────

export const API_CONFIG = {
  VERSION: "v1",
  BASE_PATH: "/api/v1/integrations",
  RETRY: {
    maxAttempts: 3,
    initialDelayMs: 500,
    backoffMultiplier: 2,
    maxDelayMs: 10_000,
    retryableStatusCodes: [408, 429, 502, 503, 504],
  },
  RATE_LIMIT: {
    windowMs: 60_000,
    maxRequests: 100,
    perIntegration: 30,
  },
  TIMEOUT: {
    connectMs: 5_000,
    readMs: 30_000,
    writeMs: 15_000,
  },
  ENCRYPTION: {
    algorithm: "AES-256-GCM",
    keyDerivation: "PBKDF2-SHA256",
    saltBytes: 32,
    iterations: 600_000,
  },
} as const;

// ── Mock Service Implementations (frontend demo layer) ────────────────────────
// In production these would be Express / Fastify route handlers calling
// PostgreSQL, Redis, AWS KMS, and external FHIR APIs.

/**
 * GET /api/v1/integrations
 *
 * Returns paginated list of all configured integrations for the authenticated
 * organization. Filters by provider, status, environment.
 * RBAC: requires integration:read scope.
 *
 * Context filtering (backend SQL):
 *   IF X-User-Context-Type = "SELF":
 *     SELECT * FROM integrations
 *     WHERE patient_id = $userId
 *        OR family_member_id IN (SELECT id FROM family_members WHERE patient_id = $userId)
 *
 *   IF X-User-Context-Type = "FAMILY":
 *     SELECT i.* FROM integrations i
 *     JOIN data_sharing_configs d ON d.provider_id = i.id
 *     WHERE d.subject_id = $X_Subject_Id
 *       AND d.status != 'revoked'
 */
export async function listIntegrations(
  opts?: {
    page?: number;
    pageSize?: number;
    status?: string;
    provider?: string;
  },
  context?: UserContextHeaders,
): Promise<IntegrationListResponse> {
  // Real implementation appends context headers to fetch():
  //   fetch(`${BASE}/integrations`, { headers: { ...context, Authorization: `Bearer ${token}` } })
  // Backend enforces row-level filtering based on X-User-Context-Type + X-Subject-Id.
  let items = [...mockIntegrations];
  if (opts?.status)   items = items.filter((i) => i.status === opts.status);
  if (opts?.provider) items = items.filter((i) => i.provider === opts.provider);
  return { items, total: items.length, page: opts?.page ?? 0, pageSize: opts?.pageSize ?? 20 };
}

/**
 * GET /api/v1/integrations/:id
 */
export async function getIntegration(
  id: string,
  context?: UserContextHeaders,
): Promise<Integration | null> {
  // Real: SELECT * FROM integrations WHERE id=$id AND subject_id=$X_Subject_Id
  return mockIntegrations.find((i) => i.id === id) ?? null;
}

/**
 * POST /api/v1/integrations
 *
 * Creates a new integration config. Secrets are encrypted before storage.
 * Emits an audit log entry.
 * RBAC: requires integration:write scope.
 */
export async function createIntegration(
  req: CreateIntegrationRequest,
  actorUserId: string,
): Promise<Integration> {
  // Real implementation:
  //   1. Validate input (Zod schema)
  //   2. Encrypt credentials: encryptAES256GCM(req.oauth2.clientSecret, kmsKey)
  //   3. Hash API key: sha256(req.apiKey.key)
  //   4. Store mTLS private key in Vault / HSM (never in DB)
  //   5. INSERT into integrations + integration_credentials tables
  //   6. Emit audit log: { action: 'integration.create', actor: actorUserId, ... }
  //   7. Schedule initial connection test
  const newIntegration: Integration = {
    id: `int-${Date.now()}`,
    name: req.name,
    provider: req.provider as any,
    environment: req.environment,
    status: "Pending",
    lastSync: null,
    dataTypes: req.dataTypes,
    authType: req.authType,
    baseUrl: req.baseUrl,
    apiVersion: req.apiVersion,
    webhookUrl: req.webhookUrl,
    syncSchedule: { frequency: req.syncFrequency, cronExpression: req.cronExpression, triggers: (req.triggers as any) ?? [] },
    mappings: req.mappings.map((m, i) => ({ ...m, id: `m-new-${i}` })),
    syncHistory: [],
    totalSyncCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: actorUserId,
    ipWhitelist: req.ipWhitelist,
  };
  return newIntegration;
}

/**
 * PUT /api/v1/integrations/:id
 * RBAC: requires integration:write scope.
 */
export async function updateIntegration(
  req: UpdateIntegrationRequest,
  actorUserId: string,
): Promise<Integration> {
  const existing = await getIntegration(req.id);
  if (!existing) throw new Error(`Integration ${req.id} not found`);
  // Real: UPDATE integrations SET ... WHERE id=$1 AND org_id=$2
  return { ...existing, ...req, updatedAt: new Date().toISOString() };
}

/**
 * DELETE /api/v1/integrations/:id
 * Soft-delete; retains audit trail.
 * RBAC: requires integration:delete scope.
 */
export async function deleteIntegration(id: string, actorUserId: string): Promise<void> {
  // Real: UPDATE integrations SET deleted_at=now() WHERE id=$1
  // Credentials purged from Vault. Audit log retained per HIPAA 7-year rule.
  console.info(`[AUDIT] integration.delete actor=${actorUserId} integration=${id}`);
}

/**
 * POST /api/v1/integrations/:id/test
 *
 * Performs a live connectivity check against the configured endpoint.
 * Sends a sample FHIR Bundle if sendSampleData=true.
 */
export async function testConnection(
  req: TestConnectionRequest,
): Promise<TestConnectionResponse> {
  // Real implementation:
  //   1. Retrieve integration config from DB
  //   2. Fetch OAuth2 token (client_credentials flow) or read API key
  //   3. Send GET /metadata (CapabilityStatement) to FHIR endpoint
  //   4. Optionally POST a sample Bundle
  //   5. Return request/response for UI display
  const integration = await getIntegration(req.integrationId);
  if (!integration) return { success: false, latency: 0, statusCode: 404, message: "Integration not found" };

  // Simulate network call
  const latency = Math.floor(Math.random() * 300) + 150;
  const success = integration.status !== "Error";

  return {
    success,
    latency,
    statusCode: success ? 200 : 401,
    message: success ? `Successfully connected to ${integration.provider}` : "Authentication failed",
    sampleRequest: req.sendSampleData ? {
      method: "POST",
      url: `${integration.baseUrl}/Bundle`,
      headers: { Authorization: "Bearer [TOKEN_REDACTED]", "Content-Type": "application/fhir+json" },
      body: {
        resourceType: "Bundle",
        type: "transaction",
        entry: [
          { resource: sampleFhirPatient, request: { method: "PUT", url: "Patient/patient-00429" } },
          { resource: sampleFhirGlucoseObservation, request: { method: "POST", url: "Observation" } },
        ],
      },    } : undefined,
    sampleResponse: success && req.sendSampleData ? {
      resourceType: "Bundle",
      type: "transaction-response",
      entry: [
        { response: { status: "200 OK", location: "Patient/patient-00429/_history/1" } },
        { response: { status: "201 Created", location: "Observation/obs-glucose-00429-001/_history/1" } },
      ],
    } : undefined,
    errorDetail: !success ? "OAuth2 token request returned HTTP 401. Verify Client ID and Secret in credentials." : undefined,
  };
}

/**
 * POST /api/v1/integrations/:id/send
 *
 * Sends patient data to the configured endpoint as a FHIR Bundle.
 * Includes retry logic with exponential backoff.
 * Writes immutable audit log entry.
 *
 * Context: subject_id in the request payload is validated against
 * X-Subject-Id header to prevent cross-patient data leakage.
 */
export async function sendData(
  req: SendDataRequest,
  context?: UserContextHeaders,
): Promise<SendDataResponse> {
  // Real implementation:
  //   1. Load integration config + credentials
  //   2. Transform internal data model → FHIR resource via mapping config
  //   3. Acquire OAuth2 access token (cache in Redis; refresh if expired)
  //   4. POST to FHIR endpoint with retry logic
  //   5. Write audit log with correlation ID
  const correlationId = req.correlationId ?? `corr-${Date.now().toString(36)}`;
  return {
    accepted: true,
    correlationId,
    fhirResourceId: `obs-${Date.now()}`,
    statusCode: 201,
    message: "Resource created successfully",
    retriesUsed: 0,
  };
}

// ── OAuth 2.0 Token Management ────────────────────────────────────────────────

/**
 * Acquires an OAuth2 access token using client_credentials flow.
 * Token is cached in Redis (encrypted). Never logged.
 *
 * Security:
 *  - Client secret decrypted from KMS on-demand
 *  - Access token encrypted before Redis storage
 *  - Token never written to application logs
 */
export async function acquireOAuthToken(integrationId: string): Promise<OAuthTokenResponse> {
  // Real:
  //   const creds = await vault.getIntegrationCredentials(integrationId);
  //   const cached = await redis.get(`token:${integrationId}`);
  //   if (cached && !isExpired(cached)) return decryptToken(cached);
  //   const resp = await fetch(creds.tokenUrl, {
  //     method: 'POST',
  //     body: new URLSearchParams({ grant_type: 'client_credentials',
  //       client_id: creds.clientId, client_secret: decrypt(creds.clientSecretEnc),
  //       scope: creds.scopes.join(' ') }),
  //   });
  //   const token = await resp.json();
  //   await redis.setex(`token:${integrationId}`, token.expires_in - 60, encrypt(token.access_token));
  //   await auditLog.write({ action: 'token.acquired', integrationId });
  //   return token;
  return {
    accessToken: "[TOKEN_REDACTED_IN_DEMO]",
    tokenType: "Bearer",
    expiresIn: 3600,
    scope: "patient/Patient.read patient/Observation.read",
  };
}

// ── FHIR Data Transformation ─────────────────────────────────────────────────

/**
 * Transforms internal wearable data → FHIR Observation resource.
 * Applies field mappings defined in the integration config.
 */
export function transformWearableToFhir(wearableData: {
  patientId: string;
  heartRate?: number;
  steps?: number;
  sleepHours?: number;
  recordedAt: string;
  deviceId: string;
}) {
  return {
    resourceType: "Observation",
    status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "activity" }] }],
    code: { coding: [{ system: "http://loinc.org", code: "55421-2", display: "Wearable Vitals Panel" }] },
    subject: { reference: `Patient/${wearableData.patientId}` },
    effectiveDateTime: wearableData.recordedAt,
    device: { reference: `Device/${wearableData.deviceId}` },
    component: [
      ...(wearableData.heartRate !== undefined ? [{
        code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
        valueQuantity: { value: wearableData.heartRate, unit: "beats/min", system: "http://unitsofmeasure.org", code: "/min" },
      }] : []),
      ...(wearableData.steps !== undefined ? [{
        code: { coding: [{ system: "http://loinc.org", code: "55423-8", display: "Number of steps" }] },
        valueQuantity: { value: wearableData.steps, unit: "steps", system: "http://unitsofmeasure.org", code: "steps" },
      }] : []),
      ...(wearableData.sleepHours !== undefined ? [{
        code: { coding: [{ system: "http://loinc.org", code: "93832-4", display: "Sleep duration" }] },
        valueQuantity: { value: wearableData.sleepHours, unit: "h", system: "http://unitsofmeasure.org", code: "h" },
      }] : []),
    ],
  };
}

// ── Retry Logic ───────────────────────────────────────────────────────────────

/**
 * Executes an async operation with exponential backoff and jitter.
 * Retries only on transient HTTP errors (408, 429, 502-504).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts = API_CONFIG.RETRY,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.statusCode ?? err?.response?.status;
      if (!opts.retryableStatusCodes.includes(statusCode)) throw err;
      const jitter = Math.random() * 200;
      const delay = Math.min(opts.initialDelayMs * (opts.backoffMultiplier ** attempt) + jitter, opts.maxDelayMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ── Audit Logging (HIPAA §164.312(b)) ────────────────────────────────────────

export function emitAuditLog(entry: {
  action: string;
  actorUserId: string;
  integrationId?: string;
  patientId?: string;
  subjectType?: "SELF" | "FAMILY";
  subjectId?: string;
  statusCode?: number;
  correlationId: string;
  metadata?: Record<string, unknown>;
  context?: UserContextHeaders;
}): void {
  // Real: write to immutable audit log DB table + SIEM stream
  // Never include PHI in action/metadata fields — use patient IDs only
  const sanitized = {
    timestamp: new Date().toISOString(),
    level: "AUDIT",
    ...entry,
    metadata: entry.metadata ? sanitizeForLog(entry.metadata) : undefined,
  };
  console.info("[HIPAA-AUDIT]", JSON.stringify(sanitized));
}

function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const REDACTED_KEYS = ["clientSecret", "apiKey", "accessToken", "refreshToken", "privateKey", "password"];
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      REDACTED_KEYS.some((r) => k.toLowerCase().includes(r.toLowerCase())) ? [k, "[REDACTED]"] : [k, v]
    )
  );
}

// ── API Route Contracts (Express-style pseudo-routes for documentation) ────────
//
//  POST   /api/v1/integrations              → createIntegration
//  GET    /api/v1/integrations              → listIntegrations
//  GET    /api/v1/integrations/:id          → getIntegration
//  PUT    /api/v1/integrations/:id          → updateIntegration
//  DELETE /api/v1/integrations/:id          → deleteIntegration (soft)
//  POST   /api/v1/integrations/:id/test     → testConnection
//  POST   /api/v1/integrations/:id/send     → sendData
//  GET    /api/v1/integrations/:id/logs     → (paginated API audit log)
//  POST   /api/v1/integrations/:id/enable   → re-enable disabled integration
//  POST   /api/v1/integrations/:id/disable  → disable integration (audit-logged)
//
//  POST   /api/v1/auth/token               → acquireOAuthToken (internal)
//  POST   /api/v1/keys/rotate              → rotate API key / certificate
//
// All routes:
//   - Require valid JWT (RS256) in Authorization header
//   - Enforce RBAC via middleware (integration:read / integration:write / integration:delete)
//   - Rate limited (100 req/min per org)
//   - Responses include X-Correlation-ID header
//   - TLS 1.3 minimum; mTLS supported for server-to-server
//   - Versioning: /api/v1/... → /api/v2/... with deprecation headers
