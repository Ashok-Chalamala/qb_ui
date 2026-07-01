import { describe, it, expect, beforeEach } from "vitest";
import {
  login,
  logout,
  isLoggedIn,
  getAuthUser,
  hasRole,
  hasAnyRole,
  hasPermission,
  MOCK_USERS,
  Role,
  Permission,
  type AuthUser,
} from "@/lib/auth";

// ── Auth module unit tests ────────────────────────────────────────────────────

describe("auth module", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  // ── login() ────────────────────────────────────────────────────────────────

  describe("login()", () => {
    it("returns success with valid patient credentials", () => {
      const result = login("sarah.martinez@questbeyond.com", "Patient@2026");
      expect(result.success).toBe(true);
      expect(result.user?.fullName).toBe("Sarah Martinez");
      expect(result.user?.role).toBe("patient");
      expect(result.error).toBeUndefined();
    });

    it("returns success with second patient credentials", () => {
      const result = login("james.lee@questbeyond.com", "Patient@2026");
      expect(result.success).toBe(true);
      expect(result.user?.fullName).toBe("James Lee");
    });

    it("returns success with admin credentials", () => {
      const result = login("admin@questbeyond.com", "Admin@2026");
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe("admin");
    });

    it("is case-insensitive for email", () => {
      const result = login("SARAH.MARTINEZ@questbeyond.com", "Patient@2026");
      expect(result.success).toBe(true);
    });

    it("trims whitespace from email", () => {
      const result = login("  sarah.martinez@questbeyond.com  ", "Patient@2026");
      expect(result.success).toBe(true);
    });

    it("fails with wrong password", () => {
      const result = login("sarah.martinez@questbeyond.com", "WrongPass");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email or password.");
    });

    it("fails with unknown email", () => {
      const result = login("unknown@example.com", "Patient@2026");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email or password.");
    });

    it("fails with empty credentials", () => {
      const result = login("", "");
      expect(result.success).toBe(false);
    });

    it("does not store password in session after login", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      const raw = sessionStorage.getItem("qb_auth_user");
      expect(raw).not.toBeNull();
      const stored = JSON.parse(raw!);
      expect(stored.password).toBeUndefined();
    });

    it("stores roles in session after login", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      const user = getAuthUser();
      expect(user?.roles).toContain(Role.PATIENT);
    });

    it("stores ADMIN role for admin user after login", () => {
      login("admin@questbeyond.com", "Admin@2026");
      const user = getAuthUser();
      expect(user?.roles).toContain(Role.ADMIN);
    });

    it("persists user to sessionStorage on success", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      const stored = sessionStorage.getItem("qb_auth_user");
      expect(stored).not.toBeNull();
    });

    it("does NOT persist to sessionStorage on failure", () => {
      login("bad@example.com", "badpassword");
      expect(sessionStorage.getItem("qb_auth_user")).toBeNull();
    });
  });

  // ── logout() ───────────────────────────────────────────────────────────────

  describe("logout()", () => {
    it("removes session after logout", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      expect(isLoggedIn()).toBe(true);
      logout();
      expect(isLoggedIn()).toBe(false);
    });

    it("is safe to call when not logged in", () => {
      expect(() => logout()).not.toThrow();
    });
  });

  // ── isLoggedIn() ───────────────────────────────────────────────────────────

  describe("isLoggedIn()", () => {
    it("returns false when no session exists", () => {
      expect(isLoggedIn()).toBe(false);
    });

    it("returns true after successful login", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      expect(isLoggedIn()).toBe(true);
    });

    it("returns false after logout", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      logout();
      expect(isLoggedIn()).toBe(false);
    });

    it("returns false when sessionStorage has corrupted data", () => {
      sessionStorage.setItem("qb_auth_user", "{invalid json}");
      expect(isLoggedIn()).toBe(false);
    });
  });

  // ── getAuthUser() ──────────────────────────────────────────────────────────

  describe("getAuthUser()", () => {
    it("returns null when not logged in", () => {
      expect(getAuthUser()).toBeNull();
    });

    it("returns the user object after login", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      const user = getAuthUser();
      expect(user).not.toBeNull();
      expect(user?.email).toBe("sarah.martinez@questbeyond.com");
      expect(user?.fullName).toBe("Sarah Martinez");
      expect(user?.mrn).toBe("00429");
    });

    it("returns null after logout", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      logout();
      expect(getAuthUser()).toBeNull();
    });
  });

  // ── MOCK_USERS data integrity ──────────────────────────────────────────────

  describe("MOCK_USERS", () => {
    it("contains at least one patient and one admin", () => {
      const patients = MOCK_USERS.filter((u) => u.roles.includes(Role.PATIENT));
      const admins = MOCK_USERS.filter((u) => u.roles.includes(Role.ADMIN));
      expect(patients.length).toBeGreaterThanOrEqual(1);
      expect(admins.length).toBeGreaterThanOrEqual(1);
    });

    it("all users have unique ids", () => {
      const ids = MOCK_USERS.map((u) => u.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(MOCK_USERS.length);
    });

    it("all users have unique emails", () => {
      const emails = MOCK_USERS.map((u) => u.email.toLowerCase());
      const unique = new Set(emails);
      expect(unique.size).toBe(MOCK_USERS.length);
    });

    it("primary patient has correct MRN", () => {
      const sarah = MOCK_USERS.find((u) => u.id === "patient-00429");
      expect(sarah?.mrn).toBe("00429");
      expect(sarah?.condition).toBe("Type 2 Diabetes");
    });

    it("all users have a non-empty roles array", () => {
      MOCK_USERS.forEach((u) => {
        expect(u.roles.length).toBeGreaterThan(0);
      });
    });
  });

  // ── RBAC: hasRole() ────────────────────────────────────────────────────────

  describe("hasRole()", () => {
    const patientUser: AuthUser = {
      id: "p1", email: "p@test.com", fullName: "Patient", mrn: "001",
      condition: "", age: 30, roles: [Role.PATIENT],
    };
    const adminUser: AuthUser = {
      id: "a1", email: "a@test.com", fullName: "Admin", mrn: "",
      condition: "", age: 0, roles: [Role.ADMIN],
    };

    it("returns true when user has the role", () => {
      expect(hasRole(patientUser, Role.PATIENT)).toBe(true);
      expect(hasRole(adminUser, Role.ADMIN)).toBe(true);
    });

    it("returns false when user lacks the role", () => {
      expect(hasRole(patientUser, Role.ADMIN)).toBe(false);
      expect(hasRole(adminUser, Role.PATIENT)).toBe(false);
    });

    it("returns false for null user", () => {
      expect(hasRole(null, Role.ADMIN)).toBe(false);
    });
  });

  // ── RBAC: hasAnyRole() ─────────────────────────────────────────────────────

  describe("hasAnyRole()", () => {
    const patientUser: AuthUser = {
      id: "p1", email: "p@test.com", fullName: "Patient", mrn: "001",
      condition: "", age: 30, roles: [Role.PATIENT],
    };

    it("returns true when user has at least one matching role", () => {
      expect(hasAnyRole(patientUser, [Role.PATIENT, Role.ADMIN])).toBe(true);
    });

    it("returns false when user has none of the roles", () => {
      expect(hasAnyRole(patientUser, [Role.ADMIN])).toBe(false);
    });

    it("returns false for null user", () => {
      expect(hasAnyRole(null, [Role.ADMIN, Role.PATIENT])).toBe(false);
    });
  });

  // ── RBAC: hasPermission() ──────────────────────────────────────────────────

  describe("hasPermission()", () => {
    const patientUser: AuthUser = {
      id: "p1", email: "p@test.com", fullName: "Patient", mrn: "001",
      condition: "", age: 30, roles: [Role.PATIENT],
    };
    const adminUser: AuthUser = {
      id: "a1", email: "a@test.com", fullName: "Admin", mrn: "",
      condition: "", age: 0, roles: [Role.ADMIN],
    };

    it("PATIENT can view dashboard", () => {
      expect(hasPermission(patientUser, Permission.VIEW_DASHBOARD)).toBe(true);
    });

    it("PATIENT cannot access admin hub", () => {
      expect(hasPermission(patientUser, Permission.VIEW_ADMIN_HUB)).toBe(false);
    });

    it("ADMIN can access admin hub", () => {
      expect(hasPermission(adminUser, Permission.VIEW_ADMIN_HUB)).toBe(true);
    });

    it("ADMIN can manage integrations", () => {
      expect(hasPermission(adminUser, Permission.MANAGE_INTEGRATIONS)).toBe(true);
    });

    it("PATIENT cannot manage integrations", () => {
      expect(hasPermission(patientUser, Permission.MANAGE_INTEGRATIONS)).toBe(false);
    });

    it("returns false for null user", () => {
      expect(hasPermission(null, Permission.VIEW_DASHBOARD)).toBe(false);
    });
  });

  // ── RBAC: session persists roles correctly ─────────────────────────────────

  describe("RBAC session integration", () => {
    it("PATIENT user session has PATIENT role only", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      const user = getAuthUser();
      expect(user?.roles).toEqual([Role.PATIENT]);
      expect(user?.roles).not.toContain(Role.ADMIN);
    });

    it("ADMIN user session has ADMIN role only", () => {
      login("admin@questbeyond.com", "Admin@2026");
      const user = getAuthUser();
      expect(user?.roles).toEqual([Role.ADMIN]);
      expect(user?.roles).not.toContain(Role.PATIENT);
    });

    it("PATIENT cannot access admin after login", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      const user = getAuthUser();
      expect(hasPermission(user, Permission.VIEW_ADMIN_HUB)).toBe(false);
    });

    it("ADMIN can access admin hub after login", () => {
      login("admin@questbeyond.com", "Admin@2026");
      const user = getAuthUser();
      expect(hasPermission(user, Permission.VIEW_ADMIN_HUB)).toBe(true);
    });
  });
});


