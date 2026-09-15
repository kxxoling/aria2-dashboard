# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Set placeholders that will be replaced strictly at runtime
ENV VITE_ARIA2_RPC_URL=__ARIA2_RPC_URL_PLACEHOLDER__
ENV VITE_ARIA2_RPC_SECRET=__ARIA2_RPC_SECRET_PLACEHOLDER__
RUN bun run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA-aware nginx config (replaces the default site)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker/docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

# Use custom entrypoint to execute env variable substitution before nginx starts
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
