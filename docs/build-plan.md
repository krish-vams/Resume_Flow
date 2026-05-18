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

## Phase 7: Raw Resume Upload and Resume Version Storage

- Add protected raw resume DOCX upload.
- Link each resume version to the user, job, candidate profile, prompt template, and focus template when provided.
- Store raw resume text, private local file storage key, status, and version metadata.
- Auto-increment versions per job.
- Add authenticated raw resume download.
- Update the linked job to `RESUME_GENERATED` when a raw resume is uploaded.
- Show upload controls and existing resume versions on the job detail page.

## Phase 8: Formatter Integration and Final Resume Storage

- Refactor the Python formatter into parser, renderer, schemas, and service modules.
- Add `POST /format-resume` to accept raw DOCX, candidate profile JSON, and output name.
- Return clean formatter errors for missing sections, invalid DOCX files, missing base templates, and write failures.
- Add backend `POST /api/resumes/:id/format` to call the formatter service.
- Store formatted DOCX files in backend-managed local storage.
- Add authenticated formatted DOCX download.
- Show format and final download actions on the job detail resume version list.
- Add later PDF export path.
- Track validation and formatter status on resume versions.

## Phase 9: Resume Validator

- Validate raw resume text or extract text from the uploaded raw DOCX.
- Check Professional Summary existence, 55-60 word count, and target job title mention.
- Check Accenture, Dreams Media Solutions, and Capital Info Solutions bullet counts.
- Check every experience bullet for 20-24 words.
- Flag bullets that include more than one core programming language.
- Flag AI tool terms in Dreams Media Solutions and Capital Info Solutions bullets.
- Validate skills categories, Certifications, JD skill coverage, and title case.
- Validate bold markers for important JD terms.
- Validate candidate/contact headers, education presence, and experience headers without locations.
- Store validation checks, score, and status in `ResumeValidation`.
- Show validation status and check details on the job detail resume version list.

## Phase 10: Resume Library

- Add `/resumes` as the central resume library.
- Show resume name, company, role, focus type, version, validation status, match score, created date, DOCX download, and PDF placeholder.
- Filter by company, role, focus type, application status, validation status, and created date range.
- Add `/resumes/:id` to inspect one resume version.
- Show raw resume text or raw DOCX download, formatted DOCX state, related job description, prompt used, focus template, validation report, match analysis, and application status.
- Link the dashboard to the resume library.

## Phase 11: Application Tracker

- Add protected application CRUD routes.
- Link applications to jobs and optional resume versions.
- Track statuses from Saved through Withdrawn.
- Store applied date, follow-up date, recruiter name, recruiter email, interview date, and notes.
- Update the linked job status when application status changes.
- Add `/applications` with a create/edit form and table view.
- Allow selecting the resume version used for an application.

## Phase 12: Reference Library

- Add protected Excel reference file upload.
- Categorize files as action verbs, ATS keywords, accomplishment examples, impact examples, rewriting guides, or other.
- Store reference files privately in local storage.
- Parse XLSX rows into searchable reference entries.
- Add reference entry list and search APIs.
- Add `/reference-library` for upload, parsing, browsing, and search.
- Allow selected reference entries to be included in prompt assembly.

## Phase 13: Resume Match Analysis

- Add protected `POST /api/resumes/:id/analyze-match`.
- Compare stored JD text against raw resume text or uploaded raw DOCX text.
- Use required skills, preferred skills, JD extracted keywords, static stack keyword groups, and ATS reference keywords.
- Save overall match score on `ResumeVersion.matchScore`.
- Store detailed match results in `ResumeMatchAnalysis`.
- Display matched and missing required/preferred skills on the resume detail page.
- Display primary language alignment, cloud/DevOps, database, framework, and reference keyword coverage.
- Generate clear suggestions that only recommend truthful additions.
- Keep the resume library match score column backed by the saved score.

## Phase 14: PDF Export

