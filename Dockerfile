FROM nginxinc/nginx-unprivileged:alpine

RUN sed -i 's/worker_processes .*/worker_processes 1;/g' /etc/nginx/nginx.conf

COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

COPY ./public /app
