# MVP Roadmap

ResumeFlow OS should be built incrementally. The first priority is not to build a perfect AI product. The first priority is to make the current job application workflow faster, cleaner, and easier to manage.

## Recommended MVP Build Order

### MVP 1: Immediate Workflow Automation

Build first:

- Authentication
- Candidate Profile
- Job Description Manager
- Raw Resume Upload
- Python Formatter Integration
- Formatted Resume Storage
- Resume Download

Deliverable:

The user can log in, save a job description, upload a raw DOCX resume, format it, store it, and download the final DOCX.

### MVP 2: Workflow Organization

Build next:

- Prompt Library
- Copy Final Prompt With JD
- Resume Focus Templates
- Resume Library
- Application Tracker

Deliverable:

The user can organize prompt variants, resume strategies, generated resume versions, and application status.

### MVP 3: Intelligence Layer

Build after the core workflow is stable:

- Eligibility Gatekeeper
- Auto Focus Detection
- Resume Validator
- JD Match Analyzer
- Reference Library

Deliverable:

The app can analyze jobs and resumes, surface risks, recommend a resume strategy, and identify gaps.

### MVP 4: Full Automation

Build last:

- Direct Gemini API Integration
- PDF Export
- Gmail Integration
- Notifications
- Analytics

Deliverable:

The app feels like a complete job search operating system with generation, reminders, email awareness, and progress tracking.

## Four-Week Build Roadmap

### Week 1: Foundation

Build:

- Monorepo setup
- Frontend setup
- Backend setup
- PostgreSQL and Prisma
- Authentication
- Candidate Profile
- Job Description CRUD

Deliverable:

User can log in and save job descriptions.

### Week 2: Resume Formatting Workflow

Build:

- Raw Resume Upload
- Resume Version Table
- Python Formatter FastAPI Service
- Backend Formatter Proxy Route
- Formatted Resume Storage
- Resume Download
- Resume Library Basic View

Deliverable:

User can upload a raw resume, format it, save it, and download the final DOCX.

### Week 3: Prompt and Tracking Workflow

Build:

- Prompt Library
- Prompt Assembly With JD
- Resume Focus Templates
- Application Tracker
- Job Detail Improvements
- Basic Eligibility Check

Deliverable:

User can manage prompts, select focus templates, and track applications.

### Week 4: Validation and Polish

Build:

- Resume Validator
- JD Skill Extraction
- Auto Focus Detection
- Basic Match Score
- Dashboard Metrics
- README
- Deployment
- UI Polish

Deliverable:

Portfolio-ready MVP with the complete core workflow.

## Codex Implementation Guidance

General development rules:

- Build incrementally.
- Keep functions small and testable.
- Use TypeScript types consistently.
- Use Zod for request validation.
- Use Prisma for database access.
- Keep user ownership checks on every protected resource.
- Do not hardcode candidate data.
- Do not hardcode local file paths.
- Keep the formatter service separate from the backend.
- Return structured errors from the formatter service.
- Write basic tests for validator and formatter parsing.

Important edge cases:

- JD is empty.
- JD contains restricted eligibility terms.
- User uploads a non-DOCX file.
- Raw resume is missing Professional Summary.
- Raw resume is missing Experience.
- Raw resume is missing Skills.
- Resume has wrong bullet counts.
- Resume bullet has too few or too many words.
- Formatter service is down.
- File upload succeeds but formatting fails.
- User deletes a job with linked resumes.
- User tries to access another user's resume.
- Prompt template is deleted after resume generation.
- Focus template is missing.

## Suggested First Tasks

First task:

Create the monorepo structure for ResumeFlow OS with frontend, backend, formatter-service, and docs folders. Set up a Next.js frontend, Express TypeScript backend, Prisma PostgreSQL schema starter, FastAPI formatter-service health endpoint, docker-compose for Postgres and Redis, and a README with local setup instructions.

Second task:

Implement authentication and candidate profile management using JWT, bcrypt, Prisma, Express routes, Zod validation, and protected route middleware. Add frontend pages for login, register, dashboard, and candidate profile editing.

Third task:

Implement the Job Description Manager with CRUD APIs, Prisma Job model, protected ownership checks, frontend jobs list page, create job page, and job detail page.

Fourth task:

Refactor the existing Python resume formatter script into a FastAPI service with a `/health` endpoint and `/format-resume` endpoint that accepts a raw DOCX file and candidate profile JSON, returns a formatted DOCX file, and produces structured errors.

## Final Product Vision

ResumeFlow OS should become a personal job application operating system.

The final app should allow the user to:

- Save a job description.
- Analyze the JD.
- Choose the best resume strategy.
- Generate or upload a raw tailored resume.
- Validate strict resume rules.
- Format the resume professionally.
- Store the final DOCX/PDF.
- Track the application.
- Follow up at the right time.
- Measure job search progress.

This project is strong because it combines:

- Full-stack development
- Python automation
- DOCX generation
- Prompt management
- Resume validation
- File storage
- ATS keyword analysis
- Application tracking
- Dashboard analytics
- Real user workflow automation
