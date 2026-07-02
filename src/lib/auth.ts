// ── Mock Auth Module ──────────────────────────────────────────────────────────
// Simulates authentication for the Quest Beyond patient portal.
// In a real app these credentials would come from a secure backend.
//
// TODO(backend): Replace MOCK_USERS, login(), and sessionStorage persistence
// with real API calls (e.g. POST /auth/login → JWT containing `roles` claim).
// Map JWT claims → AuthUser via parseJwtRoles() before storing in session.

import { useState, useEffect } from "react";

// ── Role definitions ──────────────────────────────────────────────────────────
// TODO(backend): Roles should be returned by the authentication API and mapped
// from the JWT "roles" claim. Add new roles here as the platform grows.

export enum Role {
  ADMIN   = "ADMIN",
  PATIENT = "PATIENT",
  // Future roles — uncomment as needed:
  // CAREGIVER   = "CAREGIVER",
  // PROVIDER    = "PROVIDER",
  // SUPER_ADMIN = "SUPER_ADMIN",
}

// ── Permission definitions (future-ready) ────────────────────────────────────
// TODO(backend): Derive permissions from roles or a dedicated permissions API.

export enum Permission {
  VIEW_ADMIN_HUB     = "VIEW_ADMIN_HUB",
  MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS",
  VIEW_DASHBOARD     = "VIEW_DASHBOARD",
  VIEW_HEALTH_DATA   = "VIEW_HEALTH_DATA",
}

// Role → Permission mapping (centralised — no scattered if/else checks)
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.VIEW_ADMIN_HUB,
    Permission.MANAGE_INTEGRATIONS,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_HEALTH_DATA,
  ],
  [Role.PATIENT]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_HEALTH_DATA,
  ],
};

// ── User model ────────────────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  email: string;
  password: string; // plain-text intentionally — mock only, never do this in prod
  fullName: string;
  mrn: string;
  condition: string;
  age: number;
  /** @deprecated use `roles` array instead */
  role: "patient" | "admin";
  /** RBAC roles assigned to this user */
  roles: Role[];
}

/** Stored in sessionStorage — password stripped, roles included */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  mrn: string;
  condition: string;
  age: number;
  roles: Role[];
}

// ── Mock credential store ─────────────────────────────────────────────────────
// TODO(backend): Remove MOCK_USERS once the real auth API is wired up.

export const MOCK_USERS: MockUser[] = [
  {
    id: "patient-00429",
    email: "sarah.martinez@questbeyond.com",
    password: "Patient@2026",
    fullName: "Sarah Martinez",
    mrn: "00429",
    condition: "Type 2 Diabetes",
    age: 45,
    role: "patient",
    roles: [Role.PATIENT],
  },
  {
    id: "patient-00312",
    email: "james.lee@questbeyond.com",
    password: "Patient@2026",
    fullName: "James Lee",
    mrn: "00312",
    condition: "Hypertension",
    age: 58,
    role: "patient",
    roles: [Role.PATIENT],
  },
  {
    id: "admin-001",
    email: "admin@questbeyond.com",
    password: "Admin@2026",
    fullName: "QBeyond Admin",
    mrn: "",
    condition: "",
    age: 0,
    role: "admin",
    roles: [Role.ADMIN],
  },
];

// ── Storage key ───────────────────────────────────────────────────────────────

const AUTH_KEY = "qb_auth_user";

// ── Auth functions ────────────────────────────────────────────────────────────

/** Returns the authenticated user stored in sessionStorage, or null. */
export function getAuthUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/** Returns true if a user is currently authenticated. */
export function isLoggedIn(): boolean {
  return getAuthUser() !== null;
}

export interface LoginResult {
  success: boolean;
  user?: MockUser;
  error?: string;
}

/**
 * Validates credentials against the FastAPI backend.
 * Falls back to the local mock store if the API is unreachable.
 * On success, persists the AuthUser (no password) to sessionStorage.
 */
export async function loginAsync(email: string, password: string): Promise<LoginResult> {
  const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      return { success: false, error: "Invalid email or password." };
    }
    const apiUser = await res.json() as AuthUser & { roles: string[] };
    const authUser: AuthUser = {
      id: apiUser.id,
      email: apiUser.email,
      fullName: apiUser.fullName,
      mrn: apiUser.mrn,
      condition: apiUser.condition,
      age: apiUser.age,
      roles: apiUser.roles as Role[],
    };
    try {
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    } catch {
      // sessionStorage might be unavailable (e.g., SSR/test env)
    }
    return { success: true };
  } catch {
    // API unreachable — fall back to local mock store
    return login(email, password);
  }
}

/**
 * Validates credentials against the mock store (synchronous fallback).
 * On success, persists the AuthUser (no password) to sessionStorage.
 */
export function login(email: string, password: string): LoginResult {
  const trimmedEmail = email.trim().toLowerCase();
  const user = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === trimmedEmail && u.password === password,
  );

  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  // Strip password before storing; keep roles
  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    mrn: user.mrn,
    condition: user.condition,
    age: user.age,
    roles: user.roles,
  };
  try {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  } catch {
    // sessionStorage might be unavailable (e.g., SSR/test env)
  }

  return { success: true, user };
}

/** Clears the session and logs the user out. */
export function logout(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

// ── RBAC helpers ──────────────────────────────────────────────────────────────

/** Returns true if the given user has the specified role. */
export function hasRole(user: AuthUser | null, role: Role): boolean {
  return user?.roles.includes(role) ?? false;
}

/** Returns true if the given user has at least one of the specified roles. */
export function hasAnyRole(user: AuthUser | null, roles: Role[]): boolean {
  return roles.some((r) => user?.roles.includes(r) ?? false);
}

/** Returns true if the given user has the specified permission (derived from roles). */
export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  return user.roles.some((role) =>
    ROLE_PERMISSIONS[role]?.includes(permission) ?? false,
  );
}

// ── React hook ────────────────────────────────────────────────────────────────

/**
 * useAuth() — reactive hook that reads the current AuthUser from sessionStorage.
 *
 * Returns the user and convenience RBAC helpers:
 *   hasRole(role)         → boolean
 *   hasAnyRole(roles)     → boolean
 *   hasPermission(perm)   → boolean
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());

  // Sync across tabs / after login navigation
  useEffect(() => {
    const sync = () => setUser(getAuthUser());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return {
    user,
    isLoggedIn: user !== null,
    hasRole:       (role: Role)        => hasRole(user, role),
    hasAnyRole:    (roles: Role[])     => hasAnyRole(user, roles),
    hasPermission: (perm: Permission)  => hasPermission(user, perm),
  };
}

