// ─────────────────────────────────────────────────────────────────────────────
// Admin Integration Management — Backend API Service Layer
//
// RBAC: All functions require "admin" role.
//       Patient-facing functions are in patient-connect.functions.ts.
//
// Security:
//   - Client secrets encrypted with AES-256-GCM before storage
//   - Private keys stored in HSM / Vault (never in DB)
//   - API keys hashed (SHA-256) before DB storage
//   - All mutations emit immutable HIPAA audit log entries
// ─────────────────────────────────────────────────────────────────────────────

import {
  mockAdminProviders,
  integrationTemplates,
  mockCertificates,
  mockAdminMappings,
  type AdminProvider,
  type IntegrationTemplate,
  type SecurityCertificate,
  type AdminDataMapping,
  type AddProviderForm,
  type AdminProviderStatus,
} from "@/lib/admin-data";

// ── Request / Response types ──────────────────────────────────────────────────

export interface AdminProviderListResponse {
  items: AdminProvider[];
  total: number;
}

export interface CreateProviderRequest {
  form: AddProviderForm;
  actorUserId: string;
}

export interface UpdateProviderRequest {
  id: string;
  patch: Partial<AddProviderForm>;
  actorUserId: string;
}

export interface UploadCertRequest {
  providerId: string;
  keyType: SecurityCertificate["keyType"];
  fileBase64: string;          // sent over TLS; stored in Vault / HSM
  fileMimeType: string;
  expiresAt?: string;
  notes?: string;
  actorUserId: string;
}

export interface TestProviderConnectionResponse {
  success: boolean;
  latencyMs: number;
  statusCode: number;
  message: string;
  fhirCapabilityStatement?: { resourceType: string; fhirVersion: string; format: string[] };
  errorDetail?: string;
}

export interface ProviderStatsResponse {
  connectedPatients: number;
  totalSyncsToday: number;
  avgLatencyMs: number;
  errorRate: number;
  lastSuccessfulSync: string | null;
}

// ── GET /admin/providers ──────────────────────────────────────────────────────

/**
 * Returns all admin-configured providers.
 * RBAC: admin:providers:read
 *
 * SQL:
 *   SELECT * FROM admin_providers
 *   ORDER BY created_at DESC
 */
export async function listAdminProviders(opts?: {
  status?: AdminProviderStatus;
  type?: string;
}): Promise<AdminProviderListResponse> {
  let items = [...mockAdminProviders];
  if (opts?.status) items = items.filter((p) => p.status === opts.status);
  if (opts?.type)   items = items.filter((p) => p.providerType === opts.type);
  return { items, total: items.length };
}

// ── GET /admin/providers/:id ──────────────────────────────────────────────────

export async function getAdminProvider(id: string): Promise<AdminProvider | null> {
  return mockAdminProviders.find((p) => p.id === id) ?? null;
}

// ── POST /admin/providers ─────────────────────────────────────────────────────

/**
 * Creates a new provider configuration.
 *
 * Security steps (real implementation):
 *  1. Validate form with Zod schema
 *  2. Encrypt clientSecret: await kms.encrypt(form.clientSecret, providerKeyAlias)
 *  3. Hash API key: sha256(form.apiKey) — store hash only
 *  4. Store mTLS private key in Vault (never in DB): await vault.put(`pki/providers/${id}`, privateKey)
 *  5. INSERT into admin_providers + admin_provider_credentials
 *  6. Emit audit: { action: "admin.provider.created", actor: actorUserId }
 */
