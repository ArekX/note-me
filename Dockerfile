FROM denoland/deno:2.0.6

ARG BUILD_ID
ENV DENO_DEPLOYMENT_ID=${BUILD_ID}

COPY . /app

WORKDIR /app
RUN export SKIP_ENV=1 && deno task cache && deno task build-assets

STOPSIGNAL SIGINT

CMD ["task", "production"]