- Add formatter-service `POST /export-pdf` using LibreOffice or `soffice` in headless mode.
- Add backend `POST /api/resumes/:id/export-pdf`.
- Require an existing formatted DOCX before PDF export.
- Store generated PDFs in private local storage.
- Update `ResumeVersion.formattedPdfUrl` after successful export.
- Add authenticated `GET /api/resumes/:id/download-pdf`.
- Show PDF export and download actions on resume detail and job detail pages.
- Enable PDF download from the resume library when a PDF exists.
- Return clear errors when LibreOffice is missing or conversion fails.

## Phase 15: Direct Gemini Integration

- Add backend-only Gemini API configuration through `GEMINI_API_KEY`.
- Add protected `POST /api/resumes/generate`.
- Assemble a generation prompt from prompt template, candidate profile, focus template, and target JD.
- Send the prompt to Gemini from the backend only.
- Store Gemini raw resume text on `ResumeVersion.rawResumeText`.
- Convert Gemini text into a raw DOCX file for the existing formatter workflow.
- Run resume validation automatically after generation.
- Run the formatter automatically when validation passes or warnings are accepted by request.
- Return generated resume, validation, formatted DOCX state, and any formatter error clearly.
- Add a job detail action for one-click Gemini resume generation.

## Phase 16: Gmail Integration for Job Emails

- Add Gmail OAuth connection with backend-only client credentials.
- Store Gmail tokens encrypted at rest.
- Add protected Gmail status, scan, detection list, confirm, and ignore routes.
- Scan recent Gmail messages for recruiter replies, interviews, assessments, offers, rejections, and application confirmations.
- Link detected emails to saved jobs by company and role text matching.
- Require user confirmation before updating job or application status.
- Show important linked emails in each job detail page.
- Add `/gmail` for connection, scanning, review, confirm, and ignore actions.

## Phase 17: Notifications and Follow-Up Reminders

- Add `Notification` records linked to users and optional applications.
- Add assessment deadline tracking on applications.
- Automatically sync follow-up, interview, and assessment notifications from application dates.
- Add protected notification list and mark-read routes.
- Show upcoming reminders on the dashboard.
- Allow users to mark notifications as read.
- Show assessment deadline fields in the application tracker.

## Phase 18: Dashboard Analytics

- Add protected `GET /api/dashboard/summary`.
- Calculate saved jobs, generated resumes, submitted applications, interviews, assessments, rejections, offers, ghosted applications, average match score, response rate, interview rate, and follow-ups due from persisted data.
- Return chart-ready application status distribution and recent daily application counts.
- Show metric cards and simple charts on `/dashboard`.
- Keep upcoming reminders available on the dashboard from the summary response.

## Phase 19: Security and Production Hardening

- Rate limit authentication, upload, generation, formatting, and PDF export routes.
- Keep object access scoped to the authenticated user.
- Validate upload extension, MIME type, stored filename, and size.
- Keep generated resume files behind authenticated download routes.
- Reject weak or default JWT secrets in production.
- Ensure formatter uploads reject oversized and non-DOCX inputs.
- Store formatter and validation failures as user-facing statuses where possible.
- Use database transactions for resume version creation plus linked job status updates.
- Return generic 500 responses without stack traces.

## Phase 20: Deployment

- Add deployment configuration for hosted backend, formatter, PostgreSQL, Redis, and persistent MVP storage.
- Add Vercel frontend deployment settings.
- Document required production environment variables.
- Document database schema sync for the current Prisma MVP.
- Document production smoke tests for login, job save, raw upload, formatting, download, and application tracking.

## Phase 21: Portfolio Polish

- Rewrite the README for GitHub, resume, and interview use.
- Add architecture and data-flow diagrams.
- Add deployment runbook, demo video flow, screenshot checklist, and interview guide.
- Include the resume bullet and future improvement plan.

## Phase 22: Background Jobs

- Move generation, formatting, PDF export, match analysis, and Gmail scanning into queued jobs.