export async function createAdminProvider(req: CreateProviderRequest): Promise<AdminProvider> {
  const { form, actorUserId } = req;

  const scopeList = form.scopes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const newProvider: AdminProvider = {
    id: `ap-${Date.now()}`,
    name: form.displayName.toLowerCase().replace(/\s+/g, "-"),
    displayName: form.displayName,
    description: form.description,
    logoInitials: form.displayName.slice(0, 2).toUpperCase(),
    logoColor: "bg-teal-soft text-teal",
    providerType: form.providerType,
    fhirEndpoint: form.fhirEndpoint,
    apiVersion: form.apiVersion,
    webhookUrl: form.webhookUrl || undefined,
    environment: form.environment,
    status: "pending",
    authType: form.authType,
    oauth2: form.authType === "oauth2" ? {
      clientId: form.clientId,
      tokenUrl: form.tokenUrl,
      authorizationUrl: form.authorizationUrl || undefined,
      scopes: scopeList,
    } : undefined,
    apiKey: form.authType === "api-key" ? {
      keyId: `key-${Date.now()}`,
      headerName: form.apiKeyHeader,
    } : undefined,
    ipWhitelist: form.ipWhitelist
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    supportedDataTypes: form.supportedDataTypes,
    templateId: form.templateId || undefined,
    connectedPatients: 0,
    supportsOtp: form.supportsOtp,
    supportsOAuth: form.supportsOAuth,
    otpContactMethods: form.otpContactMethods,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: actorUserId,
  };

  // Real: await db.insert("admin_providers", newProvider); await auditLog.write(...)
  emitAdminAuditLog({ action: "admin.provider.created", actorUserId, providerId: newProvider.id });
  return newProvider;
}

// ── PUT /admin/providers/:id ──────────────────────────────────────────────────

export async function updateAdminProvider(req: UpdateProviderRequest): Promise<AdminProvider> {
  const base = mockAdminProviders.find((p) => p.id === req.id);
  if (!base) throw new Error(`Provider ${req.id} not found`);
  const updated: AdminProvider = { ...base, updatedAt: new Date().toISOString() };
  emitAdminAuditLog({ action: "admin.provider.updated", actorUserId: req.actorUserId, providerId: req.id });
  return updated;
}

// ── DELETE /admin/providers/:id ───────────────────────────────────────────────

export async function deleteAdminProvider(id: string, actorUserId: string): Promise<void> {
  // Real: soft-delete (set status = "inactive"), revoke all patient links, audit log
  emitAdminAuditLog({ action: "admin.provider.deleted", actorUserId, providerId: id });
}

// ── POST /admin/providers/:id/status ─────────────────────────────────────────

export async function setProviderStatus(
  id: string,
  status: AdminProviderStatus,
  actorUserId: string,
): Promise<void> {
  emitAdminAuditLog({ action: `admin.provider.status_changed.${status}`, actorUserId, providerId: id });
}

// ── POST /admin/providers/:id/test ────────────────────────────────────────────

/**
 * Tests connectivity to the configured FHIR endpoint.
 * Real: fetches /metadata (CapabilityStatement) with auth headers.
 */
export async function testAdminProviderConnection(
  id: string,
): Promise<TestProviderConnectionResponse> {
  const provider = mockAdminProviders.find((p) => p.id === id);
  if (!provider) throw new Error("Provider not found");

  const isActive = provider.status === "active";
  return {
    success: isActive,
    latencyMs: isActive ? 212 : 5000,
    statusCode: isActive ? 200 : 503,
    message: isActive
      ? `Successfully connected to ${provider.displayName}. CapabilityStatement retrieved.`
      : `Connection timeout reaching ${provider.fhirEndpoint}`,
    fhirCapabilityStatement: isActive
      ? { resourceType: "CapabilityStatement", fhirVersion: provider.apiVersion, format: ["json", "xml"] }
      : undefined,
    errorDetail: !isActive ? "TCP connection timed out. Check IP whitelist or provider downtime." : undefined,
  };
}

// ── POST /admin/security/certificates ────────────────────────────────────────

/**
 * Uploads a TLS certificate or API key for a provider.
 *
 * Real implementation:
 *  - If keyType = "private-key": store in Vault/HSM — never in DB
 *  - If keyType = "tls-cert" / "public-key": store fingerprint + metadata in DB
 *  - Emit audit log
 */
export async function uploadCertificate(req: UploadCertRequest): Promise<SecurityCertificate> {
  const provider = mockAdminProviders.find((p) => p.id === req.providerId);
  const cert: SecurityCertificate = {
    id: `cert-${Date.now()}`,
    providerId: req.providerId,
    providerName: provider?.displayName ?? "Unknown",
    keyType: req.keyType,
    keyId: `key-${Date.now()}`,
    fingerprint: `SHA256:${Array.from({ length: 10 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join(":")}`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.actorUserId,
    expiresAt: req.expiresAt,
    status: "active",
    notes: req.notes,
  };
  emitAdminAuditLog({ action: "admin.certificate.uploaded", actorUserId: req.actorUserId, providerId: req.providerId });
  return cert;
}

