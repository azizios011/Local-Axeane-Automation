from pydantic import BaseModel
from typing import Literal, Optional
from enum import Enum


class SensType(str, Enum):
    debit = "debit"
    credit = "credit"


class DocType(str, Enum):
    facture = "FC"
    avoir = "AC"


class FormulaLine(BaseModel):
    """One accounting line in a formula (one row in the Saisie grid)."""
    ordre: int                          # row order (1, 2, 3...)
    compte: str                         # N° Compte e.g. "411000"
    libelle_template: str               # e.g. "PASSAGER" or "{ref}" or "{client}"
    sens_facture: SensType              # debit or credit for FC
    sens_avoir: SensType                # debit or credit for AC (usually flipped)
    montant_source: str                 # which extracted field maps here e.g. "ttc", "ht", "tva"
    tresorerie: Optional[str] = None    # Trésorerie dropdown value if needed


class Formula(BaseModel):
    """Full formula for a document type (e.g. Vente, Achat)."""
    id: str                             # e.g. "vente_passager"
    doc_type_name: str                  # e.g. "Vente"
    journal_code: str                   # e.g. "VT"
    libelle_filter: str                 # the Libellé value this formula applies to e.g. "PASSAGER"
    lines: list[FormulaLine]


class FormulaCreate(BaseModel):
    doc_type_name: str
    journal_code: str
    libelle_filter: str
    lines: list[FormulaLine]


class FormulaUpdate(BaseModel):
    doc_type_name: Optional[str] = None
    journal_code: Optional[str] = None
    libelle_filter: Optional[str] = None
    lines: Optional[list[FormulaLine]] = None
