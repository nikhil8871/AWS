# Stage 1: Build & install production dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first for layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Stage 2: Minimal production runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Copy installed production node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source files
COPY . .

# Expose backend port (used by index.js and nginx proxy_pass)
EXPOSE 4000

# Start Express server
CMD ["node", "index.js"]