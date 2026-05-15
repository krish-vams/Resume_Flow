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

## Phase 1: Job and Resume Storage

- Add authentication.
- Add job description CRUD.
- Add raw resume upload.
- Call formatter service.
- Store formatted resume metadata.
- Link resume versions to jobs.

## Phase 2: Prompt Library

- Store Gemini prompts.
- Add prompt versioning.
- Assemble final prompt with JD and profile data.
- Store prompt used for each resume version.

## Phase 3: Resume Library and Application Tracker

- Add resume history.
- Add application status workflow.
- Add applied date, follow-up date, and notes.

## Phase 4: Resume Validator

- Add eligibility checks.
- Validate summary word count.
- Validate bullet counts and bullet lengths.
- Validate skills sections.
- Add basic JD keyword matching.

## Phase 5: Focus Templates and Auto Detection

- Add focus template storage.
- Recommend focus from JD keywords.
- Store focus used for each generated resume.

## Phase 6: Direct Gemini Integration

- Add Gemini API integration.
- Run generation, validation, formatting, and storage as one workflow.
