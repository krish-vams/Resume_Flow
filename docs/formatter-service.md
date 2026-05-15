# Formatter Service

The formatter service is a FastAPI application that will wrap the existing Python DOCX formatter.

Phase 0:

- `GET /health`
- Service folder structure
- Dockerfile

Future endpoints:

- `POST /format/docx`
- `POST /format/pdf`

Expected future inputs:

- Raw DOCX file
- Candidate profile data
- Education and certifications
- Output filename
- Formatting options

Expected future outputs:

- Structured JSON response
- Formatted DOCX path or signed URL
- Optional PDF path or signed URL
- Validation and parser errors
