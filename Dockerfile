FROM denoland/deno:1.46.1

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

COPY . /app

WORKDIR /app
RUN export SKIP_ENV=1 && deno task cache && deno task build-assets

STOPSIGNAL SIGINT

CMD ["task", "production"]