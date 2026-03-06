FROM node:20-alpine AS base
WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
RUN corepack enable && pnpm install --filter @signhub/web... --frozen-lockfile=false

COPY . .
RUN pnpm --filter @signhub/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@signhub/web", "start"]

