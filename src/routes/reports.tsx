import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reports")({
  beforeLoad: () => {
    throw redirect({ to: "/source-data", search: { tab: "reports" } });
  },
  component: () => null,
});
