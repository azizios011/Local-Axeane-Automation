"""
csv_importer.py
===============
Parses the Vente journal CSV export directly — no LLM needed.
Handles:
- UTF-8 BOM header
- Quoted thousand-separator numbers e.g. "1,639.756"
- Multiple rows per reference (different TVA rates) → grouped by reference
- Grand Total footer row → skipped
- Extracts client code + name from the Client column
- Sorts: AC (avoir) first, FC (facture) second, then by reference
"""

import csv
import io
from collections import defaultdict
from models.invoice import InvoiceRow, ExtractedDocument, RefPrefix

MONTH_MAP = {
    "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
    "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
    "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
}


def _clean_number(value: str) -> float:
    """Strip quotes, spaces, remove thousand-separator commas, parse float."""
    cleaned = value.strip().strip('"').replace(",", "").replace(" ", "")
    if not cleaned:
        return 0.0
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _parse_client(client_str: str) -> tuple[str, str]:
    """
    Parse 'C000001 | PASSAGER' into ('C000001', 'PASSAGER').
    Falls back gracefully if format is unexpected.
    """
    parts = client_str.strip().split("|", 1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return "", client_str.strip()


def _parse_reference(ref: str) -> tuple[str, RefPrefix]:
    """
    Parse 'AC000024/2026' → ('AC000024/2026', RefPrefix.avoir)
    Parse 'FC000753/2026' → ('FC000753/2026', RefPrefix.facture)
    """
    clean = ref.strip().upper()
    prefix = RefPrefix.avoir if clean.startswith("AC") else RefPrefix.facture
    return clean, prefix


def _parse_date(date_str: str) -> tuple[str, str, str]:
    """
    Parse '02/03/2026' → (date='02/03/2026', mois='Mars', jour='02')
    """
    parts = date_str.strip().split("/")
    if len(parts) == 3:
        jour, mois_num, _ = parts
        mois = MONTH_MAP.get(mois_num, "")
        return date_str.strip(), mois, jour
    return date_str.strip(), "", ""


def _sort_rows(rows: list[InvoiceRow]) -> list[InvoiceRow]:
    """Sort: AC first, FC second. Within each group sort by reference."""
    def key(r: InvoiceRow):
        return (0 if r.ref_prefix == RefPrefix.avoir else 1, r.reference)
    return sorted(rows, key=key)


def parse_csv(content: bytes, filename: str) -> ExtractedDocument:
    """
    Parse a Vente journal CSV and return a sorted ExtractedDocument.
    Groups multiple rows with the same reference (multi-TVA invoices).
    """
    # Decode — handle UTF-8 BOM
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    # Group rows by reference to handle multi-TVA invoices
    # Structure: { reference: { base_data, ht_total, tva_total, ttc_total } }
    grouped: dict[str, dict] = defaultdict(lambda: {
        "ht": 0.0, "tva": 0.0, "ttc": 0.0,
        "net_ht": 0.0, "remise": 0.0,
        "_base": None,
    })

    for row in reader:
        client_raw = row.get("Client", "").strip()

        # Skip Grand Total footer
        if client_raw.lower().startswith("grand total") or not client_raw:
            continue

        ref_raw = row.get("Reference", "").strip()
        if not ref_raw:
            continue

        ref, prefix = _parse_reference(ref_raw)
        date_str, mois, jour = _parse_date(row.get("Date", ""))
        client_code, client_name = _parse_client(client_raw)

        ht  = abs(_clean_number(row.get("HT", "0")))
        tva = abs(_clean_number(row.get("Montant TVA", "0")))
        ttc = abs(_clean_number(row.get("TTC", "0")))
        net_ht = abs(_clean_number(row.get("NetHT", "0")))
        remise = abs(_clean_number(row.get("Remise", "0")))

        g = grouped[ref]
        g["ht"]     += ht
        g["tva"]    += tva
        g["net_ht"] += net_ht
        g["remise"] += remise

        # TTC is the same across all rows for the same invoice — take max
        if ttc > g["ttc"]:
            g["ttc"] = ttc

        # Store base data only once per reference
        if g["_base"] is None:
            g["_base"] = {
                "reference": ref,
                "ref_prefix": prefix,
                "date": date_str,
                "mois": mois,
                "jour": jour,
                "libelle": client_name,
                "client": client_name,
                "client_code": client_code,
                "operation": row.get("Operation", "").strip(),
                "site": row.get("Site", "").strip(),
                "tva_pct": row.get("TVA %", "").strip(),
            }

    # Build InvoiceRow objects
    rows: list[InvoiceRow] = []
    for ref, g in grouped.items():
        base = g["_base"]
        if base is None:
            continue

        rows.append(InvoiceRow(
            reference=base["reference"],
            ref_prefix=base["ref_prefix"],
            date=base["date"],
            mois=base["mois"],
            jour=base["jour"],
            libelle=base["libelle"],
            client=base["client"],
            ht=round(g["ht"], 3),
            tva=round(g["tva"], 3),
            ttc=round(g["ttc"], 3),
            extra={
                "client_code": base["client_code"],
                "net_ht": round(g["net_ht"], 3),
                "remise": round(g["remise"], 3),
                "operation": base["operation"],
                "site": base["site"],
                "tva_pct": base["tva_pct"],
            },
        ))

    return ExtractedDocument(
        filename=filename,
        rows=_sort_rows(rows),
    )