// ── Auth module unit tests ────────────────────────────────────────────────────

describe("auth module", () => {
  beforeEach(() => {
    // Reset sessionStorage between tests
    sessionStorage.clear();
  });

  // ── login() ────────────────────────────────────────────────────────────────

  describe("login()", () => {
    it("returns success with valid patient credentials", () => {
      const result = login("sarah.martinez@questbeyond.com", "Patient@2026");
      expect(result.success).toBe(true);
      expect(result.user?.fullName).toBe("Sarah Martinez");
      expect(result.user?.role).toBe("patient");
      expect(result.error).toBeUndefined();
    });

    it("returns success with second patient credentials", () => {
      const result = login("james.lee@questbeyond.com", "Patient@2026");
      expect(result.success).toBe(true);
      expect(result.user?.fullName).toBe("James Lee");
    });

    it("returns success with admin credentials", () => {
      const result = login("admin@questbeyond.com", "Admin@2026");
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe("admin");
    });

    it("is case-insensitive for email", () => {
      const result = login("SARAH.MARTINEZ@questbeyond.com", "Patient@2026");
      expect(result.success).toBe(true);
    });

    it("trims whitespace from email", () => {
      const result = login("  sarah.martinez@questbeyond.com  ", "Patient@2026");
      expect(result.success).toBe(true);
    });

    it("fails with wrong password", () => {
      const result = login("sarah.martinez@questbeyond.com", "WrongPass");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email or password.");
    });

    it("fails with unknown email", () => {
      const result = login("unknown@example.com", "Patient@2026");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email or password.");
    });

    it("fails with empty credentials", () => {
      const result = login("", "");
      expect(result.success).toBe(false);
    });

    it("does not store password in session after login", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      const raw = sessionStorage.getItem("qb_auth_user");
      expect(raw).not.toBeNull();
      const stored = JSON.parse(raw!);
      expect(stored.password).toBeUndefined();
    });

    it("persists user to sessionStorage on success", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      const stored = sessionStorage.getItem("qb_auth_user");
      expect(stored).not.toBeNull();
    });

    it("does NOT persist to sessionStorage on failure", () => {
      login("bad@example.com", "badpassword");
      expect(sessionStorage.getItem("qb_auth_user")).toBeNull();
    });
  });

  // ── logout() ───────────────────────────────────────────────────────────────

  describe("logout()", () => {
    it("removes session after logout", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      expect(isLoggedIn()).toBe(true);
      logout();
      expect(isLoggedIn()).toBe(false);
    });

    it("is safe to call when not logged in", () => {
      expect(() => logout()).not.toThrow();
    });
  });

  // ── isLoggedIn() ───────────────────────────────────────────────────────────

  describe("isLoggedIn()", () => {
    it("returns false when no session exists", () => {
      expect(isLoggedIn()).toBe(false);
    });

    it("returns true after successful login", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      expect(isLoggedIn()).toBe(true);
    });

    it("returns false after logout", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      logout();
      expect(isLoggedIn()).toBe(false);
    });

    it("returns false when sessionStorage has corrupted data", () => {
      sessionStorage.setItem("qb_auth_user", "{invalid json}");
      expect(isLoggedIn()).toBe(false);
    });
  });

  // ── getAuthUser() ──────────────────────────────────────────────────────────

  describe("getAuthUser()", () => {
    it("returns null when not logged in", () => {
      expect(getAuthUser()).toBeNull();
    });

    it("returns the user object after login", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      const user = getAuthUser();
      expect(user).not.toBeNull();
      expect(user?.email).toBe("sarah.martinez@questbeyond.com");
      expect(user?.fullName).toBe("Sarah Martinez");
      expect(user?.mrn).toBe("00429");
    });

    it("returns null after logout", () => {
      login("sarah.martinez@questbeyond.com", "Patient@2026");
      logout();
      expect(getAuthUser()).toBeNull();
    });
  });

  // ── MOCK_USERS data integrity ──────────────────────────────────────────────

  describe("MOCK_USERS", () => {
    it("contains at least one patient and one admin", () => {
      const patients = MOCK_USERS.filter((u) => u.role === "patient");
      const admins = MOCK_USERS.filter((u) => u.role === "admin");
      expect(patients.length).toBeGreaterThanOrEqual(1);
      expect(admins.length).toBeGreaterThanOrEqual(1);
    });

    it("all users have unique ids", () => {
      const ids = MOCK_USERS.map((u) => u.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(MOCK_USERS.length);
    });

    it("all users have unique emails", () => {
      const emails = MOCK_USERS.map((u) => u.email.toLowerCase());
      const unique = new Set(emails);
      expect(unique.size).toBe(MOCK_USERS.length);
    });

    it("primary patient has correct MRN", () => {
      const sarah = MOCK_USERS.find((u) => u.id === "patient-00429");
      expect(sarah?.mrn).toBe("00429");
      expect(sarah?.condition).toBe("Type 2 Diabetes");
    });
  });
});
