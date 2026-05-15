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
- `POST /api/resumes/upload-raw`
- `GET /api/resumes`
- `GET /api/resumes/:id`
- `GET /api/resumes/:id/download-raw`
- `DELETE /api/resumes/:id`
- `POST /api/resumes/:id/validate`
- `GET /api/resumes/:id/validation`
- `POST /api/resumes/:id/format`
- `GET /api/resumes/:id/download-formatted`
- `POST /format-resume`
- `GET /outputs/:fileName`
- `POST /api/applications`
- `GET /api/applications`

Phase 1 implements auth routes and candidate profile CRUD. Phase 2 implements protected job description CRUD. Phase 3 implements eligibility analysis. Phase 4 implements the prompt library. Phase 5 implements focus templates. Phase 6 implements JD keyword extraction and auto focus detection. Phase 7 implements raw DOCX resume upload, resume version storage, and authenticated raw resume download. Phase 8 implements formatter service integration, formatted DOCX storage, and authenticated final resume download. Phase 9 implements resume validation and stored check results. Phase 10 adds frontend resume library and detail pages backed by the existing resume list/detail APIs. Later phases will add application tracking.
