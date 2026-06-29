import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/qb/Layout";
import { AdminIntegrationPanel } from "@/components/qb/AdminIntegrationPanel";

export const Route = createFileRoute("/admin-integrations")({
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
      <AdminIntegrationPanel />
    </Layout>
  );
}
