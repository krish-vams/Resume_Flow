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
- `POST /api/prompts`
- `GET /api/prompts`
- `POST /api/resumes/upload-raw`
- `POST /api/resumes/:id/validate`
- `POST /api/resumes/:id/format`
- `POST /api/applications`
- `GET /api/applications`

Phase 1 implements auth routes and candidate profile CRUD. Later phases will add jobs, prompts, resumes, and application tracking.
