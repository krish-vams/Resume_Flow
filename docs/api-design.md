# API Design

Initial route groups:

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/candidate-profiles`
- `POST /api/candidate-profiles`
- `GET /api/candidate-profiles/:id`
- `PUT /api/candidate-profiles/:id`
- `DELETE /api/candidate-profiles/:id`
- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `PUT /api/jobs/:id`
- `DELETE /api/jobs/:id`
- `POST /api/jobs/:id/analyze`
- `POST /api/jobs/:id/analyze-eligibility`
- `POST /api/prompts`
- `GET /api/prompts`
- `GET /api/prompts/:id`
- `PUT /api/prompts/:id`
- `DELETE /api/prompts/:id`
- `POST /api/prompts/:id/duplicate`
- `POST /api/prompts/:id/assemble`
- `POST /api/focus-templates`
- `GET /api/focus-templates`
- `GET /api/focus-templates/:id`
- `PUT /api/focus-templates/:id`
- `DELETE /api/focus-templates/:id`
- `GET /api/gmail/connect`
- `GET /api/gmail/callback`
- `GET /api/gmail/status`
- `POST /api/gmail/scan`
- `GET /api/gmail/detections`
- `POST /api/gmail/detections/:id/confirm`
- `POST /api/gmail/detections/:id/ignore`
- `GET /api/gmail/jobs/:id/emails`
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/mark-all-read`
- `GET /api/dashboard/summary`
- `POST /api/resumes/upload-raw`
- `POST /api/resumes/generate`
- `GET /api/resumes`
- `GET /api/resumes/:id`
- `GET /api/resumes/:id/download-raw`
- `DELETE /api/resumes/:id`
- `POST /api/resumes/:id/validate`
- `GET /api/resumes/:id/validation`
- `POST /api/resumes/:id/analyze-match`
- `POST /api/resumes/:id/format`
- `POST /api/resumes/:id/export-pdf`
- `GET /api/resumes/:id/download-formatted`
- `GET /api/resumes/:id/download-pdf`
- `POST /format-resume`
- `POST /export-pdf`
- `GET /outputs/:fileName`
- `POST /api/applications`
- `GET /api/applications`
- `GET /api/applications/:id`
- `PUT /api/applications/:id`
- `DELETE /api/applications/:id`
- `POST /api/reference-files/upload`
- `GET /api/reference-files`
- `POST /api/reference-files/:id/parse`
- `GET /api/reference-entries`
- `GET /api/reference-entries/search`

Phase 1 implements auth routes and candidate profile CRUD. Phase 2 implements protected job description CRUD. Phase 3 implements eligibility analysis. Phase 4 implements the prompt library. Phase 5 implements focus templates. Phase 6 implements JD keyword extraction and auto focus detection. Phase 7 implements raw DOCX resume upload, resume version storage, and authenticated raw resume download. Phase 8 implements formatter service integration, formatted DOCX storage, and authenticated final resume download. Phase 9 implements resume validation and stored check results. Phase 10 adds frontend resume library and detail pages backed by the existing resume list/detail APIs. Phase 11 implements application tracker CRUD and the `/applications` frontend page.
Phase 12 implements reference file upload, Excel row parsing, reference entry search, and optional reference context in prompt assembly.
Phase 13 implements resume-to-JD match analysis, saved match scores, missing skill reporting, and suggestions.
Phase 14 implements PDF export from formatted DOCX files through the formatter service and authenticated PDF downloads.
Phase 15 implements server-side Gemini resume generation with automatic raw resume storage, validation, and formatting.
Phase 16 implements Gmail OAuth, job-email scanning, detection review, confirmed status updates, and job-detail email visibility.
Phase 17 implements application-linked in-app notifications for follow-ups, interviews, and assessment deadlines.
Phase 18 implements dashboard analytics with real metrics, simple charts, and upcoming reminders from `GET /api/dashboard/summary`.
