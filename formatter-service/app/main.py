from fastapi import FastAPI

app = FastAPI(
    title="ResumeFlow Formatter Service",
    version="0.1.0",
    description="FastAPI wrapper for the ResumeFlow DOCX formatter.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "resumeflow-formatter"}
