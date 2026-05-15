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
- `POST /api/resumes/:id/validate`
- `POST /api/resumes/:id/format`
- `POST /api/applications`
- `GET /api/applications`

Phase 1 implements auth routes and candidate profile CRUD. Phase 2 implements protected job description CRUD. Phase 3 implements eligibility analysis. Phase 4 implements the prompt library. Phase 5 implements focus templates. Later phases will add resumes and application tracking.
