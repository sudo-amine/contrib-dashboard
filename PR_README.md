# Dashboard UX overhaul

## What this pull request does

This pull request turns the dashboard into a more complete day-to-day kcp UI.
It refreshes the workspace and API management experience, adds a guided
APIBinding workflow, improves resource exploration, and provides a standalone
mocked demo that can be hosted on GitHub Pages without a kcp backend.

The main user-facing changes are:

- a clearer, lazily loaded workspace tree with create/delete feedback;
- a three-step APIBinding wizard for selecting a provider workspace, choosing
  an unbound APIExport, and accepting or rejecting permission claims;
- richer APIExport and APIBinding status, resource, claim, and endpoint details;
- resource discovery filters, origin classification, a resizable browser, and
  YAML/JSON object inspection;
- reusable confirmation, copy, phase, and verb UI components;
- reconciliation-aware polling after workspace and APIBinding mutations; and
- an MSW-backed demo with representative workspaces, exports, bindings, and
  discovered objects.

## Correctness and scalability hardening

The review pass fixes several issues in the original implementation:

- polling runs are generation-scoped, so a stopped or superseded request cannot
  update the state of a newer run;
- workspace probing is bounded to immediate children instead of recursively
  loading an entire hierarchy during every rebuild;
- APIExport readiness follows kcp's `IdentityValid` and
  `VirtualWorkspaceURLsReady` conditions;
- APIBinding readiness follows `InitialBindingCompleted`, while preserving a
  phase-based compatibility fallback; and
- absent optional conditions are no longer displayed as failed health checks.

## CI and delivery

- CI installs from the root lockfile, runs tests, builds both workspaces, and
  verifies the static demo on every push and pull request.
- every push creates an uploadable GitHub Pages artifact;
- only the default branch deploys the public Pages site, so branch pushes cannot
  overwrite production;
- pull requests build the container without publishing it; and
- `main` and version tags publish `linux/amd64` and `linux/arm64` images to GHCR.

All workflows use least-privilege permissions, bounded timeouts, dependency
caching, and concurrency controls.

## How to review

Run the same checks as CI:

```bash
npm ci
npm run check

VITE_DEMO=true VITE_BASE_URL=/contrib-dashboard/ \
  npm run build --workspace web

docker build -t kcp-dashboard:pr .
```

For a manual UI review, start the demo with:

```bash
VITE_DEMO=true npm run dev:web
```

Then exercise workspace navigation, resource filters and the object drawer,
the binding wizard, and create/delete polling states.

## Publication checklist

- [x] Deterministic install through the committed root lockfile
- [x] Unit tests for new state and API logic
- [x] Production and demo builds
- [x] Pages artifact on every push with default-branch-only deployment
- [x] PR-only image verification and controlled GHCR publishing

## Repository follow-up

These repository-level checks happen after the branch is published and do not
require further code changes:

- confirm the repository's Pages source is set to **GitHub Actions**; and
- review the rendered demo artifact and required checks in the pull request.
