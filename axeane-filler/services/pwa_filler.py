"""
pwa_filler.py
=============
Connects to the running Edge PWA via CDP and fills the Saisie des écritures form.

The PWA must be launched with:
    msedge.exe --remote-debugging-port=9222 --app=<PWA_URL>

AngularJS (not Angular) is used in the PWA. To properly set ng-model values we:
1. Set the DOM element's value
2. Dispatch an 'input' event (triggers ng-model binding)
3. Dispatch a 'change' event for dropdowns
4. For nya-bs-select dropdowns: click the matching <li> option directly
"""

import asyncio
import logging
from playwright.async_api import async_playwright, Page, Browser

from config import settings
from models.invoice import FillingResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JS helpers injected into the page
# ---------------------------------------------------------------------------

JS_SET_INPUT = """
(selector, value) => {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    // Also set via AngularJS scope if available
    const scope = window.angular && angular.element(el).scope();
    if (scope) {
        const model = el.getAttribute('ng-model');
        if (model) {
            scope.$apply(() => { scope[model] = value; });
        }
    }
    return true;
}
"""

JS_SELECT_NYA_OPTION = """
(dropdownSelector, optionText) => {
    // Open the dropdown button
    const btn = document.querySelector(dropdownSelector + ' button.dropdown-toggle');
    if (!btn) return false;
    btn.click();
    // Find the matching <li> option
    const lis = document.querySelectorAll(dropdownSelector + ' ul.dropdown-menu.inner li');
    for (const li of lis) {
        const span = li.querySelector('span.ng-binding');
        if (span && span.textContent.trim() === optionText.trim()) {
            li.click();
            return true;
        }
    }
    return false;
}
"""

JS_CLICK_ADD_ROW = """
() => {
    // Click the + button to add a new line in the grid
    const btn = document.querySelector('[ng-click*="ajouterEcriture"]') ||
                document.querySelector('.fa-plus') ||
                document.querySelector('button.td-cb[ng-click*="ajouter"]');
    if (btn) { btn.click(); return true; }
    return false;
}
"""

JS_GET_ROW_COUNT = """
() => {
    // Count current rows in the ecritures grid
    const rows = document.querySelectorAll('table.td-t tbody tr.td-row');
    return rows.length;
}
"""

JS_SET_ROW_COMPTE = """
(rowIndex, value) => {
    // Set the compte input in row rowIndex (0-based)
    // Pattern: #cc_0_3, #cc_1_3, #cc_2_3, etc.
    const selector = `#cc_${rowIndex}_3`;
    const input = document.querySelector(selector);
    if (!input) return false;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}
"""

JS_SET_ROW_LIBELLE = """
(rowIndex, value) => {
    // Set the libellé input in row rowIndex (0-based)
    // Pattern: #exlibelle0, #exlibelle1, #exlibelle2, etc.
    const selector = `#exlibelle${rowIndex}`;
    const input = document.querySelector(selector);
    if (!input) return false;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}
"""

JS_SET_ROW_AMOUNT = """
(rowIndex, field, value) => {
    // field = 'debit' or 'credit'
    // Debit pattern: #debit-eav-0, #debit-eav-1, etc.
    // Credit pattern: #credit-eav-0, #credit-eav-1, etc.
    const selector = `#${field}-eav-${rowIndex}`;
    const input = document.querySelector(selector);
    if (!input) return false;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}
"""

JS_CLICK_ENREGISTRER = """
() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.trim().includes('Enregistrer'));
    if (btn) { btn.click(); return true; }
    return false;
}
"""


# ---------------------------------------------------------------------------
# Main filler class
# ---------------------------------------------------------------------------

