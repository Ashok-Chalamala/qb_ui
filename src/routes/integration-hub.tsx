import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/qb/Layout";
import { IntegrationHub } from "@/components/qb/IntegrationHub";

export const Route = createFileRoute("/integration-hub")({
  head: () => ({
    meta: [
      { title: "Integration Hub · Quest Beyond" },
      { name: "description", content: "Manage secure healthcare data integrations with EPIC FHIR, Cerner, labs, and third-party APIs." },
    ],
  }),
  component: IntegrationHubPage,
});

function IntegrationHubPage() {
  return (
    <Layout>
      <IntegrationHub />
    </Layout>
  );
}
