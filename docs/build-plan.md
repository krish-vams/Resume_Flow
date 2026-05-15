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

## Phase 4: Prompt Library

- Add protected prompt template CRUD.
- Store prompt name, description, prompt text, target role, candidate name, version, and active state.
- Increment version when prompt text changes.
- Add prompt duplication for role-specific variants.
- Assemble final prompt from selected prompt template and selected job description.
- Add copy-ready final prompt output in the UI.

## Phase 5: Resume Focus Templates

- Add protected resume focus template CRUD.
- Store focus type, primary language, target roles, description, base resume text, uploaded resume file URL, and default skills.
- Support local focused resume file upload for MVP.
- Add focus template list, create, and detail/edit pages.
- Keep focus template IDs ready for future resume generation and resume version records.

## Phase 6: JD Skill Extraction and Auto Focus Detection

- Add keyword-based JD analysis.
- Extract matched keywords by focus type.
- Recommend the best available focus template with confidence and reason.
- Run full analysis through `POST /api/jobs/:id/analyze`.
- Store extracted keywords and focus recommendation metadata on the job.
- Allow manual override of the recommended focus template from the job detail page.

## Phase 7: Job and Resume Storage

- Add authentication.
- Add job description CRUD.
- Add raw resume upload.
- Call formatter service.
- Store formatted resume metadata.
- Link resume versions to jobs.

## Phase 8: Resume Library and Application Tracker

- Add resume history.
- Add application status workflow.
- Add applied date, follow-up date, and notes.

## Phase 9: Resume Validator

- Add eligibility checks.
- Validate summary word count.
- Validate bullet counts and bullet lengths.
- Validate skills sections.
- Add basic JD keyword matching.

## Phase 10: Direct Gemini Integration

- Add Gemini API integration.
- Run generation, validation, formatting, and storage as one workflow.
