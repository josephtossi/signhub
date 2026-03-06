# SignHub Monorepo Scaffold

## 1) Folder structure

```text
signhub/
  apps/
    api/                    # NestJS backend
      src/
        auth/
        users/
        organizations/
        documents/
        envelopes/
        signing/
        audit/
        notifications/
        common/
    web/                    # Next.js frontend
      app/
        dashboard/
        upload/
        prepare/[envelopeId]/
        sign/[token]/
        tracking/[envelopeId]/
      components/
      lib/
  packages/
    config/                 # shared tsconfig presets
    database/               # Prisma schema + client package
      prisma/schema.prisma
    ui/                     # shared UI components
  docker-compose.yml
  .env.example
  turbo.json
```

## 2) Developer quick start (local)

Prerequisites:
- Node.js 20+
- Docker Desktop (recommended for Postgres/Redis/MinIO)

1. Copy env file.
```bash
cp .env.example .env
```

2. Ensure pnpm is available.
- If `pnpm` is already installed:
```bash
pnpm -v
```
- If not installed (Node 18+):
```bash
corepack prepare pnpm@9.12.3 --activate
corepack pnpm -v
```

3. Install dependencies.
```bash
corepack pnpm install
```

4. Start infrastructure only (Postgres, Redis, MinIO).
```bash
docker compose up -d postgres redis minio createbucket
```

5. Generate Prisma client.
```bash
corepack pnpm db:generate
```

6. Run API and web in dev mode.
```bash
corepack pnpm dev
```

URLs:
- Web: `http://localhost:3000`
- API: `http://localhost:4000/v1`
- MinIO console: `http://localhost:9001`

## 3) Docker full stack

Run everything in containers:
```bash
docker compose up --build
```

Stop:
```bash
docker compose down
```

Reset volumes:
```bash
docker compose down -v
```

## 4) Prisma models included

- `users`
- `organizations`
- `organization_users`
- `documents`
- `document_versions`
- `envelopes`
- `recipients`
- `fields`
- `signatures`
- `audit_logs`
- `templates`

## 5) Basic working endpoints

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/users`
- `POST /v1/organizations`
- `GET /v1/organizations`
- `POST /v1/documents`
- `POST /v1/documents/:id/upload` (multipart form-data key `file`)
- `GET /v1/documents/:id/versions/latest`
- `GET /v1/documents/:id/versions/latest/file`
- `GET /v1/documents?organizationId=<id>`
- `POST /v1/envelopes`
- `POST /v1/envelopes/:id/send`
- `GET /v1/envelopes/:id/status`
- `GET /v1/envelopes/:id/fields`
- `POST /v1/envelopes/:id/fields`
- `GET /v1/sign/:token/session`
- `POST /v1/sign/:token/submit`
- `POST /v1/sign/:token/complete`
- `GET /v1/audit/envelope/:envelopeId`
- `POST /v1/notifications/email/test`
- `POST /v1/notifications/webhook/test`

## 6) Developer workflow

1. Create a user and login from [docs/api-examples.http](./docs/api-examples.http).
2. Use the returned access token on the Upload page.
3. Upload a PDF.
4. The app creates:
- `documents` row
- `document_versions` row with SHA256
- `envelopes` row
5. In `/prepare/{envelopeId}` drag the signature field onto the PDF.
6. Click `Save Field Coordinates` to persist to `fields`.

## 7) Troubleshooting

- BullMQ + Redis queue is configured in `apps/api/src/notifications/notifications.service.ts`.
- S3 integration uses `@aws-sdk/client-s3` and supports MinIO via `S3_ENDPOINT`.
- Shared UI package is consumed by Next.js with `transpilePackages`.
- If `pnpm` is not found, use `corepack pnpm ...` commands.
- If Docker ports are busy, free ports `3000`, `4000`, `5432`, `6379`, `9000`, `9001`.
- If `3000` is in use, run web on another port:
```bash
corepack pnpm --filter @signhub/web exec next dev -p 3001
```
- If API exits with `P1001` or `ECONNREFUSED`, start infra first:
```bash
docker compose up -d postgres redis minio createbucket
```
- If Prisma fails, verify `DATABASE_URL` in `.env` and that Postgres container is running.
