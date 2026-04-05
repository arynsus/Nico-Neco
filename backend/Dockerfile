FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# the data directory that will be volumed
RUN mkdir -p /app/data

ENV PORT=3000
ENV NODE_ENV=production
ENV FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-service-account.json

EXPOSE 3000

CMD ["node", "dist/index.js"]
