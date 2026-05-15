from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class ResumeRun(BaseModel):
    text: str
    bold: bool = False


class ResumeParagraph(BaseModel):
    runs: list[ResumeRun]


class ParsedResume(BaseModel):
    professional_summary: list[ResumeParagraph] = Field(default_factory=list)
    experience: list[ResumeParagraph] = Field(default_factory=list)
    skills: list[ResumeParagraph] = Field(default_factory=list)


class CandidateProfile(BaseModel):
    fullName: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedinUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    educationJson: Optional[list[dict[str, Any]]] = None
    certificationsJson: Optional[list[dict[str, Any]]] = None


class FormatResult(BaseModel):
    status: str
    fileName: Optional[str] = None
    formattedDocxPath: Optional[str] = None
    errors: list[str] = Field(default_factory=list)
