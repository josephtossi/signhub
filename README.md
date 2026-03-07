# SignHub

SignHub is an electronic signature SaaS (DocuSign-style) built as a monorepo.

## Reality check: local vs deployed storage

If you deploy on Railway without persistent object storage (S3/R2 or a persistent disk), file-based features can fail after restart/redeploy:

- PDF download
- AI document analysis
- signed document retrieval

Why: database rows remain, but binary files on ephemeral container storage are lost.

For a smooth, reliable experience, run locally (recommended for full testing) or configure persistent storage in deployment.

## What this app does

- User authentication (signup/login/logout/session)
- Upload PDF documents
- Create envelopes and recipients
- Prepare document fields (signature, initials, date, text, checkbox)
- Save drafts and reopen/edit drafts
- Send envelopes for signing
- Recipient signing flow with secure token links
- Envelope tracking (status + recipient progress)
- Download latest merged PDF (with fields/signatures)
- AI contract assistant:
  - OpenAI provider when `OPENAI_API_KEY` is configured
  - Ollama local provider by default when OpenAI is not configured
  - Heuristic fallback only when both OpenAI and Ollama are unavailable
- Saved user signatures:
  - Draw/type/upload signature
  - Save default signature and reuse in future documents

## Run locally (recommended, full features)

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

### 2) Configure env (root `.env`)

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
LOCAL_STORAGE_PATH=.local-storage

NEXT_PUBLIC_API_URL=http://localhost:4000/v1
WEB_APP_URL=http://localhost:3001

AI_PROVIDER=auto
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
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

### 6) Local sanity checks

API health:
- `http://localhost:4000` returns `{"service":"signhub-api","status":"ok","baseUrl":"/v1"}`

Login page:
- `http://localhost:3001/login`

If web fails with `localhost refused to connect` or repeated 500 errors on `_next/static/*`, clear Next cache:

```bash
# from apps/web
Remove-Item -Recurse -Force .next
corepack pnpm --filter @signhub/web dev
```

If web says `EADDRINUSE: 3001`, free the port:

```powershell
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

## Golden local flow (what to test)

1. Signup on `/signup`
2. Login on `/login`
3. Upload PDF on `/upload`
4. Prepare draft on `/prepare/:envelopeId`
- add recipients
- place signature/text/date/checkbox fields
- assign fields to recipients
5. Send envelope
6. Open recipient link `/sign/:token`
7. Submit signature
8. Track status on `/tracking/:envelopeId`
9. Download merged PDF with signatures/field values
10. Open `/ai-insights` and analyze contract

If any of these fail locally, restart API and web once, then test with a newly uploaded document.

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
- `GET /v1/users/signature`
- `POST /v1/users/signature`
- `PUT /v1/users/signature`

Signing token routes:
- `GET /v1/sign/:token/session`
- `GET /v1/sign/:token/document`
- `POST /v1/sign/:token/submit`
- `POST /v1/sign/:token/complete`

When all signer recipients complete required fields, SignHub now:
- marks envelope `COMPLETED`
- generates a final signed PDF with field overlays
- stores it as a new `document_versions` row (latest version)

If a recipient already signed, signing endpoints block re-sign attempts.

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

## Product flow

1. Signup/Login
- Create account on `/signup` and login on `/login`.

2. Upload document
- Go to `/upload`, choose a PDF, and create a document record.

3. Create + prepare envelope
- Open a draft (`/prepare/:envelopeId`).
- Add recipients.
- Drag/tap fields on PDF pages.
- Assign fields to recipients.
- Save as draft.

4. Send envelope
- Click `Send Envelope`.
- Recipients receive secure links (`/sign/:token`).

5. Recipient signs
- Recipient opens sign link.
- Fills required fields and signs.
- Can use saved signature if authenticated.
- Submits signature and completes their turn.

6. Track progress
- Open tracking page (`/tracking/:envelopeId`).
- See statuses per recipient and envelope progress.

7. Download PDF
- Download latest merged PDF from prepare/tracking/completed areas.
- Final PDF includes all signed field overlays + completion certificate page.

## Demo (End-to-End Test Script)

Use this section to validate the full multi-recipient signing lifecycle exactly like a business demo.

### Demo goal

Verify that:
- both signers can sign once
- envelope becomes `COMPLETED` only after the second signer finishes
- downloaded PDF contains both signatures and all filled fields

### Test accounts

Create two users:
- `sender@example.com` (sender + signer #1)
- `recipient@example.com` (signer #2)

### 1) Login as sender and upload contract

1. Open `http://localhost:3001/login`
2. Login as `sender@example.com`
3. Go to `/upload`
4. Upload a PDF and create document
5. Create/open draft in `/prepare/:envelopeId`

