// ─────────────────────────────────────────────────────────────────────────────
// Patient Provider Connection Wizard
//
// Simple, patient-friendly flow — NO technical fields ever shown.
//
// Step 1: Select Provider  (cards loaded from admin-configured list)
// Step 2: Verify Identity  (OTP via email/SMS, or OAuth redirect)
// Step 3: Select Data      (checkboxes for data types)
// Step 4: Consent          (summary + approval)
// Step 5: Success          (connected confirmation)
//
// Patients NEVER see: FHIR URLs, Client IDs, secrets, tokens, certs.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import {
  CheckCircle, ChevronLeft, ChevronRight, Smartphone, Mail,
  ExternalLink, Shield, AlertCircle, Loader2, X, Wifi, WifiOff,
} from "lucide-react";
import {
  mockAdminProviders, DATA_TYPE_LABELS, DATA_TYPE_ICONS, patientLinkStatusColor,
  type AdminProvider, type OtpChannel,
} from "@/lib/admin-data";
import { useUserContext } from "@/lib/user-context";
import {
  requestOtp, verifyOtp, connectProvider,
  type ConnectProviderResponse,
} from "@/lib/api/patient-connect.functions";
import type { SharingDataType } from "@/lib/consent-data";

// ── Wizard state ──────────────────────────────────────────────────────────────

interface WizardState {
  // Step 1
  selectedProviderId: string;
  // Step 2
  authMethod: "otp" | "oauth";
  otpChannel: OtpChannel;
  contact: string;            // email or phone
  otpSessionId: string;
  otpCode: string;
  otpSent: boolean;
  otpSending: boolean;
  otpVerified: boolean;
  otpVerifying: boolean;
  otpMaskedContact: string;
  otpError: string;
  sessionToken: string;
  // Step 3
  dataTypes: SharingDataType[];
  // Step 4
  consentSignature: string;
  consentAccepted: boolean;
}

