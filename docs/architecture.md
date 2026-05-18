# Architecture

ResumeFlow OS is split into three application services:

- Frontend dashboard for workflow management.
- Backend API for authentication, ownership checks, records, validation orchestration, storage metadata, generation, downloads, and application tracking.
- Formatter service for DOCX formatting and PDF export.

```mermaid
flowchart TB
  Browser["Browser"] --> Frontend["Next.js Frontend"]
  Frontend --> Backend["Express API"]
  Backend --> Auth["JWT Auth + Ownership Checks"]
  Backend --> Postgres["PostgreSQL"]
  Backend --> Storage["Private File Storage"]
  Backend --> Formatter["FastAPI Formatter Service"]
  Backend --> Gemini["Gemini API"]
  Backend --> Gmail["Gmail API"]
  Backend --> Redis["Redis / BullMQ Later"]
  Formatter --> Docx["python-docx Renderer"]
  Formatter --> Office["LibreOffice PDF Export"]
```

## Data Flow

```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant B as Backend API
  participant DB as PostgreSQL
  participant FS as Private Storage
  participant PY as Formatter

  U->>F: Save job description
  F->>B: POST /api/jobs
  B->>DB: Store user-scoped job
  U->>F: Upload raw DOCX
  F->>B: POST /api/resumes/upload-raw
  B->>FS: Store private raw file
  B->>DB: Create ResumeVersion
  U->>F: Format resume
  F->>B: POST /api/resumes/:id/format
  B->>PY: Send raw DOCX + candidate profile
  PY->>B: Return formatted DOCX
  B->>FS: Store private formatted file
  B->>DB: Update ResumeVersion
  U->>F: Download final DOCX
  F->>B: GET /api/resumes/:id/download-formatted
  B->>FS: Read private file
  B->>U: Authenticated download
```

## Production Shape

- Frontend deploys independently to Vercel.
- Backend and formatter deploy as Docker web services.
- PostgreSQL stores structured workflow data.
- Redis is provisioned for future background jobs.
- MVP file storage can run on a persistent disk; S3 or Supabase Storage should replace it before horizontal scaling.
