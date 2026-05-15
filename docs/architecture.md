# Architecture

ResumeFlow OS is split into three application services:

- Frontend dashboard for workflow management.
- Backend API for authentication, records, validation orchestration, storage metadata, and application tracking.
- Formatter service for DOCX formatting and future PDF export.

```text
Next.js Frontend
  -> Express Backend API
    -> PostgreSQL
    -> Redis / BullMQ
    -> Local or cloud file storage
    -> FastAPI Formatter Service
```

For the MVP, Gemini generation remains manual. The backend stores prompts, assembles final prompts, accepts uploaded raw resumes, and sends files to the formatter service.
