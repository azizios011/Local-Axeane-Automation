import tempfile
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from models.invoice import ExtractedDocument
from services.pdf_extractor import extract_from_pdf

router = APIRouter(prefix="/extraction", tags=["extraction"])


@router.post("/pdf", response_model=ExtractedDocument)
async def extract_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF invoice document.
    Returns all extracted invoice rows sorted by reference (AC first, FC second).
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Save to temp file for pdfplumber
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        result = await extract_from_pdf(tmp_path, file.filename)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        tmp_path.unlink(missing_ok=True)
