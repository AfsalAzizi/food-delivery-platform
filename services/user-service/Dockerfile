# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm install

# Copy source code
COPY src/ ./src/
COPY db/ ./db/

# Debug: Show what we have before building
RUN echo "=== Files before build ===" && \
    ls -la && \
    echo "=== Source files ===" && \
    ls -la src/

# Build TypeScript (with error handling)
RUN npm run build && \
    echo "=== Build completed ===" && \
    ls -la dist/ && \
    echo "=== Checking for server.js ===" && \
    ls -la dist/server.js

# Production stage
FROM node:18-alpine AS production

# Create app directory
WORKDIR /app

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db ./db

# Debug: Verify files were copied
RUN echo "=== Production stage files ===" && \
    ls -la && \
    echo "=== Dist directory ===" && \
    ls -la dist/ && \
    echo "=== Checking server.js ===" && \
    ls -la dist/server.js

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3001, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["npm", "start"]