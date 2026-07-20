import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverResources } from "./discovery";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("discoverResources", () => {
  it("filters unusable resources and classifies their origin", async () => {
    const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));
    vi.stubGlobal("fetch", vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/apibindings")) return json({ items: [{
        status: { boundResources: [{ group: "example.io", resource: "widgets" }] },
      }] });
      if (url.endsWith("/api/v1")) return json({
        groupVersion: "v1",
        resources: [
          { name: "pods", kind: "Pod", namespaced: true, verbs: ["get", "list"] },
          { name: "pods/status", kind: "Pod", namespaced: true, verbs: ["get"] },
        ],
      });
      if (url.endsWith("/apis")) return json({ groups: [
        { preferredVersion: { groupVersion: "example.io/v1", version: "v1" } },
        { preferredVersion: { groupVersion: "custom.dev/v1", version: "v1" } },
      ] });
      if (url.endsWith("/apis/example.io/v1")) return json({
        groupVersion: "example.io/v1",
        resources: [{ name: "widgets", kind: "Widget", namespaced: false, verbs: ["list"] }],
      });
      if (url.endsWith("/apis/custom.dev/v1")) return json({
        groupVersion: "custom.dev/v1",
        resources: [
          { name: "gadgets", kind: "Gadget", namespaced: false, verbs: ["get", "list"] },
          { name: "hidden", kind: "Hidden", namespaced: false, verbs: ["get"] },
        ],
      });
      throw new Error(`Unexpected request: ${url}`);
    }));

    const resources = await discoverResources("root:demo");

    expect(resources.map(({ kind, origin }) => ({ kind, origin }))).toEqual([
      { kind: "Pod", origin: "native" },
      { kind: "Gadget", origin: "crd" },
      { kind: "Widget", origin: "apibinding" },
    ]);
  });
});
