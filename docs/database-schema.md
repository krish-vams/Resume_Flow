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
- `Application`

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