// ── GET /admin/security/certificates ─────────────────────────────────────────

export async function listCertificates(providerId?: string): Promise<SecurityCertificate[]> {
  return providerId
    ? mockCertificates.filter((c) => c.providerId === providerId)
    : mockCertificates;
}

// ── PUT /admin/providers/:id/ip-whitelist ─────────────────────────────────────

export async function updateIpWhitelist(
  providerId: string,
  ips: string[],
  actorUserId: string,
): Promise<void> {
  emitAdminAuditLog({ action: "admin.ip_whitelist.updated", actorUserId, providerId });
}

// ── GET /admin/templates ──────────────────────────────────────────────────────

export async function listTemplates(): Promise<IntegrationTemplate[]> {
  return integrationTemplates;
}

// ── POST /admin/providers/from-template ──────────────────────────────────────

/**
 * Pre-fills a new provider form from an official template.
 * Admin still needs to supply Client ID, secrets, and org-specific endpoint.
 */
export async function applyTemplate(
  templateId: string,
): Promise<Partial<AddProviderForm>> {
  const tpl = integrationTemplates.find((t) => t.id === templateId);
  if (!tpl) throw new Error("Template not found");
  return {
    providerType: tpl.providerType,
    fhirEndpoint: tpl.fhirEndpoint,
    apiVersion: tpl.apiVersion,
    authType: tpl.authType,
    scopes: tpl.scopes.join(", "),
    supportedDataTypes: tpl.defaultDataTypes,
    templateId,
  };
}

// ── GET /admin/mappings ───────────────────────────────────────────────────────

export async function listDataMappings(providerId?: string): Promise<AdminDataMapping[]> {
  return providerId
    ? mockAdminMappings.filter((m) => m.providerId === providerId)
    : mockAdminMappings;
}

// ── GET /admin/providers/:id/stats ───────────────────────────────────────────

export async function getProviderStats(id: string): Promise<ProviderStatsResponse> {
  const provider = mockAdminProviders.find((p) => p.id === id);
  return {
    connectedPatients: provider?.connectedPatients ?? 0,
    totalSyncsToday:   provider?.status === "active" ? Math.floor(Math.random() * 500) + 50 : 0,
    avgLatencyMs:      provider?.status === "active" ? 280 : 0,
    errorRate:         provider?.status === "active" ? 0.02 : 1.0,
    lastSuccessfulSync: provider?.status === "active" ? new Date(Date.now() - 900_000).toISOString() : null,
  };
}

// ── Audit Logging ─────────────────────────────────────────────────────────────

export function emitAdminAuditLog(entry: {
  action: string;
  actorUserId: string;
  providerId?: string;
  metadata?: Record<string, unknown>;
}): void {
  // Real: write to immutable admin_audit_log table + SIEM stream
  console.info("[ADMIN-AUDIT]", JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "AUDIT",
    ...entry,
  }));
}

// ── API Route summary (Express-style) ─────────────────────────────────────────
//
//  GET    /admin/providers                       → listAdminProviders
//  GET    /admin/providers/:id                   → getAdminProvider
//  POST   /admin/providers                       → createAdminProvider
//  PUT    /admin/providers/:id                   → updateAdminProvider
//  DELETE /admin/providers/:id                   → deleteAdminProvider
//  POST   /admin/providers/:id/status            → setProviderStatus
//  POST   /admin/providers/:id/test              → testAdminProviderConnection
//  GET    /admin/providers/:id/stats             → getProviderStats
//  POST   /admin/security/certificates           → uploadCertificate
//  GET    /admin/security/certificates           → listCertificates
//  PUT    /admin/providers/:id/ip-whitelist       → updateIpWhitelist
//  GET    /admin/templates                       → listTemplates
//  POST   /admin/providers/from-template         → applyTemplate
//  GET    /admin/mappings                        → listDataMappings
