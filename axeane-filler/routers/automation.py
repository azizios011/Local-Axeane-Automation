from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from models.invoice import ExtractedDocument, FillingResult
from services.formula_engine import build_fill_data
from services.pwa_filler import PWAFiller
from storage import formulas_store

router = APIRouter(prefix="/automation", tags=["automation"])


class FillRequest(BaseModel):
    document: ExtractedDocument
    formula_id: Optional[str] = None       # explicit formula id, OR auto-detect by libelle
    cdp_port: Optional[int] = None         # override default CDP port
    auto_save: bool = False                 # click Enregistrer after each entry


class FillPreviewRequest(BaseModel):
    document: ExtractedDocument
    formula_id: Optional[str] = None


@router.post("/preview", response_model=list[dict])
def preview_fill(req: FillPreviewRequest):
    """
    Dry-run: return the fill_data that would be sent to the PWA,
    without actually touching the browser.
    """
    results = []
    for row in req.document.rows:
        formula = _resolve_formula(req.formula_id, row.libelle)
        fill_data = build_fill_data(formula, row)
        results.append({
            "reference": row.reference,
            "ref_prefix": row.ref_prefix,
            "fill_data": fill_data,
        })
    return results


@router.post("/fill", response_model=FillingResult)
async def fill_pwa(req: FillRequest):
    """
    Fill the Axeane Kompta PWA with all rows from the extracted document.
    The Edge PWA must be running with --remote-debugging-port=<cdp_port>.
    """
    all_fill_data = []
    for row in req.document.rows:
        try:
            formula = _resolve_formula(req.formula_id, row.libelle)
            fill_data = build_fill_data(formula, row)
            all_fill_data.append(fill_data)
        except HTTPException as e:
            raise e

    filler = PWAFiller(cdp_port=req.cdp_port)
    result = await filler.fill_document(all_fill_data, auto_save=req.auto_save)
    return result


def _resolve_formula(formula_id: Optional[str], libelle: str):
    """Resolve formula by explicit ID or by matching libelle_filter."""
    if formula_id:
        formula = formulas_store.get_formula(formula_id)
        if not formula:
            raise HTTPException(status_code=404, detail=f"Formula '{formula_id}' not found")
        return formula

    # Auto-detect by libelle
    formula = formulas_store.get_formula_by_libelle(libelle)
    if not formula:
        raise HTTPException(
            status_code=404,
            detail=f"No formula found for libellé '{libelle}'. "
                   f"Please create one or pass formula_id explicitly."
        )
    return formula
