FROM denoland/deno:1.42.4

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

COPY . /app

WORKDIR /app
RUN deno task cache && deno task build-assets

STOPSIGNAL SIGINT

CMD ["task", "production"]