class PWAFiller:
    def __init__(self, cdp_port: int = None):
        self.cdp_port = cdp_port or settings.cdp_port
        self.cdp_url = f"http://{settings.cdp_host}:{self.cdp_port}"

    async def _get_saisie_page(self, browser: Browser) -> Page:
        """Find the Saisie des écritures page among open tabs."""
        for context in browser.contexts:
            for page in context.pages:
                url = page.url
                title = await page.title()
                if (settings.pwa_saisie_url_pattern in url.lower() or
                        "saisie" in title.lower() or
                        "axeane" in title.lower()):
                    return page
        # fallback: return first available page
        pages = browser.contexts[0].pages if browser.contexts else []
        if pages:
            return pages[0]
        raise RuntimeError("Could not find the Axeane Kompta PWA page.")

    async def _fill_header(self, page: Page, header: dict) -> None:
        """Fill the top header fields of the form using exact DOM selectors."""
        await asyncio.sleep(0.3)

        # Date opération
        if header.get("date_operation"):
            await page.evaluate(JS_SET_INPUT, ["#ec-date-creation", header["date_operation"]])

        # Journal (nya-bs-select)
        if header.get("journal"):
            await page.evaluate(JS_SELECT_NYA_OPTION, ["ol#jo-eav", header["journal"]])

        # Mois (nya-bs-select)
        if header.get("mois"):
            await page.evaluate(JS_SELECT_NYA_OPTION, ["ol#inputMoisIdEcriture", header["mois"]])

        # Devise (nya-bs-select)
        if header.get("devise"):
            await page.evaluate(JS_SELECT_NYA_OPTION, ["ol#devise", header["devise"]])

        # Jour
        if header.get("jour"):
            await page.evaluate(JS_SET_INPUT, ["#inputJourIdEcritureAv", header["jour"]])

        # Réf/N°doc
        if header.get("ref_doc"):
            await page.evaluate(JS_SET_INPUT, ["#idDocumentInputMD2", header["ref_doc"]])

        # Libellé
        if header.get("libelle"):
            await page.evaluate(JS_SET_INPUT, ["#inputLibelleIdMD2", header["libelle"]])

        # Mvt (Mouvement)
        if header.get("mvt"):
            await page.evaluate(JS_SET_INPUT, ["#mvtSeq", header["mvt"]])

        await asyncio.sleep(0.3)

    async def _ensure_row_exists(self, page: Page, row_index: int) -> None:
        """Add rows until row_index exists in the grid."""
        current_count = await page.evaluate(JS_GET_ROW_COUNT)
        while current_count <= row_index:
            await page.evaluate(JS_CLICK_ADD_ROW)
            await asyncio.sleep(0.4)
            current_count = await page.evaluate(JS_GET_ROW_COUNT)

    async def _fill_line(self, page: Page, row_index: int, line: dict) -> None:
        """Fill one accounting line row in the grid."""
        await self._ensure_row_exists(page, row_index)
        await asyncio.sleep(0.2)

        # N° Compte (typeahead)
        if line.get("compte"):
            await page.evaluate(JS_SET_ROW_COMPTE, [row_index, line["compte"]])
            await asyncio.sleep(0.5)  # wait for typeahead to resolve

        # Libellé
        if line.get("libelle"):
            await page.evaluate(JS_SET_ROW_LIBELLE, [row_index, line["libelle"]])

        # Débit
        if line.get("debit", 0) > 0:
            await page.evaluate(JS_SET_ROW_AMOUNT, [row_index, "debit", str(line["debit"])])

        # Crédit
        if line.get("credit", 0) > 0:
            await page.evaluate(JS_SET_ROW_AMOUNT, [row_index, "credit", str(line["credit"])])

        await asyncio.sleep(0.2)

    async def fill_entry(self, fill_data: dict, auto_save: bool = False) -> bool:
        """
        Fill one complete journal entry (header + all lines) in the PWA.

        fill_data shape:
            { "header": {...}, "lines": [{...}, ...] }
        """
        async with async_playwright() as p:
            browser = await p.chromium.connect_over_cdp(self.cdp_url)
            try:
                page = await self._get_saisie_page(browser)
                await self._fill_header(page, fill_data["header"])

                for i, line in enumerate(fill_data["lines"]):
                    await self._fill_line(page, i, line)

                if auto_save:
                    await asyncio.sleep(0.5)
                    await page.evaluate(JS_CLICK_ENREGISTRER)
                    await asyncio.sleep(1.0)

                return True
            except Exception as e:
                logger.error(f"fill_entry failed: {e}")
                raise
            finally:
                await browser.close()

    async def fill_document(
        self,
        all_fill_data: list[dict],
        auto_save: bool = False,
    ) -> FillingResult:
        """
        Fill multiple journal entries sequentially.
        Each item in all_fill_data is one complete entry (header + lines).
        """
        filled = 0
        failed = 0
        errors = []

        for i, fill_data in enumerate(all_fill_data):
            try:
                await self.fill_entry(fill_data, auto_save=auto_save)
                filled += 1
                logger.info(f"Entry {i+1}/{len(all_fill_data)} filled OK")
            except Exception as e:
                failed += 1
                msg = f"Entry {i+1} failed: {str(e)}"
                errors.append(msg)
                logger.error(msg)

        return FillingResult(
            success=failed == 0,
            rows_filled=filled,
            rows_failed=failed,
            errors=errors,
        )
