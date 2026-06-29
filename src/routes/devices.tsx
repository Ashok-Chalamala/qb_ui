import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/devices")({
  beforeLoad: () => {
    throw redirect({ to: "/source-data" });
  },
  component: () => null,
});
