FROM denoland/deno:2.1.4

WORKDIR /app

COPY index.ts .

EXPOSE 3000

CMD ["deno", "run", "--allow-net", "--allow-env", "index.ts"]
