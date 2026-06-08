from fastapi import APIRouter, HTTPException
from models.formula import Formula, FormulaCreate, FormulaUpdate
from storage import formulas_store

router = APIRouter(prefix="/formulas", tags=["formulas"])


@router.get("/", response_model=list[Formula])
def list_formulas():
    return formulas_store.list_formulas()


@router.get("/{formula_id}", response_model=Formula)
def get_formula(formula_id: str):
    formula = formulas_store.get_formula(formula_id)
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")
    return formula


@router.post("/", response_model=Formula, status_code=201)
def create_formula(payload: FormulaCreate):
    return formulas_store.create_formula(payload)


@router.put("/{formula_id}", response_model=Formula)
def update_formula(formula_id: str, payload: FormulaUpdate):
    formula = formulas_store.update_formula(formula_id, payload)
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")
    return formula


@router.delete("/{formula_id}", status_code=204)
def delete_formula(formula_id: str):
    ok = formulas_store.delete_formula(formula_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Formula not found")
