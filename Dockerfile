FROM caddy:builder AS caddy-builder
RUN xcaddy build --with github.com/mholt/caddy-webdav

FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:alpine
COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy

WORKDIR /app

RUN addgroup -S caddy && adduser -S -G caddy caddy
COPY --from=builder --chown=caddy:caddy /app/dist/ /app/
COPY Caddyfile /etc/caddy/Caddyfile

USER caddy
EXPOSE 8080
