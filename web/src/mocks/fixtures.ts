// Demo fixture data — realistic KCP workspace tree with exports, bindings, resources.

import type { Workspace, WorkspaceType, List } from "../types/kcp";
import type { APIExport, APIBinding, APIExportEndpointSlice } from "../types/apis";

const ts = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10) + "-" + Math.random().toString(36).slice(2, 10);

function ws(name: string, phase: NonNullable<Workspace["status"]>["phase"] = "Ready"): Workspace {
  return {
    apiVersion: "tenancy.kcp.io/v1alpha1",
    kind: "Workspace",
    metadata: { name, uid: uid(), creationTimestamp: ts(Math.floor(Math.random() * 30 + 1)) },
    spec: { type: { name: "universal" } },
    status: {
      phase,
      conditions: phase === "Ready" ? [
        { type: "Ready", status: "True", reason: "Ready", lastTransitionTime: ts(1) },
      ] : [
        { type: "Ready", status: "False", reason: "Initializing", message: "Workspace is initializing", lastTransitionTime: ts(0) },
      ],
    },
  };
}

function list<T>(kind: string, items: T[]): List<T> {
  return { apiVersion: "v1", kind, metadata: { resourceVersion: "1" }, items };
}

// ── Workspace tree ────────────────────────────────────────────────────────────
// root → [infra, platform, teams]
//   infra → [networking, storage]
//   platform → [kaas, observability]
//     kaas → [providers]
//   teams → [frontend, backend, data]

export const WORKSPACES: Record<string, Workspace[]> = {
  "root": [
    ws("infra"),
    ws("platform"),
    ws("teams"),
  ],
  "root:infra": [
    ws("networking"),
    ws("storage"),
  ],
  "root:infra:networking": [],
  "root:infra:storage": [],
  "root:platform": [
    ws("kaas"),
    ws("observability"),
  ],
  "root:platform:kaas": [
    ws("providers"),
  ],
  "root:platform:kaas:providers": [],
  "root:platform:observability": [],
  "root:teams": [
    ws("frontend"),
    ws("backend"),
    ws("data"),
  ],
  "root:teams:frontend": [],
  "root:teams:backend": [],
  "root:teams:data": [],
};

export const WORKSPACE_TYPES: WorkspaceType[] = [
  { apiVersion: "tenancy.kcp.io/v1alpha1", kind: "WorkspaceType", metadata: { name: "universal" }, spec: {} },
  { apiVersion: "tenancy.kcp.io/v1alpha1", kind: "WorkspaceType", metadata: { name: "organization" }, spec: {} },
  { apiVersion: "tenancy.kcp.io/v1alpha1", kind: "WorkspaceType", metadata: { name: "team" }, spec: {} },
];

// ── APIExports ────────────────────────────────────────────────────────────────
const kaasExport: APIExport = {
  apiVersion: "apis.kcp.io/v1alpha2",
  kind: "APIExport",
  metadata: { name: "kaas", uid: uid(), creationTimestamp: ts(14) },
  spec: {
    latestResourceSchemas: ["v1alpha1.clusters.kaas.example.com", "v1alpha1.nodepools.kaas.example.com"],
    permissionClaims: [
      { group: "", resource: "secrets", verbs: ["get", "list", "watch"] },
      { group: "", resource: "configmaps", verbs: ["get", "list"] },
      { group: "rbac.authorization.k8s.io", resource: "clusterroles", verbs: ["get", "list", "watch", "create"] },
    ],
  },
  status: {
    identityHash: "a3f2b1c4d5e6",
    conditions: [
      { type: "IdentityValid", status: "True", reason: "IdentityValid", lastTransitionTime: ts(14) },
      { type: "VirtualWorkspaceURLsReady", status: "True", reason: "VirtualWorkspaceURLsReady", lastTransitionTime: ts(14) },
    ],
    virtualWorkspaces: [{ url: "https://kcp.example.com/services/apiexport/root:platform:kaas/kaas" }],
  },
};

const observabilityExport: APIExport = {
  apiVersion: "apis.kcp.io/v1alpha2",
  kind: "APIExport",
  metadata: { name: "observability", uid: uid(), creationTimestamp: ts(7) },
  spec: {
    latestResourceSchemas: ["v1alpha1.metrics.obs.example.com", "v1alpha1.dashboards.obs.example.com", "v1alpha1.alerts.obs.example.com"],
    permissionClaims: [
      { group: "", resource: "configmaps", verbs: ["get", "list", "watch", "create", "update"] },
      { group: "", resource: "secrets", verbs: ["get", "list"] },
    ],
  },
  status: {
    identityHash: "b7e9d2a1f3c8",
    conditions: [
      { type: "IdentityValid", status: "True", reason: "IdentityValid", lastTransitionTime: ts(7) },
      { type: "VirtualWorkspaceURLsReady", status: "True", reason: "VirtualWorkspaceURLsReady", lastTransitionTime: ts(7) },
    ],
    virtualWorkspaces: [{ url: "https://kcp.example.com/services/apiexport/root:platform:observability/observability" }],
  },
};

