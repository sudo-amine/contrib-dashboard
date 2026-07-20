import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import APIExportsView from "./views/APIExportsView.vue";
import APIBindingsView from "./views/APIBindingsView.vue";
import ExploreView from "./views/ExploreView.vue";

export const router = createRouter({
  // GitHub Pages cannot serve SPA fallback routes. Hash history keeps every
  // demo route under the repository base while normal BFF deployments retain
  // clean server-backed URLs.
  history: import.meta.env.VITE_DEMO === "true"
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: "/explore" },
    // Legacy path; workspace create/list now lives in the sidebar.
    { path: "/workspaces", redirect: "/explore" },
    { path: "/explore", name: "explore", component: ExploreView },
    { path: "/apiexports", name: "apiexports", component: APIExportsView },
    { path: "/apibindings", name: "apibindings", component: APIBindingsView },
  ],
});
