# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
RUN npm ci --omit=dev --no-audit --no-fund

# Cloud Run will set $PORT; Next defaults to 3000. We pass it explicitly.
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "npm run start -- --port ${PORT} --hostname 0.0.0.0"]
