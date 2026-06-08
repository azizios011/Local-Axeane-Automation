from pydantic import BaseModel
from typing import Optional
from enum import Enum


class RefPrefix(str, Enum):
    avoir = "AC"
    facture = "FC"


class InvoiceRow(BaseModel):
    """One extracted invoice row from the PDF."""
    reference: str              # e.g. "AC000024" or "FC000125"
    ref_prefix: RefPrefix       # extracted from reference: AC or FC
    date: str                   # dd/MM/yyyy
    mois: Optional[str] = None  # month label e.g. "Janvier"
    jour: Optional[str] = None  # day number
    libelle: str                # e.g. "PASSAGER"
    mvt: Optional[str] = None
    ht: float = 0.0
    tva: float = 0.0
    ttc: float = 0.0
    client: Optional[str] = None
    extra: dict = {}            # any extra fields the LLM finds


class ExtractedDocument(BaseModel):
    """Full extraction result from one PDF."""
    filename: str
    doc_type: Optional[str] = None   # e.g. "Vente"
    rows: list[InvoiceRow]           # sorted: AC first, then FC


class FillingJob(BaseModel):
    """A job to fill the PWA for one extracted document."""
    document: ExtractedDocument
    formula_id: str
    cdp_port: int = 9222


class FillingResult(BaseModel):
    """Result of one PWA filling job."""
    success: bool
    rows_filled: int
    rows_failed: int
    errors: list[str] = []
