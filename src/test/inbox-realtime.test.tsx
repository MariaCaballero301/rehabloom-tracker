import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
  const channels = new Map<string, { subscribed: boolean; callbacks: number; on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> }>();
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order"]) query[method] = () => query;
  query["then"] = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
  return {
    channels,
    client: {
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      from: vi.fn(() => query),
      channel: vi.fn((name: string) => {
        const existing = channels.get(name);
        if (existing) return existing;
        const channel = {
          subscribed: false, callbacks: 0,
          on: vi.fn(() => {
            if (channel.subscribed) throw new Error("cannot add callbacks after subscribe");
            channel.callbacks++;
            return channel;
          }),
          subscribe: vi.fn(() => { channel.subscribed = true; return channel; }),
        };
        channels.set(name, channel);
        return channel;
      }),
      // Model pending asynchronous cleanup: the old topic remains registered.
      removeChannel: vi.fn(() => new Promise(() => {})),
    },
  };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: mock.client }));
import { useInbox } from "@/components/network/useInbox";

describe("Inbox Realtime lifecycle", () => {
  it("creates fresh channels when effects reconnect before cleanup finishes", async () => {
    const hook = renderHook(() => useInbox("same-account"));
    await waitFor(() => expect(hook.result.current.revision).toBeGreaterThan(0));
    hook.unmount();
    const reconnected = renderHook(() => useInbox("same-account"));
    await waitFor(() => expect(reconnected.result.current.revision).toBeGreaterThan(0));
    expect(mock.client.channel).toHaveBeenCalledTimes(2);
    expect(mock.channels.size).toBe(2);
    for (const channel of mock.channels.values()) {
      expect(channel.callbacks).toBe(4);
      expect(channel.subscribe).toHaveBeenCalledTimes(1);
    }
    reconnected.unmount();
    expect(mock.client.removeChannel).toHaveBeenCalledTimes(2);
  });
});