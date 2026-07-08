LABEL org.opencontainers.image.source=https://github.com/desirevolution/jump-key

FROM nginxinc/nginx-unprivileged:alpine

COPY ./public /app

COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

