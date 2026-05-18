# Database Schema

The initial Prisma schema includes:

- `User`
- `CandidateProfile`
- `Job`
- `PromptTemplate`
- `ResumeFocusTemplate`
- `ReferenceFile`
- `ReferenceEntry`
- `ResumeVersion`
- `ResumeValidation`
- `ResumeMatchAnalysis`
- `Application`
- `GmailIntegration`
- `JobEmail`
- `EmailDetection`
- `Notification`

The schema favors JSON fields for fast MVP iteration where data structures may change, such as extracted skills, education, certifications, validation reports, and reference metadata.

Phase 1 uses `CandidateProfile.defaultResumeName` to carry the preferred output filename toward the formatter service.

Phase 2 adds `Job.jobType` and expands job status values to include `RESUME_NEEDED` and `RESUME_GENERATED`.

Phase 3 stores eligibility gatekeeper results in `Job.eligibilityFlagsJson`:

```json
{
  "passed": false,
  "restrictedTermsFound": ["Security Clearance"],
  "severity": "blocked",
  "analyzedAt": "2026-05-15T00:00:00.000Z"
}
```

Phase 4 uses `PromptTemplate.version` to record the active version number. Editing prompt text increments the version so future resume records can store which version was used.

Phase 5 uses `ResumeFocusTemplate` for stack-specific resume strategy. Target roles and default skills are stored as JSON arrays for MVP flexibility, and uploaded focused resume files are referenced with `baseResumeFileUrl`.

Phase 6 stores JD analysis results on `Job`:

- `jdKeywordsJson`: extracted keywords grouped by focus type.
- `focusRecommendationJson`: recommended focus, confidence, matched keywords, and reason.
- `recommendedFocusTemplateId`: selected or manually overridden focus template.

Phase 7 uses `ResumeVersion` for raw Gemini output storage:

- `candidateProfileId`, `promptTemplateId`, and `focusTemplateId` are optional links for manual uploads.
- `rawResumeFileUrl` stores a private local storage key such as `raw-resumes/<userId>/<filename>.docx`, not a public static path.
- `rawResumeText` can store pasted raw resume content alongside the uploaded DOCX.
- `version` increments per job through `@@unique([jobId, version])`.
- `status` starts as `Raw Uploaded`; formatter and validation phases will update it later.

Phase 8 updates existing `ResumeVersion` rows after formatter execution:

- `formattedDocxUrl` stores a private backend storage key for the formatted DOCX.
- `status` becomes `Formatted` when formatting succeeds.
- `status` becomes `Formatting Failed: <reason>` when the formatter returns a clean parse/render error.

Phase 9 stores validation results in `ResumeValidation`:

- `checksJson` stores the user-facing checklist with names, statuses, and details.
- Bullet count, missing JD skills, language, AI tool, and bold-marker violations are stored in dedicated JSON fields.
- `overallScore` and `overallStatus` summarize whether the resume passed, has warnings, or failed.
- `ResumeVersion.validationStatus` mirrors the latest validation status for resume library views.

Phase 11 uses `Application` to track the job application lifecycle:

- `jobId` links every application to a saved job.
- `resumeVersionId` records which resume was used when available.
- `status` uses the existing `JobStatus` enum.
- Applied, follow-up, recruiter, interview, and notes fields support ongoing tracking.
- Application status changes also update the linked job status.

Phase 12 uses `ReferenceFile` and `ReferenceEntry` for the resume-writing knowledge base:

- `ReferenceFile.fileUrl` stores a private local storage key for the uploaded XLSX file.
- `ReferenceFile.category` classifies the source as action verbs, ATS keywords, examples, rewrite guidance, or other.
- `ReferenceFile.parsedStatus` tracks pending, parsed, and failed parsing states.
- `ReferenceEntry.content` stores the searchable row text used by prompt assembly.
- `tagsJson` and `metadataJson` preserve row tags and original column values for later analysis.

Phase 13 uses `ResumeMatchAnalysis` for stored resume-to-JD alignment results:

- `resumeVersionId` links one saved analysis to each resume version.
- `matchScore` mirrors the latest score stored on `ResumeVersion.matchScore`.
- Matched and missing required/preferred skills are stored as JSON arrays.
- Cloud/DevOps, database, framework, and reference keyword coverage are stored as JSON objects.
- `suggestionsJson` stores realistic improvement guidance for the resume detail page.

Phase 16 uses Gmail tables for job-email tracking:

- `GmailIntegration` stores the connected Gmail account and encrypted OAuth tokens.
- `JobEmail` stores likely job-related Gmail messages and optional links to saved jobs.
- `EmailDetection` stores the detected email type, suggested status, confidence, and user decision.
- Confirming a detection can update the linked job and application status; ignored detections are retained for auditability.

Phase 17 uses `Notification` for in-app reminders:

- `applicationId` links reminders to applications when possible.
- `type` stores follow-up, interview, or assessment reminder categories.
- `dueAt` powers upcoming reminder views on the dashboard.
- `read` lets users clear reminders without deleting the audit trail.
- `Application.assessmentDueDate` supports assessment deadline reminders.

Phase 18 dashboard analytics does not add new tables. It aggregates existing `Job`, `ResumeVersion`, `Application`, and `Notification` data for progress metrics, application charts, match score summaries, and follow-up counts.

Phase 19 security hardening does not add new tables. Resume uploads now create the resume version and update the linked job status inside one transaction, while existing user-scoped queries continue to enforce object ownership.

Phase 20 deployment does not add new tables. The current MVP uses `prisma db push` for production schema sync until formal migration files are introduced.
