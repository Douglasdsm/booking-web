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

CMD ["nginx", "-g", "daemon off;"]
