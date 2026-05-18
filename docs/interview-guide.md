# Interview Guide

## Problem Statement

Resume generation for job applications becomes hard to manage when job descriptions, AI prompts, raw DOCX outputs, formatted resumes, validation feedback, and application statuses live in separate tools. ResumeFlow OS centralizes that workflow and keeps every resume tied to the job it was created for.

## Architecture Talking Points

- The frontend is a Next.js dashboard optimized for repeat workflows: jobs, prompts, resumes, applications, reminders, and analytics.
- The backend is an Express API with Prisma models for user-owned workflow data.
- PostgreSQL stores structured records; local disk stores private files for MVP deployment.
- The Python formatter service isolates DOCX parsing/rendering from the Node API.
- Gemini generation is server-side so API keys never reach the browser.
- Formatter failures, validation warnings, and match analysis results are stored so users can recover instead of losing work.

## Tradeoffs

- Local disk storage is pragmatic for MVP deployment with a persistent disk, but S3 or Supabase Storage is the right next step for multi-instance deployments.
- In-memory rate limiting is enough for a single backend instance; Redis-backed rate limiting should replace it when horizontally scaling.
- Prisma `db push` keeps deployment simple while the schema is still evolving; production migration files should be introduced before a larger launch.
- The formatter service returns generated files through a controlled output route. A signed URL storage layer should replace this for cloud object storage.

## Future Improvements

- Move formatting, PDF export, Gemini generation, Gmail scanning, and match analysis to BullMQ workers.
- Replace local storage with S3 or Supabase Storage and signed downloads.
- Add formal integration tests around auth, ownership, upload, format, and download flows.
- Add OAuth production consent verification for Gmail.
- Add role-based prompt presets and richer analytics.
