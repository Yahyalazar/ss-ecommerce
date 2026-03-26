# Use lightweight Node.js base
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including Prisma & TS)
RUN npm ci

# Copy project files
COPY . .

# Clean and rebuild (in case old node_modules/dist were copied)
RUN rm -rf node_modules dist
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set environment variables
ENV PORT=5000
EXPOSE 5000

# Run compiled server via entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
