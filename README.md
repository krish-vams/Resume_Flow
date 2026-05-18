# ResumeFlow OS

ResumeFlow OS is a full-stack dashboard for managing a job application and resume-generation workflow.

The first MVP supports the current manual flow:

```text
Job Description -> Gemini Prompt -> Raw Resume DOCX -> Python Formatter -> Final Resume DOCX -> Stored Resume -> Application Tracker
```

## Services

- `frontend`: Next.js, React, TypeScript, Tailwind CSS
- `backend`: Express, TypeScript, Prisma, PostgreSQL, JWT-ready API structure
- `formatter-service`: FastAPI wrapper for the existing Python DOCX formatter
- `postgres`: local development database
- `redis`: local queue dependency for later BullMQ jobs

## Local Setup

Create your local environment file:

```bash
cp .env.example .env
```

Install and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Install and run the backend:

```bash
cd backend
npm install
npm run dev
```

Run the formatter service:

```bash
cd formatter-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Run local infrastructure:

```bash
docker compose up postgres redis
```

Validate the Prisma schema:

```bash
cd backend
npm run prisma:validate
```

## Health Checks

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000/health`
- Formatter: `http://localhost:8000/health`
- PostgreSQL: `localhost:5433` when started through Docker Compose
- Redis: `localhost:6380` when started through Docker Compose

## Phase 0 Scope

- Monorepo structure
- Next.js dashboard shell
- Express backend health route
- FastAPI formatter health route
- Prisma schema for core ResumeFlow OS entities
- Docker Compose for PostgreSQL, Redis, backend, and formatter service
- Shared environment sample

## Phase 1 Scope

- User registration with hashed passwords
- User login with JWT issued as an HttpOnly cookie
- Protected `GET /api/auth/me`
- Protected candidate profile CRUD
- Frontend pages for register, login, dashboard, and profile settings

## Phase 2 Scope

- Protected job description CRUD
- User-scoped job list and detail pages
- Job status tracking from saved through offer or withdrawn
- Job metadata fields for URL, location, type, description, and notes
- Resume count and future analysis placeholders on job detail

## Phase 3 Scope

- Eligibility gatekeeper service for restricted JD terms
- Automatic eligibility analysis on job creation and JD updates
- Protected `POST /api/jobs/:id/analyze-eligibility`
- Persisted `eligibilityFlagsJson` results on jobs
- Job detail warnings and blocked resume-generation placeholder

## Phase 4 Scope

- Protected prompt template CRUD
- Prompt edit version increments when prompt text changes
- Prompt duplication for role-specific variants
- MVP final prompt assembly from template plus selected job description
- Frontend prompt library pages with copy-ready final prompt output

## Phase 5 Scope

- Protected resume focus template CRUD
- Focus types for Java Backend, .NET, Node.js, Golang, AI, Cloud/DevOps, Full Stack, and Custom
- Local focused resume file upload for MVP
- Target roles, base resume text, and default skills storage
- Frontend focus template list, create, and detail/edit pages

## Phase 6 Scope

- Keyword-based JD skill extraction
- Focus recommendation across .NET, Node.js, Golang, AI, Java Backend, Cloud/DevOps, and Full Stack
- Protected `POST /api/jobs/:id/analyze`
- Persisted JD keywords, recommendation metadata, and recommended focus template ID
- Job detail UI for confidence, reason, matched keywords, and manual focus override

## Phase 7 Scope

- Protected raw resume DOCX upload
- Resume versions linked to jobs, candidate profiles, prompt templates, and focus templates
- Per-job version numbering for v1, v2, v3 workflows
- Private local raw resume storage with authenticated download
- Job detail UI for uploading, viewing, downloading, and deleting raw resume versions
- Automatic job status update to `RESUME_GENERATED` after upload

## Phase 8 Scope

- Python DOCX formatter modules for parsing, rendering, schemas, and service orchestration
- FastAPI `POST /format-resume` endpoint for raw DOCX formatting
- Structured formatter errors for missing sections, invalid DOCX files, template issues, and write failures
- Backend `POST /api/resumes/:id/format` integration with the formatter service
- Private formatted DOCX storage with authenticated final resume download
- Job detail UI actions for formatting a raw resume and downloading the final DOCX

## Phase 9 Scope

- Protected `POST /api/resumes/:id/validate` and `GET /api/resumes/:id/validation`
- Raw resume validation from pasted text or uploaded DOCX extraction
- Summary, bullet count, bullet length, programming language, AI term, skills, bold marker, and header checks
- Stored validation score, status, checklist, and violation metadata
- Job detail UI action for validating a resume version and reviewing check results

## Phase 10 Scope

- Central `/resumes` library for all generated resume versions
- Filters for company, role, focus type, application status, validation status, and created date range
- Resume table with version, validation, match score, DOCX download, and PDF placeholder
- `/resumes/[id]` detail page with raw resume, formatted file state, related JD, prompt, focus template, validation report, match analysis, and application status

## Phase 11 Scope

- Protected application CRUD API
- Application tracker page at `/applications`
- Job and resume-version selection for each application
- Status, applied date, follow-up date, recruiter details, interview date, and notes tracking
- Linked job status updates when application status changes

## Phase 12 Scope

- Protected Excel reference file upload at `/reference-library`
- Reference categories for action verbs, ATS keywords, examples, impact notes, and rewriting guides
- XLSX row parsing into searchable reference entries
- Reference entry list and search APIs
- Optional selected reference context during prompt assembly

## Phase 13 Scope

- Protected `POST /api/resumes/:id/analyze-match`
- Resume-to-JD comparison using saved JD skills, extracted keywords, stack keyword groups, and ATS reference keywords
- Saved match score on each resume version
- Stored detailed match analysis for missing required/preferred skills and category coverage
- Resume detail UI for running analysis, reviewing gaps, and reading realistic suggestions