const storageExport: APIExport = {
  apiVersion: "apis.kcp.io/v1alpha2",
  kind: "APIExport",
  metadata: { name: "managed-storage", uid: uid(), creationTimestamp: ts(21) },
  spec: {
    latestResourceSchemas: ["v1alpha1.buckets.storage.example.com", "v1alpha1.volumes.storage.example.com"],
    permissionClaims: [
      { group: "", resource: "secrets", verbs: ["get", "list", "watch", "create"] },
    ],
  },
  status: {
    identityHash: "c1d4e7f2a9b3",
    conditions: [
      { type: "IdentityValid", status: "True", reason: "IdentityValid", lastTransitionTime: ts(21) },
    ],
    virtualWorkspaces: [{ url: "https://kcp.example.com/services/apiexport/root:infra:storage/managed-storage" }],
  },
};

export const API_EXPORTS: Record<string, APIExport[]> = {
  "root:platform:kaas":        [kaasExport],
  "root:platform:observability": [observabilityExport],
  "root:infra:storage":        [storageExport],
};

// ── APIBindings ───────────────────────────────────────────────────────────────
export const API_BINDINGS: Record<string, APIBinding[]> = {
  "root:teams:frontend": [
    {
      apiVersion: "apis.kcp.io/v1alpha2",
      kind: "APIBinding",
      metadata: { name: "kaas-binding", uid: uid(), creationTimestamp: ts(10) },
      spec: {
        reference: { export: { path: "root:platform:kaas", name: "kaas" } },
        permissionClaims: [
          { group: "", resource: "secrets", verbs: ["get", "list", "watch"], state: "Accepted", selector: { matchAll: true } },
          { group: "", resource: "configmaps", verbs: ["get", "list"], state: "Accepted", selector: { matchAll: true } },
          { group: "rbac.authorization.k8s.io", resource: "clusterroles", verbs: ["get", "list", "watch", "create"], state: "Rejected", selector: { matchAll: true } },
        ],
      },
      status: {
        phase: "Bound",
        boundResources: [
          { group: "kaas.example.com", resource: "clusters", schema: { name: "v1alpha1.clusters.kaas.example.com", identityHash: "a3f2b1c4d5e6" } },
          { group: "kaas.example.com", resource: "nodepools", schema: { name: "v1alpha1.nodepools.kaas.example.com", identityHash: "a3f2b1c4d5e6" } },
        ],
        conditions: [
          { type: "Ready", status: "True", reason: "Ready", lastTransitionTime: ts(10) },
          { type: "APIExportValid", status: "True", reason: "Valid", lastTransitionTime: ts(10) },
          { type: "InitialBindingCompleted", status: "True", reason: "InitialBindingCompleted", lastTransitionTime: ts(10) },
          { type: "BindingUpToDate", status: "True", reason: "BindingUpToDate", lastTransitionTime: ts(10) },
          { type: "PermissionClaimsValid", status: "True", reason: "Valid", lastTransitionTime: ts(10) },
          { type: "PermissionClaimsApplied", status: "True", reason: "Applied", lastTransitionTime: ts(10) },
        ],
      },
    },
    {
      apiVersion: "apis.kcp.io/v1alpha2",
      kind: "APIBinding",
      metadata: { name: "observability-binding", uid: uid(), creationTimestamp: ts(5) },
      spec: {
        reference: { export: { path: "root:platform:observability", name: "observability" } },
        permissionClaims: [
          { group: "", resource: "configmaps", verbs: ["get", "list", "watch", "create", "update"], state: "Accepted", selector: { matchAll: true } },
          { group: "", resource: "secrets", verbs: ["get", "list"], state: "Accepted", selector: { matchAll: true } },
        ],
      },
      status: {
        phase: "Bound",
        boundResources: [
          { group: "obs.example.com", resource: "metrics" },
          { group: "obs.example.com", resource: "dashboards" },
          { group: "obs.example.com", resource: "alerts" },
        ],
        conditions: [
          { type: "Ready", status: "True", reason: "Ready", lastTransitionTime: ts(5) },
          { type: "APIExportValid", status: "True", reason: "Valid", lastTransitionTime: ts(5) },
          { type: "InitialBindingCompleted", status: "True", reason: "InitialBindingCompleted", lastTransitionTime: ts(5) },
          { type: "BindingUpToDate", status: "True", reason: "BindingUpToDate", lastTransitionTime: ts(5) },
          { type: "PermissionClaimsValid", status: "True", reason: "Valid", lastTransitionTime: ts(5) },
          { type: "PermissionClaimsApplied", status: "True", reason: "Applied", lastTransitionTime: ts(5) },
        ],
      },
    },
  ],
  "root:teams:backend": [
    {
      apiVersion: "apis.kcp.io/v1alpha2",
      kind: "APIBinding",
      metadata: { name: "storage-binding", uid: uid(), creationTimestamp: ts(3) },
      spec: {
        reference: { export: { path: "root:infra:storage", name: "managed-storage" } },
        permissionClaims: [
          { group: "", resource: "secrets", verbs: ["get", "list", "watch", "create"], state: "Accepted", selector: { matchAll: true } },
        ],
      },
      status: {
        phase: "Binding",
        boundResources: [],
        conditions: [
          { type: "APIExportValid", status: "True", reason: "Valid", lastTransitionTime: ts(3) },
          { type: "InitialBindingCompleted", status: "False", reason: "Pending", message: "Waiting for schema reconciliation", lastTransitionTime: ts(3) },
          { type: "BindingUpToDate", status: "False", reason: "Pending", lastTransitionTime: ts(3) },
          { type: "PermissionClaimsValid", status: "True", reason: "Valid", lastTransitionTime: ts(3) },
          { type: "PermissionClaimsApplied", status: "False", reason: "Pending", lastTransitionTime: ts(3) },
        ],
      },
    },
  ],
  "root:teams:data": [],
  "root:platform:kaas:providers": [],
};