const INIT: WizardState = {
  selectedProviderId: "",
  authMethod: "otp",
  otpChannel: "email",
  contact: "",
  otpSessionId: "",
  otpCode: "",
  otpSent: false,
  otpSending: false,
  otpVerified: false,
  otpVerifying: false,
  otpMaskedContact: "",
  otpError: "",
  sessionToken: "",
  dataTypes: [],
  consentSignature: "",
  consentAccepted: false,
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function StepPill({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${
        done   ? "bg-teal border-teal text-white" :
        active ? "bg-teal-soft border-teal text-teal" :
                 "bg-surface-2 border-border-strong text-muted"
      }`}>
        {done ? <CheckCircle className="h-3.5 w-3.5" /> : step}
      </div>
      <span className={`text-[11px] font-medium hidden sm:block ${active ? "text-fg" : done ? "text-teal" : "text-muted"}`}>{label}</span>
    </div>
  );
}

function Steps({ current }: { current: number }) {
  const steps = ["Provider", "Verify", "Data", "Consent"];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <StepPill step={i + 1} current={current} label={label} />
          {i < steps.length - 1 && <div className="h-px w-6 bg-border-strong hidden sm:block" />}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Select Provider ───────────────────────────────────────────────────

function SelectProvider({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const active = mockAdminProviders.filter((p) => p.status === "active");
  const pending = mockAdminProviders.filter((p) => p.status === "pending");

  return (
    <div className="space-y-5">
      <div>
        <h3 className="qb-display text-sm font-semibold text-fg mb-1">Select Your Healthcare Provider</h3>
        <p className="text-xs text-muted">Choose the hospital or lab you want to connect to. Your health records will be securely imported.</p>
      </div>

      <div className="space-y-2.5">
        {active.map((p) => {
          const selected = state.selectedProviderId === p.id;
          return (
            <button key={p.id} onClick={() => update({ selectedProviderId: p.id })}
              className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                selected ? "border-teal/50 bg-teal-soft ring-1 ring-teal/30" : "border-border-strong bg-surface-2 hover:bg-surface-3"
              }`}>
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold ${p.logoColor}`}>
                {p.logoInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${selected ? "text-teal" : "text-fg"}`}>{p.displayName}</span>
                  <span className="qb-chip bg-lime-soft text-lime border-lime/30 text-[10px]">
                    <Wifi className="h-2.5 w-2.5" /> Available
                  </span>
                  {p.environment === "sandbox" && (
                    <span className="qb-chip bg-violet-soft text-violet border-violet/30 text-[9px] uppercase font-semibold">sandbox</span>
                  )}
                </div>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">{p.description}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.supportedDataTypes.map((dt) => (
                    <span key={dt} className="text-[10px] text-muted">{DATA_TYPE_ICONS[dt]} {DATA_TYPE_LABELS[dt]}</span>
                  )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} className="text-[10px] text-muted">·</span>, el], [] as React.ReactNode[])}
                </div>
              </div>
              {selected && <CheckCircle className="h-5 w-5 text-teal shrink-0" />}
            </button>
          );
        })}
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Coming Soon</div>
          {pending.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-2 p-3.5 opacity-60">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${p.logoColor}`}>{p.logoInitials}</div>
              <div>
                <div className="text-xs font-medium text-muted">{p.displayName}</div>
                <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5"><WifiOff className="h-2.5 w-2.5" /> Setup in progress</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 2: Verify Identity ───────────────────────────────────────────────────

function VerifyIdentity({
  state, update, provider,
}: { state: WizardState; update: (p: Partial<WizardState>) => void; provider: AdminProvider }) {
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleSendOtp() {
    if (!state.contact) return;
    update({ otpSending: true, otpError: "" });
    try {
      const res = await requestOtp({
        contact: state.contact,
        channel: state.otpChannel,
        providerId: provider.id,
        subjectId: "patient-00429",
      });
      update({
        otpSent: true,
        otpSending: false,
        otpSessionId: res.sessionId,
        otpMaskedContact: res.maskedContact,
      });
      // Cooldown for resend
      setResendCooldown(30);
      const t = setInterval(() => setResendCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    } catch (e: any) {
      update({ otpSending: false, otpError: e.message ?? "Failed to send OTP." });
    }
  }

  async function handleVerify() {
    if (state.otpCode.length !== 6) return;
    update({ otpVerifying: true, otpError: "" });
    try {
      const res = await verifyOtp({ sessionId: state.otpSessionId, otp: state.otpCode, contact: state.contact });
      if (res.verified) {
        update({ otpVerified: true, otpVerifying: false, sessionToken: res.sessionToken });
      } else {
        update({ otpVerifying: false, otpError: res.message });
      }
    } catch (e: any) {
      update({ otpVerifying: false, otpError: e.message ?? "Verification failed." });
    }
  }

  const hasOtp  = provider.supportsOtp;
  const hasAuth = provider.supportsOAuth;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="qb-display text-sm font-semibold text-fg mb-1">Verify Your Identity</h3>
        <p className="text-xs text-muted">Confirm who you are before connecting to <strong className="text-fg">{provider.displayName}</strong>.</p>
      </div>

      {/* Auth method selector */}
      {hasOtp && hasAuth && (
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: "otp",   label: "Send OTP",         sub: "6-digit code via email or SMS",   icon: Smartphone },
            { value: "oauth", label: "Provider Login",   sub: "Sign in with your patient portal", icon: ExternalLink },
          ] as const).map((opt) => {
            const Icon = opt.icon;
            return (
              <button key={opt.value} onClick={() => update({ authMethod: opt.value })}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  state.authMethod === opt.value ? "border-teal/50 bg-teal-soft" : "border-border-strong bg-surface-2 hover:bg-surface-3"
                }`}>
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${state.authMethod === opt.value ? "bg-teal/20 text-teal" : "bg-surface-3 text-muted"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className={`text-xs font-semibold ${state.authMethod === opt.value ? "text-teal" : "text-fg"}`}>{opt.label}</div>
                  <div className="text-[11px] text-muted mt-0.5">{opt.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* OTP Flow */}
      {state.authMethod === "otp" && (
        <div className="space-y-4">
          {!state.otpSent ? (
            <>
              {/* Channel picker */}
              {provider.otpContactMethods.length > 1 && (
                <div className="flex gap-2">
                  {provider.otpContactMethods.map((ch) => (
                    <button key={ch} onClick={() => update({ otpChannel: ch })}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                        state.otpChannel === ch ? "border-teal/40 bg-teal-soft text-teal" : "border-border-strong text-muted hover:text-fg"
                      }`}>
                      {ch === "email" ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                      {ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {/* Contact input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-fg">
                  {state.otpChannel === "email" ? "Email Address" : "Mobile Number"}
                </label>
                <div className="relative">
                  {state.otpChannel === "email"
                    ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                    : <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />}
                  <input
                    type={state.otpChannel === "email" ? "email" : "tel"}
                    value={state.contact}
                    onChange={(e) => update({ contact: e.target.value })}
                    placeholder={state.otpChannel === "email" ? "your@email.com" : "+1 555-000-0000"}
                    className="w-full rounded-lg border border-border-strong bg-surface-2 pl-9 pr-4 py-2.5 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30"
                  />
                </div>
                <p className="text-[11px] text-muted">Enter the {state.otpChannel === "email" ? "email" : "phone number"} registered with your healthcare provider.</p>
              </div>

              <button onClick={handleSendOtp} disabled={!state.contact || state.otpSending}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-teal/30 bg-teal-soft py-3 text-sm font-semibold text-teal hover:bg-teal/20 disabled:opacity-40 transition-colors">
                {state.otpSending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <>Send Verification Code</>}
              </button>
            </>
          ) : !state.otpVerified ? (
            <>
              {/* OTP entry */}
              <div className="flex items-start gap-2.5 rounded-xl border border-teal/20 bg-teal-soft px-4 py-3">
                <CheckCircle className="h-4 w-4 text-teal shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-teal">Code sent!</p>
                  <p className="text-[11px] text-teal/80 mt-0.5">
                    A 6-digit verification code was sent to <strong>{state.otpMaskedContact}</strong>.
                    Check your {state.otpChannel === "email" ? "inbox" : "messages"}.
                  </p>
                  <p className="text-[10px] text-teal/60 mt-1">Demo: enter any 6 digits (e.g. 123456)</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-fg">Enter 6-Digit Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={state.otpCode}
                  onChange={(e) => update({ otpCode: e.target.value.replace(/\D/g, "").slice(0, 6), otpError: "" })}
                  placeholder="— — — — — —"
                  className="w-full rounded-lg border border-border-strong bg-surface-2 px-4 py-3 text-center text-xl font-bold tracking-[0.5em] text-fg focus:outline-none focus:border-teal/60 qb-mono"
                />
              </div>

              {state.otpError && (
                <div className="flex items-center gap-2 rounded-lg border border-rose/20 bg-rose-soft px-3 py-2 text-[11px] text-rose">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {state.otpError}
                </div>
              )}

              <button onClick={handleVerify} disabled={state.otpCode.length !== 6 || state.otpVerifying}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-teal/30 bg-teal-soft py-3 text-sm font-semibold text-teal hover:bg-teal/20 disabled:opacity-40">
                {state.otpVerifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <>Verify Code →</>}
              </button>

              <div className="text-center">
                <button onClick={() => update({ otpSent: false, otpCode: "", otpError: "" })} disabled={resendCooldown > 0}
                  className="text-xs text-muted hover:text-teal disabled:opacity-50 transition-colors">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive a code? Resend"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-lime/30 bg-lime-soft px-4 py-4">
              <CheckCircle className="h-5 w-5 text-lime shrink-0" />
              <div>
                <p className="text-sm font-semibold text-lime">Identity verified</p>
                <p className="text-[11px] text-lime/80 mt-0.5">Your identity has been confirmed. Proceed to select data.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OAuth Flow */}
      {state.authMethod === "oauth" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-sky/20 bg-sky-soft px-4 py-3">
            <Shield className="h-4 w-4 text-sky shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky/90">
              You'll be redirected to <strong>{provider.displayName}</strong>'s secure login page. Sign in with your existing patient portal credentials.
            </p>
          </div>
          <button
            onClick={() => {
              // Real: window.location.href = oauthUrl
              // Demo: simulate completion
              update({ otpVerified: true, sessionToken: "demo-oauth-verified-token" });
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky/30 bg-sky-soft py-3 text-sm font-semibold text-sky hover:bg-sky/20 transition-colors">
            <ExternalLink className="h-4 w-4" />
            Sign in with {provider.displayName}
          </button>
          {state.otpVerified && (
            <div className="flex items-center gap-3 rounded-xl border border-lime/30 bg-lime-soft px-4 py-3">
              <CheckCircle className="h-5 w-5 text-lime shrink-0" />
              <p className="text-sm font-semibold text-lime">Authenticated via {provider.displayName}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Select Data ───────────────────────────────────────────────────────

function SelectData({
  state, update, provider,
}: { state: WizardState; update: (p: Partial<WizardState>) => void; provider: AdminProvider }) {
  function toggle(dt: SharingDataType) {
    update({ dataTypes: state.dataTypes.includes(dt) ? state.dataTypes.filter((d) => d !== dt) : [...state.dataTypes, dt] });
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="qb-display text-sm font-semibold text-fg mb-1">Select Data to Import</h3>
        <p className="text-xs text-muted">Choose which health records to pull from <strong className="text-fg">{provider.displayName}</strong>. You can change this anytime.</p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {provider.supportedDataTypes.map((dt) => {
          const active = state.dataTypes.includes(dt as SharingDataType);
          return (
            <button key={dt} onClick={() => toggle(dt as SharingDataType)}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                active ? "border-teal/50 bg-teal-soft ring-1 ring-teal/30" : "border-border-strong bg-surface-2 hover:bg-surface-3"
              }`}>
              <span className="text-2xl shrink-0">{DATA_TYPE_ICONS[dt] ?? "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold ${active ? "text-teal" : "text-fg"}`}>{DATA_TYPE_LABELS[dt] ?? dt}</div>
              </div>
              {active && <CheckCircle className="h-4 w-4 text-teal shrink-0" />}
            </button>
          );
        })}
      </div>

      <button onClick={() => update({ dataTypes: provider.supportedDataTypes as SharingDataType[] })}
        className="text-xs text-teal hover:underline">
        Select all available →
      </button>
    </div>
  );
}

// ── Step 4: Consent ───────────────────────────────────────────────────────────

function ConsentStep({
  state, update, provider, subjectName,
}: { state: WizardState; update: (p: Partial<WizardState>) => void; provider: AdminProvider; subjectName: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="qb-display text-sm font-semibold text-fg mb-1">Review & Approve</h3>
        <p className="text-xs text-muted">Review what will be connected before approving.</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-sky/30 bg-sky-soft px-4 py-3">
        <Shield className="h-4 w-4 text-sky shrink-0 mt-0.5" />
        <p className="text-[11px] text-sky/90">
          HIPAA Authorization: You are authorizing QuestBeyond to securely access your health data from this provider. You may revoke this access at any time.
        </p>
      </div>

      {/* Summary card */}
      <div className="qb-card space-y-3 border-border-strong">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Connection Summary</div>
        {[
          { label: "Provider",     value: provider.displayName },
          { label: "Your Account", value: subjectName },
          { label: "Verified via", value: state.authMethod === "otp" ? `OTP (${state.otpChannel.toUpperCase()})` : "Provider Login" },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2 border-b border-border-soft pb-2.5 last:border-0 last:pb-0">
            <span className="text-[11px] text-muted w-28 shrink-0">{row.label}</span>
            <span className="text-xs font-medium text-fg">{row.value}</span>
          </div>
        ))}
        <div className="flex items-start gap-2">
          <span className="text-[11px] text-muted w-28 shrink-0 mt-0.5">Data Access</span>
          <div className="flex flex-wrap gap-1.5">
            {state.dataTypes.map((dt) => (
              <span key={dt} className="qb-chip bg-teal-soft text-teal border-teal/30 text-[10px]">
                {DATA_TYPE_ICONS[dt] ?? "📄"} {DATA_TYPE_LABELS[dt] ?? dt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-fg">Full Name (electronic signature) <span className="text-rose">*</span></label>
        <input type="text" value={state.consentSignature} onChange={(e) => update({ consentSignature: e.target.value })}
          placeholder="Sarah Martinez"
          className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-teal/60" />
      </div>

      {/* Checkbox */}
      <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
        state.consentAccepted ? "border-teal/50 bg-teal-soft" : "border-border-strong bg-surface-2 hover:bg-surface-3"
      }`}>
        <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${state.consentAccepted ? "border-teal bg-teal" : "border-border-strong"}`}>
          {state.consentAccepted && <CheckCircle className="h-3 w-3 text-white" />}
        </div>
        <input type="checkbox" checked={state.consentAccepted} onChange={(e) => update({ consentAccepted: e.target.checked })} className="sr-only" />
        <div>
          <p className={`text-xs font-semibold ${state.consentAccepted ? "text-teal" : "text-fg"}`}>I approve & authorize this connection</p>
          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
            I understand QuestBeyond will access my health data from this provider on my behalf. I can disconnect at any time from the Integration Hub.
          </p>
        </div>
      </label>
    </div>
  );
}

// ── Step 5: Success ───────────────────────────────────────────────────────────

function SuccessStep({
  result, provider, onDone,
}: { result: ConnectProviderResponse; provider: AdminProvider; onDone: () => void }) {
  return (
    <div className="space-y-6 py-4">
      {/* Checkmark animation */}
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-lime/40 bg-lime-soft">
          <CheckCircle className="h-10 w-10 text-lime" />
        </div>
        <h3 className="qb-display text-lg font-bold text-fg text-center">Connected Successfully!</h3>
        <p className="text-sm text-muted text-center max-w-xs">
          <strong className="text-fg">{provider.displayName}</strong> is now linked to your QuestBeyond account. Your health data will begin syncing shortly.
        </p>
      </div>

      {/* Summary */}
      <div className="qb-card space-y-2.5 border-border-strong">
        {[
          { label: "Provider",   value: result.providerName },
          { label: "Status",     value: "Connected ✓", color: "text-lime font-semibold" },
          { label: "Connected",  value: new Date(result.connectedAt).toLocaleString() },
          { label: "Data Sync",  value: result.dataTypes.map((d) => DATA_TYPE_LABELS[d] ?? d).join(", ") || "Selected types" },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2 border-b border-border-soft pb-2.5 last:border-0 last:pb-0">
            <span className="text-[11px] text-muted w-24 shrink-0">{row.label}</span>
            <span className={`text-xs ${row.color ?? "text-fg"}`}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-sky/20 bg-sky-soft px-4 py-3">
        <Shield className="h-4 w-4 text-sky shrink-0 mt-0.5" />
        <p className="text-[11px] text-sky/90">
          Your data is protected by HIPAA-compliant encryption. You can disconnect this provider at any time from the Integration Hub.
        </p>
      </div>

      <button onClick={onDone}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-teal/30 bg-teal-soft py-3 text-sm font-semibold text-teal hover:bg-teal/20 transition-colors">
        <CheckCircle className="h-4 w-4" /> Done — Back to Integration Hub
      </button>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export function ConnectProviderWizard({
  onComplete, onCancel,
}: { onComplete: () => void; onCancel: () => void }) {
  const ctx = useUserContext();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INIT);
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<ConnectProviderResponse | null>(null);

  function update(patch: Partial<WizardState>) { setState((s) => ({ ...s, ...patch })); }

  const provider = mockAdminProviders.find((p) => p.id === state.selectedProviderId) ?? null;

  function canAdvance(): boolean {
    switch (step) {
      case 1: return !!state.selectedProviderId;
      case 2: return state.otpVerified;
      case 3: return state.dataTypes.length > 0;
      case 4: return state.consentAccepted && !!state.consentSignature;
      default: return true;
    }
  }

  async function handleConnect() {
    if (!provider) return;
    setConnecting(true);
    try {
      const res = await connectProvider({
        subjectId: ctx.contextSubjectId,
        subjectName: ctx.contextSubjectName,
        subjectType: ctx.contextType,
        providerId: provider.id,
        dataTypes: state.dataTypes,
        sessionToken: state.sessionToken,
        consentGiven: state.consentAccepted,
        consentSignature: state.consentSignature,
      });
      setResult(res);
      setStep(5);
    } catch (e: any) {
      console.error("Connect failed:", e.message);
    } finally {
      setConnecting(false);
    }
  }

  const STEP_TITLES = ["", "Select Provider", "Verify Identity", "Select Data", "Review & Approve", "Connected!"];

  return (
    <div className="qb-card space-y-5">
      {/* Header */}
      {step < 5 && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="qb-display text-sm font-semibold text-fg">Connect a Provider</h2>
            <p className="text-[11px] text-muted mt-0.5">
              Step {step} of 4 — {STEP_TITLES[step]}
              {ctx.isFamilyView && <span className="ml-2 text-amber font-medium">· For {ctx.contextSubjectName}</span>}
            </p>
          </div>
          <button onClick={onCancel} className="text-muted hover:text-fg"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Progress */}
      {step < 5 && <Steps current={step} />}

      {/* Step content */}
      <div className="border-t border-border-soft pt-5">
        {step === 1 && <SelectProvider state={state} update={update} />}
        {step === 2 && provider && <VerifyIdentity state={state} update={update} provider={provider} />}
        {step === 3 && provider && <SelectData state={state} update={update} provider={provider} />}
        {step === 4 && provider && <ConsentStep state={state} update={update} provider={provider} subjectName={ctx.contextSubjectName} />}
        {step === 5 && result && provider && <SuccessStep result={result} provider={provider} onDone={onComplete} />}
      </div>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex items-center justify-between border-t border-border-soft pt-4">
          <button onClick={() => step > 1 ? setStep((s) => s - 1) : onCancel()}
            className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-4 py-2 text-xs font-medium text-muted hover:text-fg">
            <ChevronLeft className="h-3.5 w-3.5" />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}
              className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal-soft px-4 py-2 text-xs font-medium text-teal hover:bg-teal/20 disabled:opacity-40">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button onClick={handleConnect} disabled={!canAdvance() || connecting}
              className="flex items-center gap-1.5 rounded-xl border border-lime/30 bg-lime-soft px-5 py-2 text-xs font-semibold text-lime hover:bg-lime/20 disabled:opacity-40 transition-colors">
              {connecting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…</>
                : <><CheckCircle className="h-3.5 w-3.5" /> Approve & Connect</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
