// Old address for the support page: keep invite links working.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/people")({
  validateSearch: (search: Record<string, unknown>): { code?: string } => {
    const code = search["code"];
    return typeof code === "string" ? { code: code.slice(0, 12) } : {};
  },
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/support", search, replace: true });
  },
});
