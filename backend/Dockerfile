FROM oven/bun:1.0.15

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY backend/ ./

# Expose the application port
EXPOSE 3001

# Start the application
CMD ["bun", "run", "start"]