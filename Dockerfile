# =========================
# Build do Angular
# =========================
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build -- --configuration production

# Valida se o Angular realmente gerou o frontend
RUN test -f /app/dist/booking-web/browser/index.csr.html


# =========================
# Nginx
# =========================
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build \
    /app/dist/booking-web/browser/ \
    /usr/share/nginx/html/

# O Nginx procura index.html
RUN cp \
    /usr/share/nginx/html/index.csr.html \
    /usr/share/nginx/html/index.html \
    && test -f /usr/share/nginx/html/index.html

# Phase 38B: per-environment runtime API base URL. `env-config.js` ships baked in with an empty
# apiBaseUrl (safe default — api.config.ts falls back to its historical hardcoded origin whenever it's
# empty). This template + entrypoint script only overwrite it when the container is actually started
# with an API_BASE_URL env var — nginx:alpine's own docker-entrypoint.sh already runs every executable
# script under /docker-entrypoint.d/ before starting nginx (confirmed by this same image's own startup
# log, "Configuration complete; ready for start up" — this is not a new/custom entrypoint mechanism,
# just one more script dropped into the one the base image already provides), and envsubst is already
# present in this base image (used by its own default templating feature).
RUN printf 'window.__env = window.__env || {};\nwindow.__env.apiBaseUrl = "${API_BASE_URL}";\n' \
    > /usr/share/nginx/html/env-config.template.js

RUN printf '#!/bin/sh\nset -e\nif [ -n "$API_BASE_URL" ]; then\n  envsubst \x27$API_BASE_URL\x27 < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js\nfi\n' \
    > /docker-entrypoint.d/40-env-config.sh \
    && chmod +x /docker-entrypoint.d/40-env-config.sh

EXPOSE 80

# Phase 38 (Pilot Infrastructure): container-level liveness signal for the deploy pipeline/orchestrator.
# The SPA's index.html is served for any path (see nginx.conf's try_files fallback), so a plain GET / is
# a real proof nginx is up and actually serving the built Angular app — not just that the process exists.
# Uses 127.0.0.1 explicitly, not "localhost": this nginx only binds 0.0.0.0:80 (IPv4), and this image's
# busybox wget resolves "localhost" to ::1 first — confirmed by a real failed HEALTHCHECK run against
# "localhost" ("Connection refused" on the IPv6 loopback) before this fix.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
