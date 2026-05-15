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
