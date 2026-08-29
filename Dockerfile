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
