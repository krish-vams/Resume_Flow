# Formatter Service

The formatter service is a FastAPI application that converts raw Gemini DOCX resumes into formatted DOCX output and exports formatted DOCX files to PDF.

## Modules

- `app/formatter/parser.py`: reads the raw DOCX and extracts Professional Summary, Experience, and Skills while preserving bold runs.
- `app/formatter/renderer.py`: writes the formatted DOCX with candidate contact, education, certifications, and parsed resume sections.
- `app/formatter/service.py`: coordinates upload handling, parsing, rendering, PDF conversion, and structured error responses.
- `app/formatter/schemas.py`: shared formatter request and response models.

## Endpoints

- `GET /health`
- `POST /format-resume`
- `POST /export-pdf`
- `GET /outputs/{file_name}`

`POST /format-resume` expects multipart form data:

- `raw_resume_file`: DOCX upload.
- `candidate_profile_json`: serialized candidate profile.
- `output_name`: final DOCX name without extension.

Example response:

```json
{
  "status": "success",
  "fileName": "Resume - Rohit Kumar Chintamani.docx",
  "formattedDocxPath": "outputs/Resume - Rohit Kumar Chintamani.docx",
  "errors": []
}
```

`POST /export-pdf` expects multipart form data:

- `formatted_docx_file`: formatted DOCX upload.
- `output_name`: final PDF name without extension.

Example response:

```json
{
  "status": "success",
  "fileName": "Resume - Rohit Kumar Chintamani.pdf",
  "formattedPdfPath": "outputs/Resume - Rohit Kumar Chintamani.pdf",
  "errors": []
}
```

Known formatter errors include:

- `Missing Professional Summary`
- `Missing Experience`
- `Missing Skills`
- `Invalid DOCX`
- `Base Template Missing`
- `File Write Failure`
- `LibreOffice CLI not found`
- `PDF conversion timed out`

`BASE_RESUME_TEMPLATE_PATH` can point to a DOCX template. If set and missing, the formatter returns `Base Template Missing`; otherwise it renders with a generated DOCX style.

PDF export requires `libreoffice` or `soffice` on the formatter service PATH.
