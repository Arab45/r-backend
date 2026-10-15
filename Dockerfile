# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /usr/src/app

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- prod-deps ----------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- dev ----------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---------- production ----------
FROM base AS production
ENV NODE_ENV=production
ENV PORT=5000

COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY . .

USER node
EXPOSE 3000


CMD ["node", "main.ts"]
