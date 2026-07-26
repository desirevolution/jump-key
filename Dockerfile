FROM node:24-alpine AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-builder AS caddy-builder
RUN xcaddy build \
    --with github.com/mholt/caddy-webdav

FROM alpine:3.24

WORKDIR /app

RUN apk add --no-libc-dev --no-cache ca-certificates tzdata

RUN addgroup -S -g 1000 caddy && \
    adduser -S -u 1000 -G caddy caddy

COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy

COPY --from=node-builder --chown=caddy:caddy /app/dist/ /app/dist/

COPY --chown=caddy:caddy Caddyfile /etc/caddy/Caddyfile

USER caddy
EXPOSE 8080

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
