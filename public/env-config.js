// Phase 38B: per-environment runtime configuration. Loaded by index.html BEFORE the Angular bundle, so
// `window.__env` already exists when src/app/core/api/api.config.ts evaluates. This checked-in default
// is intentionally empty — it changes nothing for local `ng serve`, unit tests, or a Docker image whose
// entrypoint hasn't substituted it (api.config.ts falls back to its own historical hardcoded origin
// whenever apiBaseUrl is empty). Only the container entrypoint (see Dockerfile) rewrites this file, and
// only when the deployment supplies API_BASE_URL.
window.__env = window.__env || {};
window.__env.apiBaseUrl = "";
