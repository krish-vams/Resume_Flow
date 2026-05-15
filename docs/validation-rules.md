# Validation Rules

Initial validator requirements:

- Stop generation when a JD explicitly requires citizenship, U.S. persons only, or clearance.
- Require Professional Summary.
- Require summary word count of 55 to 60 words.
- Require exact JD title in the first summary sentence.
- Require Accenture to have 8 bullets.
- Require Dreams Media Solutions to have 6 bullets.
- Require Capital Info Solutions to have 5 bullets.
- Require every experience bullet to have 20 to 24 words.
- Flag bullets with more than one core programming language.
- Flag AI tools in Dreams Media Solutions and Capital Info Solutions.
- Require 7 skills categories plus Certifications.
- Require important metrics and technologies to use `**bold**` markers before formatting.

## Eligibility Gatekeeper

Restricted terms:

- U.S. Citizenship
- US Citizenship
- U.S. Citizen
- US Citizen
- U.S. Persons Only
- US Persons Only
- Security Clearance
- Active Clearance
- Secret Clearance
- Top Secret
- TS/SCI
- Public Trust
- Clearance Required
- Must Be A U.S. Citizen
- Only U.S. Citizens

If any restricted term is found, eligibility severity is `blocked` and resume generation should be disabled until a future manual override flow exists.

## Resume Validator

Phase 9 runs from `POST /api/resumes/:id/validate` and stores results in `ResumeValidation`.

Inputs:

- Raw resume text when available.
- Uploaded raw DOCX extracted from backend private storage when text is unavailable.
- Target job title and JD skill metadata.
- Linked candidate profile.

Outputs:

- `overallStatus`: `PASSED`, `WARNING`, or `FAILED`.
- `overallScore`: 0-100 score based on failed and warning checks.
- `checksJson`: checklist entries with name, status, and details.

Stored checks cover:

- Professional Summary existence, 55-60 word count, and JD title mention.
- Exact experience bullet counts for Accenture, Dreams Media Solutions, and Capital Info Solutions.
- Experience bullet word counts of 20-24 words.
- One core programming language per bullet.
- No AI tool terms in Dreams Media Solutions or Capital Info Solutions.
- Skills categories, Certifications category, at least 5 skills per category where possible, JD skill coverage, and title case.
- Bold markers for important JD terms.
- Candidate name, contact info, education, and location-free experience headers.
