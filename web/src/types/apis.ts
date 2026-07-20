// TypeScript views of apis.kcp.io kinds: APIExport, APIBinding,
// APIResourceSchema, APIExportEndpointSlice.
//
// Note the version split:
//   - APIExport / APIBinding  -> served as v1alpha1 AND v1alpha2 (v1alpha2 is
//     storage). The dashboard reads/writes v1alpha2 but tolerates v1alpha1 shapes.
//   - APIResourceSchema / APIExportEndpointSlice -> v1alpha1 only.

import type { ObjectMeta, Condition } from "./kcp";

export const APIS_GROUP = "apis.kcp.io";
export const APIS_V2 = "v1alpha2";
export const APIS_V1 = "v1alpha1";

// ---- APIExport (v1alpha2) ----

export interface ResourceSchema {
  name: string;
  group: string;
  schema: string;
  storage?: { crd?: Record<string, never>; virtual?: unknown };
}

export interface PermissionClaim {
  group?: string;
  resource: string;
  verbs?: string[];
  identityHash?: string;
}

export interface APIExport {
  apiVersion: string;
  kind: "APIExport";
  metadata: ObjectMeta;
  spec: {
    resources?: ResourceSchema[];
    latestResourceSchemas?: string[];
    permissionClaims?: PermissionClaim[];
    identity?: { secretRef?: { name: string; namespace?: string } };
  };
  status?: {
    identityHash?: string;
    // Legacy VW URLs (pre-APIExportEndpointSlice). Still used by some versions.
    virtualWorkspaces?: { url: string }[];
    conditions?: Condition[];
  };
}

// ---- APIBinding (v1alpha2) ----

export interface AcceptablePermissionClaim extends PermissionClaim {
  state: "Accepted" | "Rejected";
  selector?: { matchAll?: boolean; matchLabels?: Record<string, string> };
}

export interface BoundAPIResource {
  group: string;
  resource: string;
  schema?: { name: string; UID?: string; identityHash?: string };
  storageVersions?: string[];
}

export interface APIBinding {
  apiVersion: string;
  kind: "APIBinding";
  metadata: ObjectMeta;
  spec: {
    reference: { export?: { path?: string; name: string } };
    permissionClaims?: AcceptablePermissionClaim[];
  };
  status?: {
    // "" | "Binding" | "Bound"
    phase?: "" | "Binding" | "Bound";
    apiExportClusterName?: string;
    boundResources?: BoundAPIResource[];
    appliedPermissionClaims?: PermissionClaim[];
    exportPermissionClaims?: PermissionClaim[];
    conditions?: Condition[];
  };
}

// ---- APIExportEndpointSlice (v1alpha1) ----

export interface APIExportEndpointSlice {
  apiVersion: string;
  kind: "APIExportEndpointSlice";
  metadata: ObjectMeta;
  spec: { export?: { path?: string; name: string }; partition?: string };
  status?: {
    endpoints?: { url: string }[];
    conditions?: Condition[];
  };
}

// ---- APIResourceSchema (v1alpha1) ----

export interface APIResourceSchema {
  apiVersion: string;
  kind: "APIResourceSchema";
  metadata: ObjectMeta;
  spec: {
    group: string;
    names: { kind: string; plural: string; singular?: string };
    scope: "Cluster" | "Namespaced";
    versions?: { name: string; served: boolean; storage: boolean }[];
  };
}

// ── Condition helpers ─────────────────────────────────────────────────────────

function condTrue(c: Condition | undefined): boolean {
  return c?.status === "True" || (c?.status as unknown) === true;
}

function findCond(conditions: Condition[] | undefined, type: string): Condition | undefined {
  return conditions?.find(c => c.type === type);
}

export function isReady(conditions?: Condition[]): boolean {
  const c = findCond(conditions, "Ready");
  return !!c && condTrue(c);
}

// ── APIExport status ──────────────────────────────────────────────────────────
//
// Condition types on APIExport (from kcp source):
//   Ready                  — overall readiness
//   IdentityValid          — identity secret present and valid
//   VirtualWorkspaceURLsReady — endpoint URLs provisioned

export interface APIExportStatus {
  ready: boolean;
  identityValid: boolean;
  virtualWorkspacesReady: boolean;
  // Human label for the primary phase badge
  phase: string;
  // condition messages for tooltip / detail (undefined = condition absent)
  identityMessage?: string;
  vwMessage?: string;
  readyMessage?: string;
}

