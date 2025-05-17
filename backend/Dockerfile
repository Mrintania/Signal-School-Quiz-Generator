FROM oven/bun:1.0.15

WORKDIR /app

# ติดตั้ง dependencies ที่จำเป็นสำหรับการคอมไพล์ native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY backend/ ./

# สร้างโฟลเดอร์ที่จำเป็น
RUN mkdir -p logs uploads && chmod -R 777 logs uploads

# Expose the application port
EXPOSE 3001

# Start the application
CMD ["bun", "run", "start"]