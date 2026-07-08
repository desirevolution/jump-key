FROM nginxinc/nginx-unprivileged:alpine

COPY ./public /app

COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

RUN sed -i 's/worker_processes .*/worker_processes 1;/g' /etc/nginx/nginx.conf

EXPOSE 8080

