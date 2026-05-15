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
