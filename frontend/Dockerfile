# Build stage
FROM node:19-alpine AS build

WORKDIR /app

# ตั้งค่าเพิ่มเติมสำหรับ build
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV GENERATE_SOURCEMAP=false
ENV PUBLIC_URL="/"

# Copy package and install dependencies
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Downgrade React from version 19 to 18
RUN sed -i 's/"react": "\^19.0.0"/"react": "^18.2.0"/g' package.json
RUN sed -i 's/"react-dom": "\^19.0.0"/"react-dom": "^18.2.0"/g' package.json
RUN npm install

# Copy source and build
COPY frontend/ ./
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to Nginx serve directory
COPY --from=build /app/build /usr/share/nginx/html

# กำหนด MIME types ให้ถูกต้อง
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]