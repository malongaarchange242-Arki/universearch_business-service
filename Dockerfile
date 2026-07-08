FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache ffmpeg

ENV FFMPEG_PATH=/usr/bin/ffmpeg

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# ---------------- Runtime ----------------

FROM node:22-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/cmd/main.js"]