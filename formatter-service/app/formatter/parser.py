from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.opc.exceptions import PackageNotFoundError

from app.formatter.schemas import ParsedResume, ResumeParagraph, ResumeRun


SECTION_ALIASES = {
    "professional summary": "professional_summary",
    "summary": "professional_summary",
    "experience": "experience",
    "professional experience": "experience",
    "work experience": "experience",
    "skills": "skills",
    "technical skills": "skills",
}


class FormatterParseError(Exception):
    pass


def normalize_heading(value: str) -> str:
    return " ".join(value.strip().strip(":").lower().split())


def paragraph_to_runs(paragraph) -> ResumeParagraph:
    runs = [
        ResumeRun(text=run.text, bold=bool(run.bold))
        for run in paragraph.runs
        if run.text
    ]

    if not runs and paragraph.text.strip():
        runs = [ResumeRun(text=paragraph.text.strip(), bold=False)]

    return ResumeParagraph(runs=runs)


def parse_raw_resume(raw_docx_path: str | Path) -> ParsedResume:
    try:
        document = Document(str(raw_docx_path))
    except PackageNotFoundError as exc:
        raise FormatterParseError("Invalid DOCX") from exc
    except Exception as exc:
        raise FormatterParseError("Invalid DOCX") from exc

    sections = {
        "professional_summary": [],
        "experience": [],
        "skills": [],
    }
    current_section: str | None = None

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue

        heading = normalize_heading(text)
        if heading in SECTION_ALIASES:
            current_section = SECTION_ALIASES[heading]
            continue

        if current_section:
            sections[current_section].append(paragraph_to_runs(paragraph))

    errors = []
    if not sections["professional_summary"]:
        errors.append("Missing Professional Summary")
    if not sections["experience"]:
        errors.append("Missing Experience")
    if not sections["skills"]:
        errors.append("Missing Skills")

    if errors:
        raise FormatterParseError("; ".join(errors))

    return ParsedResume(**sections)
