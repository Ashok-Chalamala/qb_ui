// ── RoleGuard ─────────────────────────────────────────────────────────────────
// Reusable authorization components and hooks for RBAC.
//
// Usage:
//   <RoleGuard roles={[Role.ADMIN]}>
//     <AdminPage />
//   </RoleGuard>
//
//   const { hasRole } = useAuthorization();
//   if (!hasRole(Role.ADMIN)) return <Unauthorized />;

import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, Role, Permission } from "@/lib/auth";

// ── Unauthorized fallback ─────────────────────────────────────────────────────

function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-soft">
        <span className="text-2xl">🔒</span>
      </div>
      <h2 className="qb-display text-lg font-semibold">Access Denied</h2>
      <p className="text-sm text-muted max-w-xs">
        You don't have permission to view this page. Contact your administrator if you believe this is an error.
      </p>
    </div>
  );
}

// ── RoleGuard component ───────────────────────────────────────────────────────

interface RoleGuardProps {
  /** At least one of these roles is required to render children */
  roles: Role[];
  /** Rendered when the user lacks the required role (defaults to UnauthorizedPage) */
  fallback?: ReactNode;
  /** If true, redirects to `redirectTo` instead of rendering fallback */
  redirect?: boolean;
  redirectTo?: string;
  children: ReactNode;
}

/**
 * RoleGuard — renders children only when the current user has at least one
 * of the specified roles. Otherwise renders `fallback` or redirects.
 *
 * @example
 *   <RoleGuard roles={[Role.ADMIN]}>
 *     <AdminHub />
 *   </RoleGuard>
 */
export function RoleGuard({
  roles,
  fallback,
  redirect = false,
  redirectTo = "/",
  children,
}: RoleGuardProps) {
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const allowed = hasAnyRole(roles);

  useEffect(() => {
    if (!allowed && redirect) {
      void navigate({ to: redirectTo });
    }
  }, [allowed, redirect, redirectTo, navigate]);

  if (!allowed) {
    if (redirect) return null; // redirecting via useEffect
    return <>{fallback ?? <UnauthorizedPage />}</>;
  }

  return <>{children}</>;
}

// ── PermissionGuard component ─────────────────────────────────────────────────

interface PermissionGuardProps {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * PermissionGuard — renders children only when the current user has the
 * specified permission (derived from their roles).
 */
export function PermissionGuard({ permission, fallback, children }: PermissionGuardProps) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <>{fallback ?? null}</>;
  return <>{children}</>;
}

// ── useAuthorization hook ─────────────────────────────────────────────────────

/**
 * useAuthorization — convenience hook exposing RBAC helpers.
 *
 * @example
 *   const { hasRole, hasPermission } = useAuthorization();
 *   if (!hasRole(Role.ADMIN)) return <Redirect to="/" />;
 */
export function useAuthorization() {
  return useAuth();
}

// Re-export Role and Permission for convenience
export { Role, Permission };
