import { ref } from "vue";

export type PollState = "idle" | "polling" | "timeout";

interface PollOptions {
  interval?: number;  // ms between attempts (default 1500)
  timeout?: number;   // ms before giving up (default 15000)
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function usePoller<T>(
  fetch: () => Promise<T>,
  done: (result: T) => boolean,
  opts: PollOptions = {},
) {
  const interval = opts.interval ?? 1500;
  const timeout  = opts.timeout  ?? 15_000;

  const state = ref<PollState>("idle");
  let generation = 0;

  function stop() {
    generation++;
    if (state.value === "polling") state.value = "idle";
  }

  function reset() {
    generation++;
    state.value = "idle";
  }

  /** Runs the polling loop to completion — resolves when done, timed out, or stopped. */
  async function poll(): Promise<void> {
    const run = ++generation;
    state.value = "polling";
    const deadline = Date.now() + timeout;

    while (run === generation) {
      try {
        const result = await fetch();
        if (run !== generation) return;
        if (done(result)) {
          state.value = "idle";
          generation++;
          return;
        }
      } catch { /* keep trying on fetch errors */ }

      if (run !== generation) return;
      if (Date.now() >= deadline) {
        state.value = "timeout";
        generation++;
        return;
      }

      await sleep(Math.min(interval, Math.max(0, deadline - Date.now())));
    }
  }

  return { state, poll, reset, stop };
}
