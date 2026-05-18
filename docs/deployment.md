# Deployment Runbook

This runbook deploys the MVP with:

- Frontend: Vercel
- Backend API: Render Docker web service
- Formatter service: Render Docker web service
- Database: Render PostgreSQL, Neon, or Supabase Postgres
- Redis: Render Redis, Upstash, or Redis Cloud
- Storage: Render persistent disk for MVP local storage

## 1. Deploy Backend, Formatter, Postgres, and Redis

Use `render.yaml` as the starting blueprint.

Required manual values:

- `FRONTEND_URL`: the deployed Vercel URL, for example `https://resumeflow-os.vercel.app`
- `FORMATTER_SERVICE_URL`: formatter service URL, for example `https://resumeflow-formatter.onrender.com`
- `JWT_SECRET`: generated automatically by the blueprint, or set to a long random value
- `GEMINI_API_KEY`: optional until direct generation is tested
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`: optional until Gmail OAuth is tested

After the backend deploys, sync the database schema:

```bash
cd backend
DATABASE_URL="<production database URL>" npm run prisma:deploy
```

The current MVP uses Prisma `db push` for deployment schema sync because the repo does not yet contain migration files.

## 2. Deploy Frontend To Vercel

Create a Vercel project with `frontend` as the project root.

Set:

```text
NEXT_PUBLIC_API_URL=https://<backend-public-url>
```

Build settings are in `frontend/vercel.json`.

## 3. Verify Production Environment

Backend:

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `FORMATTER_SERVICE_URL`
- `REDIS_URL`
- `LOCAL_STORAGE_PATH=/app/uploads`
- `STORAGE_PROVIDER=local`

Formatter:

- `FORMATTER_OUTPUT_DIR=/app/outputs`
- `FORMATTER_MAX_UPLOAD_BYTES=10485760`
- `BASE_RESUME_TEMPLATE_PATH`, optional

Frontend:

- `NEXT_PUBLIC_API_URL`

## 4. Smoke Test

1. Open the frontend public URL.
2. Register a test user.
3. Log out and log back in.
4. Create a candidate profile.
5. Save a job description.
6. Run JD analysis.
7. Create or paste a prompt template.
8. Upload a raw DOCX resume for the saved job.
9. Validate the resume.
10. Format the resume.
11. Download the final DOCX.
12. Create an application record and update its status.
13. Confirm the dashboard metrics update.

## 5. Production Notes

- Render persistent disks keep MVP files across redeploys, but S3 or Supabase Storage should replace local disk before multi-instance scaling.
- Keep the formatter service private if your host supports private networking. If it remains public, do not expose undocumented file paths.
- The backend already keeps API keys server-side only.
- Auth and upload routes are rate-limited in-process. A distributed rate limiter should replace this before horizontal scaling.
