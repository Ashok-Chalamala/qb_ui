import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { loginAsync, isLoggedIn, getAuthUser, Role } from "@/lib/auth";
import { Eye, EyeOff, ShieldCheck, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (!isLoggedIn()) return;
    const user = getAuthUser();
    throw redirect({ to: getPostLoginRoute(user?.roles ?? []) });
  },
  head: () => ({
    meta: [
      { title: "Sign In · Quest Beyond" },
      { name: "description", content: "Sign in to your Quest Beyond patient portal." },
    ],
  }),
  component: LoginPage,
});

const DEMO_CREDENTIALS = [
  { label: "Sarah Martinez (Patient)", email: "sarah.martinez@questbeyond.com", password: "Patient@2026" },
  { label: "James Lee (Patient)", email: "james.lee@questbeyond.com", password: "Patient@2026" },
  { label: "Admin", email: "admin@questbeyond.com", password: "Admin@2026" },
];

function getPostLoginRoute(roles: Role[]): "/admin-integrations" | "/" {
  return roles.includes(Role.ADMIN) ? "/admin-integrations" : "/";
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email is required."); return; }
    if (!password) { setError("Password is required."); return; }

    setLoading(true);
    const result = await loginAsync(email, password);
    setLoading(false);
    if (result.success) {
      const user = getAuthUser();
      void navigate({ to: getPostLoginRoute(user?.roles ?? []), replace: true });
    } else {
      setError(result.error ?? "Login failed.");
    }
  };

  const fillDemo = (cred: typeof DEMO_CREDENTIALS[number]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError("");
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-soft">
            <ShieldCheck className="h-6 w-6 text-teal" />
          </div>
          <h1 className="qb-display text-xl font-bold tracking-tight">Quest Beyond</h1>
          <p className="text-xs text-muted text-center">Patient health data portal — sign in to continue</p>
        </div>

        {/* Form card */}
        <div className="qb-card">
          <h2 className="qb-display text-base font-semibold mb-5">Sign In</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="email" className="mb-1.5 block text-xs text-muted">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@questbeyond.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="h-9 text-sm"
                aria-label="Email address"
                aria-required="true"
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block text-xs text-muted">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="h-9 text-sm pr-9"
                  aria-label="Password"
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-rose-soft border border-rose/20 px-3 py-2 text-xs text-rose">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 rounded-lg bg-teal text-xs font-medium text-bg hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 qb-card">
          <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-3">Demo Accounts</p>
          <div className="space-y-2">
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.email}
                type="button"
                onClick={() => fillDemo(cred)}
                className="flex w-full items-center justify-between rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-left text-xs hover:border-teal/40 hover:bg-teal-soft/30 transition-colors"
              >
                <div>
                  <div className="font-medium">{cred.label}</div>
                  <div className="text-muted qb-mono">{cred.email}</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted shrink-0" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-muted">Password for all demo accounts: <span className="qb-mono">Patient@2026</span> / <span className="qb-mono">Admin@2026</span></p>
        </div>
      </div>
    </div>
  );
}
