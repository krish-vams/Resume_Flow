# API Design

Initial route groups:

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/candidate-profiles`
- `POST /api/jobs`
- `GET /api/jobs`
- `POST /api/prompts`
- `GET /api/prompts`
- `POST /api/resumes/upload-raw`
- `POST /api/resumes/:id/validate`
- `POST /api/resumes/:id/format`
- `POST /api/applications`
- `GET /api/applications`

Phase 0 only implements health routes. Feature routes will be added in Phase 1 and later.
