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

## 2) Install and run

```bash
pnpm install
pnpm db:generate
docker compose up -d postgres redis minio createbucket
pnpm dev
```

API runs on `http://localhost:4000/v1`, web runs on `http://localhost:3000`.

## 3) Prisma models included

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

## 4) Basic working endpoints

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/users`
- `POST /v1/organizations`
- `GET /v1/organizations`
- `POST /v1/documents`
- `POST /v1/documents/:id/upload` (multipart form-data key `file`)
- `GET /v1/documents?organizationId=<id>`
- `POST /v1/envelopes`
- `POST /v1/envelopes/:id/send`
- `GET /v1/envelopes/:id/status`
- `GET /v1/sign/:token/session`
- `POST /v1/sign/:token/submit`
- `POST /v1/sign/:token/complete`
- `GET /v1/audit/envelope/:envelopeId`
- `POST /v1/notifications/email/test`
- `POST /v1/notifications/webhook/test`

## 5) Notes

- BullMQ + Redis queue is configured in `apps/api/src/notifications/notifications.service.ts`.
- S3 integration uses `@aws-sdk/client-s3` and supports MinIO via `S3_ENDPOINT`.
- Shared UI package is consumed by Next.js with `transpilePackages`.

