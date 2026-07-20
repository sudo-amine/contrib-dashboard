import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, kcpUrl } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API client", () => {
  it("encodes logical cluster paths as one URL segment", () => {
    expect(kcpUrl("root:org/team", "/apis/example.io/v1/widgets"))
      .toBe("/api/kcp/clusters/root%3Aorg%2Fteam/apis/example.io/v1/widgets");
  });

  it("sends JSON requests with the expected headers", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetch);

    await expect(api.post("/widgets", { name: "demo" })).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith("/widgets", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "demo" }),
      headers: expect.objectContaining({
        accept: "application/json",
        "content-type": "application/json",
      }),
    }));
  });

  it("preserves Kubernetes error details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ kind: "Status", message: "widgets is forbidden" }),
      { status: 403, statusText: "Forbidden" },
    )));

    const error = await api.get("/widgets").catch(value => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 403,
      message: "widgets is forbidden",
      body: { kind: "Status", message: "widgets is forbidden" },
    });
  });
});
