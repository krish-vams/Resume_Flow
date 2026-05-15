from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from fastapi import UploadFile
from pydantic import ValidationError

from app.formatter.parser import FormatterParseError, parse_raw_resume
from app.formatter.renderer import FormatterRenderError, render_resume
from app.formatter.schemas import CandidateProfile, FormatResult


OUTPUT_DIR = Path(os.getenv("FORMATTER_OUTPUT_DIR", "./outputs"))
BASE_TEMPLATE_PATH = os.getenv("BASE_RESUME_TEMPLATE_PATH")


async def save_upload(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "raw_resume.docx").suffix or ".docx"
    temporary = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temporary_path = Path(temporary.name)

    try:
        with temporary:
            while chunk := await upload.read(1024 * 1024):
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
        raw_path = await save_upload(raw_resume_file)
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
