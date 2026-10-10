import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import aeroLandscape from "@/assets/aero-landscape.jpg";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { XpFishLayer } from "@/components/XpFish";
import { SupportPopups } from "@/components/alerts/SupportPopups";
import { HomeInbox } from "@/components/network/HomeInbox";
import { SessionsBubble } from "@/components/sessions/SessionsBubble";
import { useSessionUser } from "@/hooks/use-session-user";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    if (STALE_CHUNK.test(String((error as Error | undefined)?.message ?? "")) && reloadForStaleChunk()) return;
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Rehabloom" },
      { name: "description", content: "Physical therapy exercise accountability." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Varela+Round&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="aero-background" aria-hidden="true">
          <img src={aeroLandscape} alt="" width={1536} height={1024} />
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// After an update, old page chunks are gone; reload once so the browser fetches the new version.
const STALE_CHUNK = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;
function reloadForStaleChunk() {
  const key = "rehabloom:chunk-reload";
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last < 10_000) return false;
  sessionStorage.setItem(key, String(Date.now()));
  window.location.reload();
  return true;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { user } = useSessionUser();

  useEffect(() => {
    const onPreload = (e: Event) => { if (reloadForStaleChunk()) e.preventDefault(); };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (STALE_CHUNK.test(String((e.reason as Error)?.message ?? e.reason))) reloadForStaleChunk();
    };
    window.addEventListener("vite:preloadError", onPreload);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("vite:preloadError", onPreload);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      {user ? <HomeInbox key={user.id} userId={user.id}><Outlet /><SessionsBubble userId={user.id} /></HomeInbox> : <Outlet />}
      <Toaster position="top-center" richColors />
      <XpFishLayer />
      <SupportPopups />
    </QueryClientProvider>
  );
}
