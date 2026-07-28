FROM node:24-alpine AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY go.mod ./
COPY main.go ./
COPY --from=node-builder /app/dist/ ./dist/

RUN CGO_ENABLED=0 go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /jump-key-server \
    .

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/passwd /etc/passwd

COPY --from=builder /jump-key-server /jump-key-server

EXPOSE 8080

ENTRYPOINT ["/jump-key-server"]

CMD [ "--host=0.0.0.0",  "--port=8080", "--config-dir=/app/config", "--icons-dir=/app/icons" ]
