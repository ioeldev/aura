# ── Stage 1: Build Frontend ───────────────────────────────────────────────────
FROM oven/bun:alpine AS frontend-builder
WORKDIR /app

COPY shared/ ./shared/
COPY frontend/package.json frontend/bun.lock ./frontend/
RUN cd frontend && bun install --frozen-lockfile

COPY frontend/ ./frontend/
RUN cd frontend && bun run build

# ── Stage 2: Build Backend ────────────────────────────────────────────────────
FROM oven/bun:alpine AS backend-builder
WORKDIR /app

COPY shared/ ./shared/
COPY backend/package.json backend/bun.lock ./backend/
RUN cd backend && bun install --frozen-lockfile

COPY backend/ ./backend/

# dockerode has native deps — mark it external so it is installed separately
RUN cd backend && bun build src/server.ts \
      --outfile dist/server.js \
      --target bun \
      --external dockerode

# ── Stage 3: Production Image ─────────────────────────────────────────────────
FROM oven/bun:alpine AS production
WORKDIR /app

# Build tools needed to compile dockerode's native deps
RUN apk add --no-cache python3 make g++
RUN bun add dockerode@4
RUN apk del python3 make g++

# Bundled backend
COPY --from=backend-builder /app/backend/dist/server.js ./server.js

# Frontend static files
COPY --from=frontend-builder /app/frontend/dist/ ./public/

# Ship the example services config as a built-in fallback.
# Mount your own config/services.json at /app/config/services.json to override it.
COPY config/services.example.json ./config/services.example.json

ENV NODE_ENV=production
ENV PORT=2655
ENV STATIC_DIR=/app/public
ENV DATA_DIR=/app/data

EXPOSE 2655

CMD ["bun", "server.js"]
