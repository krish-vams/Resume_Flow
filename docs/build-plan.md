# Build Plan

## Phase 0: Repository Setup and Development Environment

Goal: create a clean monorepo with runnable frontend, backend, formatter service, database, and cache boundaries.

Acceptance criteria:

- Frontend runs locally.
- Backend health route works.
- Formatter service health route works.
- PostgreSQL starts locally.
- Prisma validates against PostgreSQL configuration.
- `.env.example` exists.

## Phase 1: Authentication and Candidate Profile

- Add registration with bcrypt password hashing.
- Add login with JWT auth.
- Store JWT in an HttpOnly cookie for browser clients.
- Add protected API middleware.
- Add candidate profile CRUD.
- Capture contact details, education, certifications, and default resume name.

## Phase 2: Job Description Manager

- Add protected job CRUD.
- Store company, role, URL, location, job type, full JD, and notes.
- Show saved jobs in a table with status, date added, recommended focus, and resume count.
- Add a job detail page with JD, notes, status, generated resume count, eligibility placeholder, and focus placeholder.
- Keep all jobs scoped to the logged-in user.

## Phase 3: Eligibility Gatekeeper

- Scan job descriptions for restricted terms before resume generation.
- Store analysis in `Job.eligibilityFlagsJson`.
- Run eligibility analysis automatically on job creation and JD updates.
- Add `POST /api/jobs/:id/analyze-eligibility`.
- Show passed or failed eligibility state on the job detail page.
- Disable resume generation when eligibility severity is blocked.

## Phase 4: Job and Resume Storage

- Add authentication.
- Add job description CRUD.
- Add raw resume upload.
- Call formatter service.
- Store formatted resume metadata.
- Link resume versions to jobs.

## Phase 5: Prompt Library

- Store Gemini prompts.
- Add prompt versioning.
- Assemble final prompt with JD and profile data.
- Store prompt used for each resume version.

## Phase 6: Resume Library and Application Tracker

- Add resume history.
- Add application status workflow.
- Add applied date, follow-up date, and notes.

## Phase 7: Resume Validator

- Add eligibility checks.
- Validate summary word count.
- Validate bullet counts and bullet lengths.
- Validate skills sections.
- Add basic JD keyword matching.

## Phase 8: Focus Templates and Auto Detection

- Add focus template storage.
- Recommend focus from JD keywords.
- Store focus used for each generated resume.

## Phase 9: Direct Gemini Integration

- Add Gemini API integration.
- Run generation, validation, formatting, and storage as one workflow.
