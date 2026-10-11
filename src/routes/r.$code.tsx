import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Short invite links (/r/{code}) forward to the Support page, which redeems
 * the code automatically once the visitor is signed in.
 */
export const Route = createFileRoute("/r/$code")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/support",
      search: { code: params.code },
    });
  },
});
