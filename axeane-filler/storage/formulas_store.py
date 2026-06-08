import json
import uuid
from pathlib import Path
from typing import Optional

from models.formula import Formula, FormulaCreate, FormulaUpdate
from config import settings


def _load() -> dict[str, dict]:
    path: Path = settings.formulas_file
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("{}")
    return json.loads(path.read_text(encoding="utf-8"))


def _save(data: dict[str, dict]) -> None:
    settings.formulas_file.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def list_formulas() -> list[Formula]:
    data = _load()
    return [Formula(**v) for v in data.values()]


def get_formula(formula_id: str) -> Optional[Formula]:
    data = _load()
    raw = data.get(formula_id)
    return Formula(**raw) if raw else None


def get_formula_by_libelle(libelle: str) -> Optional[Formula]:
    """Find the first formula whose libelle_filter matches (case-insensitive)."""
    for f in list_formulas():
        if f.libelle_filter.upper() == libelle.upper():
            return f
    return None


def create_formula(payload: FormulaCreate) -> Formula:
    data = _load()
    formula_id = str(uuid.uuid4())[:8]
    formula = Formula(id=formula_id, **payload.model_dump())
    data[formula_id] = formula.model_dump()
    _save(data)
    return formula


def update_formula(formula_id: str, payload: FormulaUpdate) -> Optional[Formula]:
    data = _load()
    if formula_id not in data:
        return None
    existing = Formula(**data[formula_id])
    updated = existing.model_copy(update=payload.model_dump(exclude_none=True))
    data[formula_id] = updated.model_dump()
    _save(data)
    return updated


def delete_formula(formula_id: str) -> bool:
    data = _load()
    if formula_id not in data:
        return False
    del data[formula_id]
    _save(data)
    return True