export function apiExportStatus(ex: APIExport): APIExportStatus {
  const conds = ex.status?.conditions ?? [];

  const readyCond = findCond(conds, "Ready");
  const identCond = findCond(conds, "IdentityValid");
  const vwCond    = findCond(conds, "VirtualWorkspaceURLsReady");

  const identityValid = condTrue(identCond);
  const virtualWorkspacesReady = condTrue(vwCond);

  // Current kcp reports readiness through IdentityValid and
  // VirtualWorkspaceURLsReady. Retain support for an explicit Ready condition
  // for older or aggregated API servers.
  let phase: string;
  if (readyCond) {
    if (condTrue(readyCond)) {
      phase = "Ready";
    } else {
      const reason = readyCond.reason ?? "";
      if (reason.includes("Identity"))       phase = "No identity";
      else if (reason.includes("Virtual") || reason.includes("Endpoint")) phase = "No endpoints";
      else                                   phase = reason || "Not ready";
    }
  } else if (identityValid && virtualWorkspacesReady) {
    phase = "Ready";
  } else if (identCond && !identityValid) {
    phase = "No identity";
  } else if (vwCond && !virtualWorkspacesReady) {
    phase = "No endpoints";
  } else if (conds.length) {
    phase = "Pending";
  } else {
    phase = "Unknown";
  }

  const ready = phase === "Ready";

  return {
    ready,
    identityValid,
    virtualWorkspacesReady,
    phase,
    identityMessage: identCond?.message,
    vwMessage: vwCond?.message,
    readyMessage: readyCond?.message,
  };
}

// ── APIBinding status ─────────────────────────────────────────────────────────
//
// Condition types on APIBinding (from kcp source):
//   Ready                       — overall readiness (from printcolumn)
//   APIExportValid              — referenced export is reachable
//   InitialBindingCompleted     — first bind cycle done
//   BindingUpToDate             — schema is current
//   PermissionClaimsValid       — spec claims are valid
//   PermissionClaimsApplied     — claims have been applied
//
// Phases: "" → Binding → Bound

export interface APIBindingStatus {
  phase: "" | "Binding" | "Bound";
  ready: boolean;
  exportValid: boolean;
  bindingCompleted: boolean;
  upToDate: boolean;
  claimsValid: boolean;
  claimsApplied: boolean;
  // badge label
  label: string;
  messages: { type: string; ok: boolean; message?: string }[];
}

export function apiBindingStatus(b: APIBinding): APIBindingStatus {
  const conds = b.status?.conditions ?? [];
  const phase = (b.status?.phase ?? "") as "" | "Binding" | "Bound";

  const readyCond    = findCond(conds, "Ready");
  const initialCond  = findCond(conds, "InitialBindingCompleted");
  const exportCond   = findCond(conds, "APIExportValid");
  const upToDateCond = findCond(conds, "BindingUpToDate");
  const claimsValidCond = findCond(conds, "PermissionClaimsValid");
  const claimsAppliedCond = findCond(conds, "PermissionClaimsApplied");
  const exportValid  = condTrue(exportCond);
  const bindingDone  = condTrue(initialCond);
  const upToDate     = condTrue(upToDateCond);
  const claimsValid  = condTrue(claimsValidCond);
  const claimsApplied = condTrue(claimsAppliedCond);
  // InitialBindingCompleted is kcp's readiness source. Phase=Bound is a safe
  // compatibility fallback for servers that omit conditions.
  const ready = condTrue(readyCond) || bindingDone || (phase === "Bound" && !initialCond);

  let label: string;
  if (ready)                                  label = "Bound";
  else if (phase === "Bound")                 label = "Degraded";
  else if (exportCond && !exportValid)         label = "Export invalid";
  else if (phase === "Binding")               label = "Binding";
  else                                        label = "Pending";

  const messages = [
    ["Export reachable", exportCond],
    ["Initial binding done", initialCond],
    ["Schema up to date", upToDateCond],
    ["Claims valid", claimsValidCond],
    ["Claims applied", claimsAppliedCond],
  ].flatMap(([type, condition]) => condition
    ? [{ type: type as string, ok: condTrue(condition as Condition), message: (condition as Condition).message }]
    : []);

  return { phase, ready, exportValid, bindingCompleted: bindingDone, upToDate, claimsValid, claimsApplied, label, messages };
}
