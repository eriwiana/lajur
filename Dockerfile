# syntax=docker/dockerfile:1

# Build stages use Debian slim, not Alpine: Biome, TypeScript 7 and Vite ship native
# binaries and glibc is the safe target. None of this reaches the final image.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: `prepare` sets a git hook path and there is no git here.
RUN npm ci --ignore-scripts

# `docker build --target test .` runs the same checks as CI and fails if any break.
FROM deps AS test
COPY . .
RUN npx biome ci && npm run typecheck && npm test

FROM deps AS build
COPY . .
RUN npm run build

# ponytail: busybox httpd has no gzip, cache headers or TLS. Fine for ~16 KB of static
# files; switch to static-web-server (~5 MB) or put a proxy in front if that changes.
# ponytail: base tag is not pinned by digest; pin it if reproducible builds matter.
FROM busybox:stable-musl
COPY --from=build /app/dist /www
USER 65534:65534
EXPOSE 8080
CMD ["httpd", "-f", "-p", "8080", "-h", "/www"]
