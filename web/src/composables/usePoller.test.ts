import { afterEach, describe, expect, it, vi } from "vitest";
import { usePoller } from "./usePoller";

afterEach(() => {
  vi.useRealTimers();
});

describe("usePoller", () => {
  it("polls immediately and stops when the predicate succeeds", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn()
      .mockResolvedValueOnce("pending")
      .mockResolvedValueOnce("ready");
    const poller = usePoller(fetch, value => value === "ready", {
      interval: 100,
      timeout: 1_000,
    });

    const finished = poller.poll();
    expect(poller.state.value).toBe("polling");
    await vi.advanceTimersByTimeAsync(100);
    await finished;

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(poller.state.value).toBe("idle");
  });

  it("retries errors and times out at the configured deadline", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockRejectedValue(new Error("temporary"));
    const poller = usePoller(fetch, () => false, {
      interval: 100,
      timeout: 250,
    });

    const finished = poller.poll();
    await vi.advanceTimersByTimeAsync(250);
    await finished;

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(poller.state.value).toBe("timeout");
  });

  it("does not let a stopped in-flight request update state", async () => {
    let resolveFetch!: (value: string) => void;
    const fetch = vi.fn(() => new Promise<string>(resolve => {
      resolveFetch = resolve;
    }));
    const done = vi.fn(() => true);
    const poller = usePoller(fetch, done);

    const finished = poller.poll();
    poller.stop();
    resolveFetch("ready");
    await finished;

    expect(done).not.toHaveBeenCalled();
    expect(poller.state.value).toBe("idle");
  });

  it("invalidates an older run when polling starts again", async () => {
    let resolveFirst!: (value: string) => void;
    const fetch = vi.fn()
      .mockImplementationOnce(() => new Promise<string>(resolve => {
        resolveFirst = resolve;
      }))
      .mockResolvedValueOnce("ready");
    const done = vi.fn(value => value === "ready");
    const poller = usePoller(fetch, done);

    const first = poller.poll();
    const second = poller.poll();
    await second;
    resolveFirst("ready");
    await first;

    expect(done).toHaveBeenCalledTimes(1);
    expect(poller.state.value).toBe("idle");
  });
});
