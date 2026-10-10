import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const callbacks: ((payload: unknown) => void)[] = [];
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order", "limit", "or", "in", "gte"]) query[method] = () => query;
  query["then"] = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
  const channel = { on: vi.fn((_event, _filter, callback) => { callbacks.push(callback); return channel; }), subscribe: vi.fn(() => channel) };
  return { callbacks, toast: vi.fn(), client: {
    from: vi.fn(() => query), channel: vi.fn(() => channel), removeChannel: vi.fn(),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }), onAuthStateChange: vi.fn(() => ({ data: { sub: { subscription: { unsubscribe: vi.fn() } }, subscription: { unsubscribe: vi.fn() } } })) },
  } };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks.client }));
vi.mock("@/components/network/useNetwork", () => ({ db: mocks.client, rpc: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useLocation: () => "/" }));
vi.mock("@/components/network/useInbox", () => ({ useInbox: () => ({ channels: [], requests: [], count: 0, unreadByChannel: {}, revision: 0, reload: vi.fn() }) }));
vi.mock("@/components/network/InboxCard", () => ({ InboxCard: () => null }));
vi.mock("@/components/network/InboxConversation", () => ({ InboxConversation: () => null }));
vi.mock("@/components/sessions/PlanSessionDialog", () => ({ PlanSessionDialog: () => null }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
import { HomeInbox } from "@/components/network/HomeInbox";
import { SessionsBubble } from "@/components/sessions/SessionsBubble";
import { SupportPopups } from "@/components/alerts/SupportPopups";

afterEach(() => { cleanup(); mocks.callbacks.length = 0; mocks.toast.mockClear(); });

describe("exclusive side panels", () => {
  it("opens Sessions from the real toast Open action and closes Inbox", async () => {
    render(<><HomeInbox userId="owner"><p>Home</p></HomeInbox><SessionsBubble userId="owner" /><SupportPopups /></>);
    fireEvent.click(screen.getByRole("button", { name: "Open Inbox" }));
    expect(screen.getByRole("complementary", { name: "Inbox" })).toBeInTheDocument();
    await waitFor(() => expect(mocks.callbacks).toHaveLength(7));
    act(() => mocks.callbacks[4]?.({ new: { patient_name: "Buddy" } }));
    const options = mocks.toast.mock.calls[0]?.[1] as { action: { label: string; onClick: () => void } };
    expect(options.action.label).toBe("Open");
    act(() => options.action.onClick());
    expect(screen.getByRole("complementary", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Inbox" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close Sessions" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Inbox" }));
    expect(screen.getByRole("complementary", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Sessions" })).not.toBeInTheDocument();
  });
});