FROM node:24-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN ls -lah

RUN cat package.json

RUN test -f package-lock.json && echo "lock exists"


RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SIGNALR_URL
ARG NEXT_PUBLIC_SIGNALR_APP_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_APP_NAME

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SIGNALR_URL=$NEXT_PUBLIC_SIGNALR_URL
ENV NEXT_PUBLIC_SIGNALR_APP_URL=$NEXT_PUBLIC_SIGNALR_APP_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:24-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN addgroup -S nodejs -g 1001 \
    && adduser -S nextjs -u 1001 -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
