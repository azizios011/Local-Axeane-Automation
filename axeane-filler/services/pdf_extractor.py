import json
import re
import pdfplumber
from pathlib import Path

from services.llm_client import chat_completion
from models.invoice import InvoiceRow, ExtractedDocument, RefPrefix


SYSTEM_PROMPT = """
Tu es un assistant comptable tunisien. On te donne le texte brut d'un document PDF 
contenant des lignes de factures ou avoirs. 

Ta tâche est d'extraire TOUTES les lignes et de retourner UNIQUEMENT un tableau JSON 
valide (aucun texte avant ou après), avec exactement ce format pour chaque ligne :

[
  {
    "reference": "AC000024",
    "date": "08/06/2026",
    "mois": "Juin",
    "jour": "08",
    "libelle": "PASSAGER",
    "mvt": "",
    "ht": 100.000,
    "tva": 19.000,
    "ttc": 119.000,
    "client": "NOM CLIENT"
  }
]

Règles :
- reference commence par AC (avoir) ou FC (facture)
- date au format dd/MM/yyyy
- mois en français (Janvier, Février, etc.)
- jour = numéro du jour (ex: "08")
- ht, tva, ttc sont des nombres flottants (0.000 si absent)
- Si un champ est absent dans le PDF, mets une chaîne vide "" ou 0.0
- Ne rajoute AUCUN commentaire, AUCUN markdown, AUCUN backtick
"""


def _extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract raw text from PDF using pdfplumber."""
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
            # also try table extraction
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if row:
                        text_parts.append(" | ".join(str(c or "") for c in row))
    return "\n".join(text_parts)


def _parse_llm_response(raw: str) -> list[dict]:
    """Parse the JSON array from LLM response, strip any accidental markdown."""
    # Strip markdown code blocks if model added them anyway
    clean = re.sub(r"```(?:json)?", "", raw).strip()
    # Find the JSON array
    match = re.search(r"\[.*\]", clean, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON array found in LLM response:\n{raw[:500]}")
    return json.loads(match.group())


def _sort_rows(rows: list[InvoiceRow]) -> list[InvoiceRow]:
    """Sort: AC (avoir) first, FC (facture) second. Within each group, sort by reference."""
    def sort_key(r: InvoiceRow):
        prefix_order = 0 if r.ref_prefix == RefPrefix.avoir else 1
        return (prefix_order, r.reference)
    return sorted(rows, key=sort_key)


def _build_row(raw: dict) -> InvoiceRow:
    ref = str(raw.get("reference", "")).strip().upper()
    prefix = RefPrefix.avoir if ref.startswith("AC") else RefPrefix.facture
    return InvoiceRow(
        reference=ref,
        ref_prefix=prefix,
        date=raw.get("date", ""),
        mois=raw.get("mois", ""),
        jour=raw.get("jour", ""),
        libelle=str(raw.get("libelle", "")).strip(),
        mvt=raw.get("mvt", ""),
        ht=float(raw.get("ht", 0)),
        tva=float(raw.get("tva", 0)),
        ttc=float(raw.get("ttc", 0)),
        client=raw.get("client", ""),
        extra={k: v for k, v in raw.items()
               if k not in {"reference","date","mois","jour","libelle","mvt","ht","tva","ttc","client"}},
    )


async def extract_from_pdf(pdf_path: Path, filename: str) -> ExtractedDocument:
    """Full pipeline: PDF → text → LLM → sorted InvoiceRows."""
    raw_text = _extract_text_from_pdf(pdf_path)
    if not raw_text.strip():
        raise ValueError("Could not extract any text from the PDF.")

    llm_response = await chat_completion(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=f"Voici le contenu du PDF :\n\n{raw_text}",
    )

    raw_rows = _parse_llm_response(llm_response)
    rows = [_build_row(r) for r in raw_rows]
    sorted_rows = _sort_rows(rows)

    return ExtractedDocument(
        filename=filename,
        rows=sorted_rows,
    )
