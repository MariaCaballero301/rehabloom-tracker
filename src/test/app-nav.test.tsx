import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, type ReactNode } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock("@/components/AccountProfile", () => ({ AccountProfile: () => null }));
vi.mock("@/components/SoundToggle", () => ({ SoundToggle: () => null }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) =>
    <a href={to} className={className}>{children}</a>,
}));

import { AppNav } from "@/components/AppNav";
import { supabase } from "@/integrations/supabase/client";

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  vi.mocked(supabase.auth.signOut).mockClear();
});

const setScroll = (value: number) => {
  Object.defineProperty(window, "scrollY", { value, configurable: true });
  act(() => { window.dispatchEvent(new Event("scroll")); });
};

describe("Sticky main navigation", () => {
  it("shows the gloss underlay only after the page has been scrolled", () => {
    render(<AppNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toHaveAttribute("data-scrolled", "false");
    setScroll(120);
    expect(nav).toHaveAttribute("data-scrolled", "true");
    setScroll(0);
    expect(nav).toHaveAttribute("data-scrolled", "false");
  });

  it("keeps the three destinations in the pinned row", () => {
    render(<AppNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect([...nav.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["/", "/progress", "/support"]);
    screen.getByRole("button", { name: "Sign out" }).click();
    expect(vi.mocked(supabase.auth.signOut)).toHaveBeenCalled();
  });
});
