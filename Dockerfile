FROM node:24-alpine AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY main.go ./
COPY --from=node-builder /app/dist/ ./dist/

RUN CGO_ENABLED=0 go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /jump-key-server \
    .

FROM alpine:3.24

RUN addgroup -S jumpkey \
    && adduser -S -G jumpkey jumpkey

COPY --from=builder /jump-key-server /usr/local/bin/jump-key-server

USER jumpkey

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/jump-key-server"]
