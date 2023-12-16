FROM denoland/deno:1.39.0

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

COPY . /app

WORKDIR /app
RUN deno cache main.ts

EXPOSE 8000

CMD ["run", "-A", "main.ts"]