from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import UploadFile
from pydantic import ValidationError

from app.formatter.parser import FormatterParseError, parse_raw_resume
from app.formatter.renderer import FormatterRenderError, render_resume
from app.formatter.schemas import CandidateProfile, FormatResult, PdfExportResult


OUTPUT_DIR = Path(os.getenv("FORMATTER_OUTPUT_DIR", "./outputs"))
BASE_TEMPLATE_PATH = os.getenv("BASE_RESUME_TEMPLATE_PATH")
MAX_UPLOAD_BYTES = int(os.getenv("FORMATTER_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))


def validate_upload_extension(upload: UploadFile, allowed_suffixes: set[str]) -> str:
    suffix = Path(upload.filename or "raw_resume.docx").suffix or ".docx"

    if suffix.lower() not in allowed_suffixes:
        allowed = ", ".join(sorted(allowed_suffixes))
        raise FormatterParseError(f"Uploaded file must use one of these extensions: {allowed}")

    return suffix


async def save_upload(upload: UploadFile, allowed_suffixes: set[str]) -> Path:
    suffix = validate_upload_extension(upload, allowed_suffixes)
    temporary = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temporary_path = Path(temporary.name)
    bytes_written = 0

    try:
        with temporary:
            while chunk := await upload.read(1024 * 1024):
                bytes_written += len(chunk)

                if bytes_written > MAX_UPLOAD_BYTES:
                    raise FormatterParseError("Uploaded file is too large")

                temporary.write(chunk)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise

    return temporary_path


def parse_candidate_profile(candidate_profile_json: str) -> CandidateProfile:
    try:
        payload = json.loads(candidate_profile_json)
        return CandidateProfile.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise FormatterParseError("Invalid candidate profile") from exc


async def format_resume(
    raw_resume_file: UploadFile,
    candidate_profile_json: str,
    output_name: str,
) -> FormatResult:
    raw_path: Path | None = None

    try:
        candidate_profile = parse_candidate_profile(candidate_profile_json)
        raw_path = await save_upload(raw_resume_file, {".docx"})
        parsed_resume = parse_raw_resume(raw_path)
        output_path = render_resume(
            parsed_resume=parsed_resume,
            candidate_profile=candidate_profile,
            output_dir=OUTPUT_DIR,
            output_name=output_name,
            base_template_path=BASE_TEMPLATE_PATH,
        )

        return FormatResult(
            status="success",
            fileName=output_path.name,
            formattedDocxPath=str(output_path),
            errors=[],
        )
    except (FormatterParseError, FormatterRenderError) as exc:
        return FormatResult(status="error", errors=[part.strip() for part in str(exc).split(";") if part.strip()])
    except Exception as exc:
        return FormatResult(status="error", errors=[str(exc) or "Formatter failed"])
    finally:
        if raw_path:
            raw_path.unlink(missing_ok=True)


async def export_pdf(formatted_docx_file: UploadFile, output_name: str) -> PdfExportResult:
    docx_path: Path | None = None
    libreoffice_binary = shutil.which("libreoffice") or shutil.which("soffice")

    if not libreoffice_binary:
        return PdfExportResult(status="error", errors=["LibreOffice CLI not found"])

    try:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        docx_path = await save_upload(formatted_docx_file, {".docx"})
        safe_output_name = Path(output_name).stem or docx_path.stem
        conversion_input = docx_path.with_name(f"{safe_output_name}.docx")
        docx_path.replace(conversion_input)
        docx_path = conversion_input

        process = subprocess.run(
            [
                libreoffice_binary,
                "--headless",
                "--convert-to",
                "pdf",
                str(docx_path),
                "--outdir",
                str(OUTPUT_DIR),
            ],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )

        if process.returncode != 0:
            message = (process.stderr or process.stdout or "PDF conversion failed").strip()
            return PdfExportResult(status="error", errors=[message])

        pdf_path = OUTPUT_DIR / f"{safe_output_name}.pdf"

        if not pdf_path.exists():
            return PdfExportResult(status="error", errors=["PDF conversion did not create an output file"])

        return PdfExportResult(
            status="success",
            fileName=pdf_path.name,
            formattedPdfPath=str(pdf_path),
            errors=[],
        )
    except subprocess.TimeoutExpired:
        return PdfExportResult(status="error", errors=["PDF conversion timed out"])
    except Exception as exc:
        return PdfExportResult(status="error", errors=[str(exc) or "PDF export failed"])
    finally:
        if docx_path:
            docx_path.unlink(missing_ok=True)
