FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM bipy/webdav:latest

WORKDIR /app

RUN addgroup -S caddy && adduser -S -G caddy caddy
COPY --from=builder --chown=caddy:caddy /app/dist/ /app/
COPY Caddyfile /etc/caddy/Caddyfile

USER caddy
EXPOSE 8080
