FROM denoland/deno:1.42.3

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

COPY . /app

WORKDIR /app
RUN deno task cache

STOPSIGNAL SIGINT

CMD ["task", "production"]