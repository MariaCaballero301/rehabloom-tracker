import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
  const query: Record<string, unknown> = {};
  for (const name of ["select", "eq"]) query[name] = () => query;
  const read = vi.fn().mockResolvedValue({ data: null, error: null });
  query["maybeSingle"] = read;
  const channel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
  return { read, channel, client: { rpc: vi.fn().mockResolvedValue({ error: null }), from: vi.fn(() => query), channel: vi.fn(() => channel), removeChannel: vi.fn() } };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: mock.client }));
import { useInboxTyping } from "@/components/network/useInboxTyping";

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); mock.read.mockResolvedValue({ data: null, error: null }); });
describe("Inbox typing presence", () => {
  it("sends only presence, throttles keystrokes and stops on clearing", async () => {
    const hook = renderHook(() => useInboxTyping("me", "buddy", true));
    act(() => { hook.result.current.updateTyping(true); hook.result.current.updateTyping(true); });
    await waitFor(() => expect(mock.client.rpc).toHaveBeenCalledTimes(1));
    expect(mock.client.rpc).toHaveBeenCalledWith("set_inbox_typing", { p_to: "buddy", p_typing: true });
    act(() => hook.result.current.updateTyping(false));
    await waitFor(() => expect(mock.client.rpc).toHaveBeenLastCalledWith("set_inbox_typing", { p_to: "buddy", p_typing: false }));
    hook.unmount();
  });
  it("stops typing after three seconds without input", async () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useInboxTyping("me", "buddy", true));
    await act(async () => { hook.result.current.updateTyping(true); });
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(mock.client.rpc).toHaveBeenLastCalledWith("set_inbox_typing", { p_to: "buddy", p_typing: false });
    hook.unmount();
  });
  it("expires a received indicator even when no stop event arrives", async () => {
    vi.useFakeTimers();
    mock.read.mockResolvedValue({ data: { expires_at: new Date(Date.now() + 1500).toISOString() }, error: null });
    const hook = renderHook(() => useInboxTyping("me", "buddy", true));
    await act(async () => {});
    expect(hook.result.current.typing).toBe(true);
    act(() => vi.advanceTimersByTime(1500));
    expect(hook.result.current.typing).toBe(false);
    hook.unmount();
  });
  it("never publishes or subscribes for ended connections", () => {
    const hook = renderHook(() => useInboxTyping("me", "buddy", false));
    act(() => hook.result.current.updateTyping(true));
    expect(mock.client.rpc).not.toHaveBeenCalled();
    expect(mock.client.channel).not.toHaveBeenCalled();
    hook.unmount();
  });
});