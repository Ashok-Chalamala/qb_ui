import { describe, expect, it } from "vitest";
import { Role, type AuthUser } from "@/lib/auth";
import { getAdminIntegrationsRedirect } from "@/routes/admin-integrations";

describe("admin integration route guard", () => {
  it("redirects unauthenticated users to login", () => {
    expect(getAdminIntegrationsRedirect(null)).toBe("/login");
  });

  it("redirects non-admin users to dashboard", () => {
    const patientUser: AuthUser = {
      id: "patient-1",
      email: "patient@test.com",
      fullName: "Patient User",
      mrn: "1001",
      condition: "",
      age: 45,
      roles: [Role.PATIENT],
    };

    expect(getAdminIntegrationsRedirect(patientUser)).toBe("/");
  });

  it("allows admin users to stay on admin route", () => {
    const adminUser: AuthUser = {
      id: "admin-1",
      email: "admin@test.com",
      fullName: "Admin User",
      mrn: "",
      condition: "",
      age: 0,
      roles: [Role.ADMIN],
    };

    expect(getAdminIntegrationsRedirect(adminUser)).toBeNull();
  });

  it("redirects to login after logout clears auth", () => {
    const beforeLogout: AuthUser = {
      id: "admin-1",
      email: "admin@test.com",
      fullName: "Admin User",
      mrn: "",
      condition: "",
      age: 0,
      roles: [Role.ADMIN],
    };

    expect(getAdminIntegrationsRedirect(beforeLogout)).toBeNull();

    const afterLogout = null;
    expect(getAdminIntegrationsRedirect(afterLogout)).toBe("/login");
  });
});
