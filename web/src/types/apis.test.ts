import { describe, expect, it } from "vitest";
import type { Condition } from "./kcp";
import type { APIBinding, APIExport } from "./apis";
import { apiBindingStatus, apiExportStatus, isReady } from "./apis";

const condition = (type: string, status: "True" | "False", reason?: string): Condition => ({
  type,
  status,
  reason,
});

const apiExport = (conditions: Condition[] = []): APIExport => ({
  apiVersion: "apis.kcp.io/v1alpha2",
  kind: "APIExport",
  metadata: { name: "widgets" },
  spec: {},
  status: { conditions },
});

const apiBinding = (
  phase: "" | "Binding" | "Bound",
  conditions: Condition[] = [],
): APIBinding => ({
  apiVersion: "apis.kcp.io/v1alpha2",
  kind: "APIBinding",
  metadata: { name: "widgets" },
  spec: { reference: { export: { name: "widgets" } } },
  status: { phase, conditions },
});

describe("condition status helpers", () => {
  it("requires both APIExport readiness conditions", () => {
    expect(apiExportStatus(apiExport([
      condition("IdentityValid", "True"),
      condition("VirtualWorkspaceURLsReady", "True"),
    ]))).toMatchObject({
      ready: true,
      identityValid: true,
      virtualWorkspacesReady: true,
      phase: "Ready",
    });

    expect(apiExportStatus(apiExport([
      condition("IdentityValid", "True"),
      condition("VirtualWorkspaceURLsReady", "False"),
    ])).phase).toBe("No endpoints");
  });

  it("reports an unknown export when no conditions are available", () => {
    expect(apiExportStatus(apiExport())).toMatchObject({
      ready: false,
      phase: "Unknown",
    });
  });

  it("uses InitialBindingCompleted as APIBinding readiness", () => {
    const status = apiBindingStatus(apiBinding("Bound", [
      condition("InitialBindingCompleted", "True"),
      condition("APIExportValid", "False"),
    ]));

    expect(status).toMatchObject({ ready: true, label: "Bound", bindingCompleted: true });
    expect(status.messages).toEqual([
      { type: "Export reachable", ok: false, message: undefined },
      { type: "Initial binding done", ok: true, message: undefined },
    ]);
  });

  it("does not invent failed health checks for missing conditions", () => {
    expect(apiBindingStatus(apiBinding("Bound"))).toMatchObject({
      ready: true,
      label: "Bound",
      messages: [],
    });
    expect(apiBindingStatus(apiBinding(""))).toMatchObject({
      ready: false,
      label: "Pending",
      messages: [],
    });
  });

  it("recognizes a conventional Ready condition", () => {
    expect(isReady([condition("Ready", "True")])).toBe(true);
    expect(isReady([condition("Ready", "False")])).toBe(false);
  });
});