// ── Discovery ─────────────────────────────────────────────────────────────────
// api/v1 core resources
export const CORE_RESOURCES = {
  groupVersion: "v1",
  resources: [
    { name: "configmaps",      kind: "ConfigMap",      namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
    { name: "events",          kind: "Event",          namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
    { name: "namespaces",      kind: "Namespace",      namespaced: false, verbs: ["create","delete","get","list","patch","update","watch"] },
    { name: "pods",            kind: "Pod",            namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
    { name: "resourcequotas",  kind: "ResourceQuota",  namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
    { name: "secrets",         kind: "Secret",         namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
    { name: "serviceaccounts", kind: "ServiceAccount", namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
    { name: "services",        kind: "Service",        namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
  ],
};

export const API_GROUPS = {
  groups: [
    { name: "apps", preferredVersion: { groupVersion: "apps/v1", version: "v1" } },
    { name: "batch", preferredVersion: { groupVersion: "batch/v1", version: "v1" } },
    { name: "rbac.authorization.k8s.io", preferredVersion: { groupVersion: "rbac.authorization.k8s.io/v1", version: "v1" } },
    { name: "tenancy.kcp.io", preferredVersion: { groupVersion: "tenancy.kcp.io/v1alpha1", version: "v1alpha1" } },
    { name: "apis.kcp.io", preferredVersion: { groupVersion: "apis.kcp.io/v1alpha2", version: "v1alpha2" } },
    { name: "topology.kcp.io", preferredVersion: { groupVersion: "topology.kcp.io/v1alpha1", version: "v1alpha1" } },
    { name: "kaas.example.com", preferredVersion: { groupVersion: "kaas.example.com/v1alpha1", version: "v1alpha1" } },
  ],
};

export const GROUP_RESOURCES: Record<string, { groupVersion: string; resources: { name: string; kind: string; namespaced: boolean; verbs: string[] }[] }> = {
  "apps/v1": {
    groupVersion: "apps/v1",
    resources: [
      { name: "deployments",  kind: "Deployment",  namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
      { name: "replicasets",  kind: "ReplicaSet",  namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
      { name: "statefulsets", kind: "StatefulSet", namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
    ],
  },
  "batch/v1": {
    groupVersion: "batch/v1",
    resources: [
      { name: "cronjobs", kind: "CronJob", namespaced: true, verbs: ["create","delete","get","list","patch","update","watch"] },
      { name: "jobs",     kind: "Job",     namespaced: true, verbs: ["create","delete","get","list","patch","update","watch"] },
    ],
  },
  "rbac.authorization.k8s.io/v1": {
    groupVersion: "rbac.authorization.k8s.io/v1",
    resources: [
      { name: "clusterroles",        kind: "ClusterRole",        namespaced: false, verbs: ["create","delete","get","list","patch","update","watch"] },
      { name: "clusterrolebindings", kind: "ClusterRoleBinding", namespaced: false, verbs: ["create","delete","get","list","patch","update","watch"] },
      { name: "roles",               kind: "Role",               namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
      { name: "rolebindings",        kind: "RoleBinding",        namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
    ],
  },
  "tenancy.kcp.io/v1alpha1": {
    groupVersion: "tenancy.kcp.io/v1alpha1",
    resources: [
      { name: "workspaces",     kind: "Workspace",     namespaced: false, verbs: ["create","delete","get","list","patch","update","watch"] },
      { name: "workspacetypes", kind: "WorkspaceType", namespaced: false, verbs: ["get","list","watch"] },
    ],
  },
  "apis.kcp.io/v1alpha2": {
    groupVersion: "apis.kcp.io/v1alpha2",
    resources: [
      { name: "apiexports",  kind: "APIExport",  namespaced: false, verbs: ["create","delete","get","list","patch","update","watch"] },
      { name: "apibindings", kind: "APIBinding", namespaced: false, verbs: ["create","delete","get","list","patch","update","watch"] },
    ],
  },
  "topology.kcp.io/v1alpha1": {
    groupVersion: "topology.kcp.io/v1alpha1",
    resources: [
      { name: "partitions",     kind: "Partition",     namespaced: false, verbs: ["get","list","watch"] },
      { name: "partitionsets",  kind: "PartitionSet",  namespaced: false, verbs: ["create","delete","get","list","patch","update","watch"] },
    ],
  },
  "kaas.example.com/v1alpha1": {
    groupVersion: "kaas.example.com/v1alpha1",
    resources: [
      { name: "clusters",   kind: "Cluster",   namespaced: false, verbs: ["create","delete","get","list","patch","update","watch"] },
      { name: "nodepools",  kind: "NodePool",  namespaced: true,  verbs: ["create","delete","get","list","patch","update","watch"] },
    ],
  },
};

// Sample objects per resource
export const OBJECTS: Record<string, { name: string; namespace?: string; creationTimestamp: string; [k: string]: unknown }[]> = {
  "namespaces": [
    { name: "default", creationTimestamp: ts(30), status: { phase: "Active" } },
    { name: "kube-system", creationTimestamp: ts(30), status: { phase: "Active" } },
    { name: "demo-app", creationTimestamp: ts(5), status: { phase: "Active" } },
  ],
  "deployments": [
    { name: "web-frontend", namespace: "demo-app", creationTimestamp: ts(4), spec: { replicas: 3 }, status: { readyReplicas: 3 } },
    { name: "api-server", namespace: "demo-app", creationTimestamp: ts(4), spec: { replicas: 2 }, status: { readyReplicas: 2 } },
    { name: "worker", namespace: "demo-app", creationTimestamp: ts(3), spec: { replicas: 1 }, status: { readyReplicas: 1 } },
  ],
  "secrets": [
    { name: "db-credentials", namespace: "demo-app", creationTimestamp: ts(4), type: "Opaque" },
    { name: "tls-cert", namespace: "demo-app", creationTimestamp: ts(4), type: "kubernetes.io/tls" },
    { name: "default-token", namespace: "default", creationTimestamp: ts(30), type: "kubernetes.io/service-account-token" },
  ],
  "configmaps": [
    { name: "app-config", namespace: "demo-app", creationTimestamp: ts(4) },
    { name: "kube-root-ca.crt", namespace: "default", creationTimestamp: ts(30) },
  ],
  "serviceaccounts": [
    { name: "default", namespace: "default", creationTimestamp: ts(30) },
    { name: "app-sa", namespace: "demo-app", creationTimestamp: ts(4) },
  ],
  "clusterroles": [
    { name: "cluster-admin", creationTimestamp: ts(30) },
    { name: "view", creationTimestamp: ts(30) },
    { name: "edit", creationTimestamp: ts(30) },
    { name: "kaas:cluster-creator", creationTimestamp: ts(14) },
  ],
  "workspaces": [
    { name: "kaas", creationTimestamp: ts(14), status: { phase: "Ready" } },
    { name: "observability", creationTimestamp: ts(7), status: { phase: "Ready" } },
  ],
  "apiexports": [
    { name: "kaas", creationTimestamp: ts(14) },
  ],
  "apibindings": [
    { name: "kaas-binding", creationTimestamp: ts(10) },
    { name: "observability-binding", creationTimestamp: ts(5) },
  ],
  "clusters": [
    { name: "prod-eu-west", creationTimestamp: ts(2), spec: { region: "eu-west-1" }, status: { phase: "Running", nodeCount: 6 } },
    { name: "staging-us-east", creationTimestamp: ts(1), spec: { region: "us-east-1" }, status: { phase: "Provisioning", nodeCount: 0 } },
  ],
};

export { list };
