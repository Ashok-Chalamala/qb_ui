import { createFileRoute, redirect } from "@tanstack/react-router";
import { Layout } from "@/components/qb/Layout";
import { AdminIntegrationPanel } from "@/components/qb/AdminIntegrationPanel";
import { RoleGuard, Role } from "@/components/qb/RoleGuard";
import { getAuthUser } from "@/lib/auth";

export const Route = createFileRoute("/admin-integrations")({
  // Route-level guard: blocks direct URL navigation for non-ADMIN users
  beforeLoad: () => {
    const user = getAuthUser();
    const isAdmin = user?.roles.includes(Role.ADMIN) ?? false;
    if (!isAdmin) {
      throw redirect({ to: "/" });
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
      <RoleGuard roles={[Role.ADMIN]} redirect redirectTo="/">
        <AdminIntegrationPanel />
      </RoleGuard>
    </Layout>
  );
}
