FROM denoland/deno:1.39.1

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

COPY . /app

WORKDIR /app
RUN deno cache --lock deno.lock main.ts

EXPOSE 8000

CMD ["run", "--node-modules-dir", "-A", "main.ts"]