Expected:
- Draft opens with PDF preview
- No blank page

### 2) Add recipients and assign fields (critical)

In prepare page:
1. Add both recipients (sender + recipient)
2. Add at least:
- 1 signature field for sender
- 1 signature field for recipient
- 1 date field
- 1 text field
- 1 checkbox field
3. Click each field and set **Assigned recipient** in Field Inspector

Important rules:
- For multi-signer envelopes, do not leave signature/initial fields unassigned
- Each signer must have at least one assigned signature/initial field

4. Click `Save Draft`
5. Click `Send Envelope`

Expected:
- Envelope status becomes `SENT`
- No validation errors if assignments are correct

### 3) First signer flow (sender)

1. Open sender signing link (from UI "Needs My Signature" or sign link)
2. Complete assigned fields
3. Submit and complete signing

Expected:
- Sender signs successfully
- Envelope status becomes `PARTIALLY_SIGNED`
- Sender cannot sign again (should return conflict for re-sign)
- Downloaded PDF may show sender signature only at this stage

### 4) Second signer flow (recipient)

1. Login as `recipient@example.com`
2. Open dashboard
3. Check `Needs My Signature`
4. Open signing page and sign assigned fields
5. Submit and complete signing

Expected:
- Recipient can sign (no false 409)
- Envelope transitions to `COMPLETED`
- Final merged PDF is generated

### 5) Verify final PDF output

From tracking page (`/envelopes/:id/tracking`) click `Download PDF`.

Expected final PDF:
- original document preserved
- sender signature in sender field
- recipient signature in recipient field
- date/text/checkbox values rendered
- completion certificate page appended

### 6) Negative checks (must fail safely)

1. Try signing again with same signer link after completion  
Expected: blocked with conflict (`already signed`)

2. Try sending multi-signer envelope with unassigned signature fields  
Expected: blocked with clear validation message

3. Open invalid envelope id in prepare/tracking  
Expected: friendly error, no blank page

### Troubleshooting checklist

If behavior looks stale:
1. Rebuild API: `corepack pnpm --filter @signhub/api build`
2. Restart API process on port `4000`
3. Hard refresh browser
4. Test using a **new** envelope (old envelopes may have invalid legacy field assignments)

## Railway deployment note (important)

SignHub can be deployed on Railway, but for file features to remain stable you need persistent storage.

If you keep `LOCAL_FILE_STORAGE=true` on ephemeral container storage:
- uploads may appear to work initially
- later AI/download/sign-file retrieval can fail with binary-not-found errors

Production-safe options:
1. Use S3-compatible storage (AWS S3 / Cloudflare R2 / MinIO external) and set `LOCAL_FILE_STORAGE=false`
2. Or mount a persistent disk/volume (if your Railway plan/service supports it) and set `LOCAL_STORAGE_PATH` there

If you cannot configure persistent storage now, use Railway as a UI/demo environment and run full document workflows locally.

## AI assistant behavior

Provider selection logic:
1. Use OpenAI if `OPENAI_API_KEY` is set.
2. Otherwise use Ollama if `OLLAMA_URL` is reachable.
3. Otherwise use heuristic fallback.

`GET /v1/ai/status` now returns:

```json
{
  "enabled": true,
  "provider": "openai | ollama | heuristic",
  "model": "gpt-4o-mini | llama3 | heuristic"
}
```

Ollama quick start (local, no API key):

```bash
# Install Ollama from https://ollama.com/download
ollama serve
ollama pull llama3
ollama run llama3 "hello"
```

Then keep:

```env
AI_PROVIDER=auto
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OPENAI_API_KEY=
```

Long documents are handled with chunking:
- contract text is split into chunks
- each chunk is summarized
- summaries are merged and analyzed into final structured output

## Quick manual test (PowerShell)

Signup:

```powershell
$body = @{ email="you@example.com"; password="Passw0rd!23"; firstName="First"; lastName="Last" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/v1/auth/signup" -ContentType "application/json" -Body $body
```

If `Cannot GET /` appears on API root, your API binary is outdated or not restarted.
If `Cannot POST /documents`, use `POST /v1/documents` or `POST /v1/documents/upload`.
