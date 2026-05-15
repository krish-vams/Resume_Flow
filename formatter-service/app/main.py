from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.formatter.schemas import FormatResult
from app.formatter.service import OUTPUT_DIR, format_resume

app = FastAPI(
    title="ResumeFlow Formatter Service",
    version="0.1.0",
    description="FastAPI wrapper for the ResumeFlow DOCX formatter.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "resumeflow-formatter"}


@app.post("/format-resume", response_model=FormatResult)
async def format_resume_endpoint(
    raw_resume_file: UploadFile = File(...),
    candidate_profile_json: str = Form(...),
    output_name: str = Form(...),
) -> FormatResult:
    return await format_resume(raw_resume_file, candidate_profile_json, output_name)


@app.get("/outputs/{file_name}")
def download_output(file_name: str) -> FileResponse:
    output_root = OUTPUT_DIR.resolve()
    output_path = (output_root / file_name).resolve()

    try:
        output_path.relative_to(output_root)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Formatted DOCX not found") from exc

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Formatted DOCX not found")

    return FileResponse(
        output_path,
        filename=file_name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
