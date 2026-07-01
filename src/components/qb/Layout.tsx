import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Cpu,
  BellRing,
  Sparkles,
  Users,
  Settings,
  Bell,
  Play,
  Download,
  HelpCircle,
  Eye,
  AlertTriangle,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { patient } from "@/lib/qb-data";
import { FamilyMemberSelector } from "./FamilyMemberSelector";
import { DemoMode } from "./DemoMode";
import { PageTransition } from "./PageTransition";
import { Onboarding } from "./Onboarding";
import { PatientContextHeader } from "./PatientContextHeader";
import { useFamilyContext } from "@/lib/family-context";
import { useUserContext } from "@/lib/user-context";
import { logout, useAuth, Role } from "@/lib/auth";

const ALL_NAV_ITEMS = [
  { to: "/",                   label: "Dashboard",    icon: LayoutDashboard,  requiredRole: null,       patientOnly: true  },
  { to: "/timeline",           label: "Timeline",     icon: Activity,         requiredRole: null,       patientOnly: true  },
  { to: "/source-data",        label: "Health Hub",   icon: Cpu,              requiredRole: null,       patientOnly: true  },
  { to: "/alerts",             label: "Health Alerts",icon: BellRing,         requiredRole: null,       patientOnly: true, badge: 3 },
  { to: "/genie",              label: "Genie AI",     icon: Sparkles,         requiredRole: null,       patientOnly: true  },
  { to: "/family",             label: "Family",       icon: Users,            requiredRole: null,       patientOnly: true  },
  { to: "/admin-integrations", label: "Admin Hub",    icon: ShieldCheck,      requiredRole: Role.ADMIN, patientOnly: false },
  { to: "/settings",           label: "Settings",     icon: Settings,         requiredRole: null,       patientOnly: true  },
] as const;

const screenMeta: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Patient-generated data · What happens between visits" },
  "/timeline": { title: "Timeline", subtitle: "Every signal, in order, across every source" },
  "/source-data": { title: "Health Hub", subtitle: "Connected devices and uploaded reports powering Quest Beyond" },
  "/alerts": { title: "Health Alerts Center", subtitle: "Severity-ranked patterns that need attention" },
  "/genie": { title: "Genie AI", subtitle: "Voice + text assistant for the patient" },
  "/family": { title: "Family Health", subtitle: "Manage health information for your family members" },
  "/settings": { title: "Settings", subtitle: "Notifications · thresholds · privacy · integrations" },
  "/admin-integrations": { title: "Admin Integration Hub", subtitle: "Configure providers, authentication, certificates, and data mappings" },
};

