from models.formula import Formula, FormulaLine, SensType, DocType
from models.invoice import InvoiceRow, RefPrefix


def _resolve_libelle(template: str, row: InvoiceRow) -> str:
    """Replace template placeholders with actual row values."""
    return (
        template
        .replace("{ref}", row.reference)
        .replace("{client}", row.client or "")
        .replace("{libelle}", row.libelle)
        .replace("{date}", row.date)
        .replace("{mois}", row.mois or "")
    )


def _resolve_montant(source: str, row: InvoiceRow) -> float:
    """Map montant_source field name to the actual amount from the row."""
    mapping = {
        "ht": row.ht,
        "tva": row.tva,
        "ttc": row.ttc,
    }
    return mapping.get(source.lower(), 0.0)


def _get_sens(line: FormulaLine, row: InvoiceRow) -> SensType:
    """Determine debit or credit based on whether row is AC or FC."""
    if row.ref_prefix == RefPrefix.avoir:
        return line.sens_avoir
    return line.sens_facture


def build_fill_data(formula: Formula, row: InvoiceRow) -> dict:
    """
    Given a formula and one extracted invoice row, produce the full
    data dict needed to fill one entry in the Saisie des écritures form.

    Returns:
        {
          "header": { date, journal, mois, devise, mvt, jour, ref_doc, libelle },
          "lines": [
            { "compte": ..., "libelle": ..., "debit": ..., "credit": ..., "tresorerie": ... },
            ...
          ]
        }
    """
    header = {
        "date_operation": row.date,
        "journal": formula.journal_code,
        "mois": row.mois or "",
        "devise": "TND",
        "mvt": row.mvt or "",
        "jour": row.jour or "",
        "ref_doc": row.reference,
        "libelle": row.libelle,
    }

    lines = []
    for fl in sorted(formula.lines, key=lambda l: l.ordre):
        sens = _get_sens(fl, row)
        montant = _resolve_montant(fl.montant_source, row)
        libelle = _resolve_libelle(fl.libelle_template, row)

        lines.append({
            "compte": fl.compte,
            "libelle": libelle,
            "debit": round(montant, 3) if sens == SensType.debit else 0.0,
            "credit": round(montant, 3) if sens == SensType.credit else 0.0,
            "tresorerie": fl.tresorerie or "",
        })

    return {"header": header, "lines": lines}
