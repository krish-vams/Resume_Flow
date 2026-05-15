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