export function Layout({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const user = useAuth().user;

  // Filter nav: admins only see non-patientOnly items (+ items they have role for)
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.requiredRole !== null && !hasRole(item.requiredRole)) return false;
    if (item.patientOnly && isAdmin) return false;
    return true;
  });
  const meta = screenMeta[path] ?? { title: "Quest Beyond", subtitle: "" };
  const { selectedMember } = useFamilyContext();
  const userCtx = useUserContext();
  const [time, setTime] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const [exported, setExported] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="group/sidebar fixed inset-y-0 left-0 z-30 hidden md:flex w-[68px] flex-col border-r border-border-soft bg-surface shadow-sm transition-[width] duration-300 hover:w-[220px]">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border-soft px-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-soft">
            <span className="qb-display text-base font-bold text-teal">Q</span>
          </div>
          <div className="flex min-w-0 flex-col overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            <span className="qb-display text-sm font-semibold text-fg">Quest Beyond</span>
            <span className="qb-mono text-[9px] uppercase tracking-widest text-muted">v0.9 · alpha</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
          {navItems.map((item) => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex h-10 items-center gap-3 rounded-xl px-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-soft text-teal"
                    : "text-muted hover:bg-surface-3 hover:text-fg"
                }`}
              >
                {active && (
                  <span className="absolute -left-2 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-teal" />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="min-w-0 truncate opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-rose-soft px-1.5 py-0.5 qb-mono text-[10px] font-medium text-rose opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                    {item.badge}
                  </span>
                )}
                {item.badge && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose group-hover/sidebar:hidden" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Patient badge */}
        <div className="border-t border-border-soft px-2 py-3">
          <div className="flex h-10 items-center gap-3 rounded-lg bg-surface-2 px-2.5">
            {/* Patient badge — shown only for non-admin users */}
            {!isAdmin && patient.name && (
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-soft qb-display text-xs font-semibold text-teal">
              SM
            </div>
            )}
            <div className="min-w-0 flex-1 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              {isAdmin ? (
                <>
                  <div className="truncate text-xs font-medium text-fg">{user?.fullName ?? "Admin"}</div>
                  <div className="qb-mono text-[9px] uppercase tracking-widest text-violet">Admin</div>
                </>
              ) : (
                <>
                  <div className="truncate text-xs font-medium text-fg">{patient.name}</div>
                  <div className="qb-mono text-[9px] uppercase tracking-widest text-muted">Patient · MRN {patient.mrn}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="ml-0 md:ml-[68px] flex min-h-screen flex-1 flex-col">
        {/* Sticky zone: topbar + context header */}
        <div className="sticky top-0 z-20">
          {/* Topbar */}
          <header className="flex h-14 items-center gap-2 sm:gap-4 border-b border-border-soft bg-surface px-3 sm:px-6 shadow-sm">
            <div className="min-w-0 flex-1">
              <h1 className="qb-display text-[15px] font-semibold leading-tight text-fg">{meta.title}</h1>
              <p className="truncate text-[11px] text-muted">{meta.subtitle}</p>
            </div>

            {/* Family member selector — hidden for admins */}
            {!isAdmin && <FamilyMemberSelector />}

            <div className="flex items-center gap-1.5">
              <button
                title="Alerts"
                className="relative grid h-8 w-8 place-items-center rounded-lg border border-border-strong bg-surface-2 text-muted transition-colors hover:text-fg"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose qb-pulse" />
              </button>
              <button
                title="Replay onboarding"
                onClick={() => setTourOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong bg-surface-2 text-muted transition-colors hover:text-fg"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <button
                title="Demo Mode"
                onClick={() => setDemoOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-xl border border-teal/30 bg-teal-soft px-3 text-xs font-medium text-teal transition-colors hover:bg-teal/20"
              >
                <Play className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Demo</span>
              </button>
              <button
                title="FHIR Export"
                onClick={() => setExported(true)}
                className="hidden h-8 items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 text-xs font-medium text-muted transition-colors hover:text-fg md:flex"
              >
                <Download className="h-3.5 w-3.5" />
                FHIR
              </button>
              <button
                title="Sign out"
                onClick={() => { logout(); void navigate({ to: "/login", replace: true }); }}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong bg-surface-2 text-muted transition-colors hover:border-rose/30 hover:bg-rose-soft hover:text-rose"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Patient context header — hidden for admins */}
          {!isAdmin && <PatientContextHeader />}
        </div>

        {/* ── Family context viewing banner — hidden for admins ─────────────── */}
        {!isAdmin && userCtx.isFamilyView && (
          <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 text-xs font-medium border-b ${
            !userCtx.hasActiveConsent
              ? "bg-rose-soft border-rose/20 text-rose"
              : "bg-amber-soft border-amber/20 text-amber"
          }`}>
            {!userCtx.hasActiveConsent
              ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              : <Eye className="h-3.5 w-3.5 shrink-0" />}
            <span>
              {!userCtx.hasActiveConsent
                ? <>No active consent for <strong>{userCtx.contextSubjectName}</strong> — data sharing actions are disabled.</>
                : <>Viewing data for <strong>{userCtx.contextSubjectName}</strong> ({userCtx.contextRelationship}){userCtx.isMinorContext ? " · Minor — guardian consent required" : ""}. Switch the selector above to return to primary patient view.</>}
            </span>
            <span className={`ml-auto qb-chip border text-[10px] font-semibold ${userCtx.subjectTagColor}`}>
              {userCtx.subjectTag}
            </span>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 bg-bg px-3 pt-4 pb-20 sm:px-6 sm:pt-5 md:pb-5">
          <AnimatePresence mode="wait">
            <PageTransition k={path}>{children}</PageTransition>
          </AnimatePresence>
        </main>

        {/* FHIR export toast */}
        {exported && (
          <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-teal/30 bg-surface qb-glow-teal px-5 py-2 text-xs font-medium text-teal shadow-lg">
            ✓ FHIR bundle (28 resources) exported to Epic
            <button onClick={() => setExported(false)} className="ml-3 text-muted hover:text-fg">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile bottom navigation ─────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex md:hidden h-14 items-stretch border-t border-border-soft bg-surface/95 backdrop-blur-sm">
        {navItems.map((item) => {
          const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 py-1.5 transition-colors ${
                active ? "text-teal" : "text-muted hover:text-fg"
              }`}
            >
              {active && (
                <span className="absolute top-0 inset-x-[18%] h-0.5 rounded-b-full bg-teal" />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="text-[8px] font-medium truncate w-full text-center px-0.5 leading-none mt-0.5">
                {item.label}
              </span>
              {item.badge && !active && (
                <span className="absolute right-[22%] top-2 h-1.5 w-1.5 rounded-full bg-rose" />
              )}
            </Link>
          );
        })}
      </nav>

      <DemoMode open={demoOpen} onClose={() => setDemoOpen(false)} />
      <Onboarding forceOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}

