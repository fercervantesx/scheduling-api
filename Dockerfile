# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install OpenSSL and other dependencies
RUN apk add --no-cache openssl openssl-dev

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files and install production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"] 