# SignHub

Monorepo for an electronic signature platform with:
- `apps/web` (Next.js 14)
- `apps/api` (NestJS)
- `packages/database` (Prisma)

## Run locally (no Docker)

This project can run fully without Docker using:
- SQLite database
- local filesystem storage (instead of S3/MinIO)
- queues disabled (no Redis required)

### Prerequisites
- Node.js 20+
- pnpm (`corepack` recommended)

### 1) Install deps

```bash
corepack pnpm install
```

### 2) Configure env

Create `.env` in repo root:

```env
NODE_ENV=development
DATABASE_URL=file:./packages/database/prisma/dev.db

DISABLE_QUEUES=true
REDIS_URL=redis://localhost:6379

PORT=4000
JWT_ACCESS_SECRET=replace-with-strong-access-secret
JWT_REFRESH_SECRET=replace-with-strong-refresh-secret
SIGN_URL_BASE=http://localhost:3001/sign

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minio
AWS_SECRET_ACCESS_KEY=minio123
S3_BUCKET=signhub
S3_ENDPOINT=http://localhost:9000
LOCAL_FILE_STORAGE=true

NEXT_PUBLIC_API_URL=http://localhost:4000/v1
WEB_APP_URL=http://localhost:3001
```

### 3) Initialize Prisma DB

```bash
corepack pnpm --filter @signhub/database db:push
```

### 4) Start API

```bash
corepack pnpm --filter @signhub/api dev
```

API health:
- `http://localhost:4000` -> `{"service":"signhub-api","status":"ok","baseUrl":"/v1"}`

### 5) Start Web

In a second terminal:

```bash
corepack pnpm --filter @signhub/web dev
```

Web URL:
- `http://localhost:3001`

If the web app fails with `localhost refused to connect` or repeated 500 errors on `_next/static/*`, run:

```bash
# from apps/web
Remove-Item -Recurse -Force .next
corepack pnpm --filter @signhub/web dev
```

## Core API routes (current)

- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`
- `GET /v1/users/me/profile`
- `PATCH /v1/users/me/profile`
- `PATCH /v1/users/me/password`
- `GET /v1/dashboard`
- `POST /v1/documents` (JSON create or multipart upload+create)
- `POST /v1/documents/upload` (multipart upload+create)
- `POST /v1/envelopes`
- `POST /v1/envelopes/send`
- `GET /v1/envelopes/:id`
- `POST /v1/sign/:token`
- `POST /v1/sign/:token/submit`
- `GET /v1/ai/status`
- `POST /v1/ai/analyze-document`
- `POST /v1/ai/chat`
- `POST /v1/ai/explain-clause`

Signing token routes:
- `GET /v1/sign/:token/session`
- `GET /v1/sign/:token/document`
- `POST /v1/sign/:token/submit`
- `POST /v1/sign/:token/complete`

When all signer recipients complete required fields, SignHub now:
- marks envelope `COMPLETED`
- generates a final signed PDF with field overlays
- stores it as a new `document_versions` row (latest version)

## App Routes

- `/login`, `/signup`
- `/dashboard`
- `/documents`
- `/upload`
- `/drafts`
- `/prepare/:envelopeId`
- `/sent`
- `/completed`
- `/tracking`, `/tracking/:envelopeId`
- `/ai-insights`
- `/account`
- `/settings`

## Quick manual test (PowerShell)

Signup:

```powershell
$body = @{ email="you@example.com"; password="Passw0rd!23"; firstName="First"; lastName="Last" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/v1/auth/signup" -ContentType "application/json" -Body $body
```

If `Cannot GET /` appears on API root, your API binary is outdated or not restarted.
If `Cannot POST /documents`, use `POST /v1/documents` or `POST /v1/documents/upload`.
