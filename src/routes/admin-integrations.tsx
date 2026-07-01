import { createFileRoute, redirect } from "@tanstack/react-router";
import { Layout } from "@/components/qb/Layout";
import { AdminIntegrationPanel } from "@/components/qb/AdminIntegrationPanel";
import { RoleGuard, Role } from "@/components/qb/RoleGuard";
import { getAuthUser, type AuthUser } from "@/lib/auth";

export function getAdminIntegrationsRedirect(user: AuthUser | null): "/login" | "/" | null {
  if (!user) return "/login";
  if (!user.roles.includes(Role.ADMIN)) return "/";
  return null;
}

export const Route = createFileRoute("/admin-integrations")({
  // Route-level guard: blocks direct URL navigation for non-ADMIN users
  beforeLoad: () => {
    const user = getAuthUser();
    const redirectTo = getAdminIntegrationsRedirect(user);
    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin Integration Management · Quest Beyond" },
      { name: "description", content: "Admin-only panel for configuring healthcare provider integrations, FHIR endpoints, OAuth, certificates, and data mappings." },
    ],
  }),
  component: AdminIntegrationsPage,
});

function AdminIntegrationsPage() {
  return (
    <Layout>
      {/* Page-level guard: double-checks role in case of client-side state issues */}
      <RoleGuard roles={[Role.ADMIN]} redirect redirectTo="/login">
        <AdminIntegrationPanel />
      </RoleGuard>
    </Layout>
  );
}
