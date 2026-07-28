FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY main.go ./
COPY dist ./dist

RUN CGO_ENABLED=0 go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /jump-key-server \
    .

FROM alpine:3.22

RUN addgroup -S jumpkey \
    && adduser -S -G jumpkey jumpkey

COPY --from=builder /jump-key-server /usr/local/bin/jump-key-server

USER jumpkey

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/jump-key-server"]
