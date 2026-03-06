FROM node:20-alpine AS base
WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/config/package.json packages/config/package.json
RUN corepack enable && pnpm install --filter @signhub/api... --filter @signhub/database... --frozen-lockfile=false

COPY . .
RUN pnpm --filter @signhub/database db:generate
RUN pnpm --filter @signhub/api build

EXPOSE 4000
CMD ["pnpm", "--filter", "@signhub/api", "start"]

