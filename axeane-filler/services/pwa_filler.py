""" 
pwa_filler.py 
============= 
Connects to the running Edge PWA via CDP and fills the Saisie des écritures form. 
 
The PWA must be launched with: 
    msedge.exe --remote-debugging-port=9222 --app=<PWA_URL> 
 
Strategy: 
- Use angular.element(el).scope().$apply() to set ng-model values properly 
- For nya-bs-select dropdowns: find and click the matching <li> option 
- For typeahead inputs (N° Compte): set value + trigger 'input' event to activate autocomplete, then wait for suggestion and click it 
- Add small delays between actions to let AngularJS digest cycles complete 
""" 
 
import asyncio 
import logging 
from playwright.async_api import async_playwright, Page, Browser 
 
from config import settings 
from models.invoice import FillingResult 
 
logger = logging.getLogger(__name__) 
 
# --------------------------------------------------------------------------- 
# JS helpers 
# --------------------------------------------------------------------------- 
 
# Set any input that uses ng-model by finding it via ng-model attribute name 
JS_SET_NG_MODEL = """ 
(ngModel, value) => { 
    const el = document.querySelector('[ng-model="' + ngModel + '"]'); 
    if (!el) return false; 
    el.value = value; 
    const scope = angular.element(el).scope(); 
    scope.$apply(() => { 
        // walk dot-notation path e.g. "ec.libelle" 
        const parts = ngModel.split('.'); 
        let obj = scope; 
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]]; 
        obj[parts[parts.length - 1]] = value; 
    }); 
    el.dispatchEvent(new Event('input', { bubbles: true })); 
    el.dispatchEvent(new Event('change', { bubbles: true })); 
    return true; 
} 
""" 
 
# Open a nya-bs-select dropdown and click the option matching the given text 
JS_SELECT_NYA = """ 
(ngModel, optionText) => { 
    const el = document.querySelector('[ng-model="' + ngModel + '"]'); 
    if (!el) return 'element not found: ' + ngModel; 
    // nya-bs-select wraps the select in a div.nya-bs-select 
    const wrapper = el.closest('.nya-bs-select') || el.parentElement; 
    const btn = wrapper.querySelector('button.dropdown-toggle'); 
    if (!btn) return 'toggle button not found'; 
    btn.click(); 
    // wait a tick then find the option 
    return new Promise(resolve => { 
        setTimeout(() => { 
            const items = wrapper.querySelectorAll('ul.dropdown-menu li a'); 
            for (const a of items) { 
                if (a.textContent.trim() === optionText.trim()) { 
                    a.click(); 
                    resolve('ok'); 
                    return; 
                 } 
            } 
            // partial match fallback 
            for (const a of items) { 
                if (a.textContent.trim().includes(optionText.trim())) { 
                    a.click(); 
                    resolve('partial match'); 
                    return; 
                } 
            } 
            resolve('option not found: ' + optionText); 
        }, 300); 
    }); 
} 
""" 
 
# Get all ng-model attribute names present on the current page (for debugging) 
JS_LIST_NG_MODELS = """ 
() => { 
    return Array.from(document.querySelectorAll('[ng-model]')) 
        .map(el => ({ 
            tag: el.tagName, 
            ngModel: el.getAttribute('ng-model'), 
            type: el.type || '', 
            id: el.id || '' 
        })); 
} 
""" 
 
# Count rows in the écritures grid 
JS_GET_ROW_COUNT = """ 
() => { 
    const rows = document.querySelectorAll('tr[ng-repeat*="ecriture"], tr[ng-repeat*="ligne"], tr[ng-repeat*="row"]'); 
    return rows.length; 
} 
""" 
 
# Click the + button to add a new line 
JS_CLICK_ADD_ROW = """ 
() => { 
    // Try common patterns for add-line button in AngularJS accounting apps 
    const candidates = [ 
        document.querySelector('[ng-click*="ajouterLigne"]'), 
        document.querySelector('[ng-click*="addLine"]'), 
        document.querySelector('[ng-click*="nouvelleLigne"]'), 
        document.querySelector('[ng-click*="ajouter"]'), 
        document.querySelector('table tfoot [ng-click]'), 
        document.querySelector('i.fa-plus')?.closest('[ng-click]'), 
    ]; 
    for (const el of candidates) { 
        if (el) { el.click(); return el.getAttribute('ng-click') || 'clicked'; } 
    } 
    return null; 
} 
""" 
 
# Set value on a specific row's field by ng-repeat index + ng-model suffix 
JS_SET_ROW_FIELD = """ 
(rowIndex, fieldNgModel, value) => { 
    const rows = document.querySelectorAll('tr[ng-repeat*="ecriture"], tr[ng-repeat*="ligne"], tr[ng-repeat*="row"]'); 
    if (!rows[rowIndex]) return 'row not found: ' + rowIndex; 
    const el = rows[rowIndex].querySelector('[ng-model*="' + fieldNgModel + '"]'); 
    if (!el) return 'field not found: ' + fieldNgModel + ' in row ' + rowIndex; 
    el.value = value; 
    const scope = angular.element(el).scope(); 
    scope.$apply(() => { 
        const parts = el.getAttribute('ng-model').split('.'); 
        let obj = scope; 
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]]; 
        obj[parts[parts.length - 1]] = value; 
    }); 
    el.dispatchEvent(new Event('input', { bubbles: true })); 
    el.dispatchEvent(new Event('change', { bubbles: true })); 
    return 'ok'; 
} 
""" 
 
# Set nya-bs-select on a specific row 
JS_SET_ROW_NYA = """ 
(rowIndex, fieldNgModel, optionText) => { 
    const rows = document.querySelectorAll('tr[ng-repeat*="ecriture"], tr[ng-repeat*="ligne"], tr[ng-repeat*="row"]'); 
    if (!rows[rowIndex]) return 'row not found'; 
    const el = rows[rowIndex].querySelector('[ng-model*="' + fieldNgModel + '"]'); 
    if (!el) return 'select not found: ' + fieldNgModel; 
    const wrapper = el.closest('.nya-bs-select') || el.parentElement; 
    const btn = wrapper.querySelector('button.dropdown-toggle'); 
    if (!btn) return 'no toggle'; 
    btn.click(); 
    return new Promise(resolve => { 
        setTimeout(() => { 
            const items = wrapper.querySelectorAll('ul.dropdown-menu li a'); 
            for (const a of items) { 
                if (a.textContent.trim().includes(optionText.trim())) { 
                    a.click(); resolve('ok'); return; 
                } 
            } 
            resolve('not found: ' + optionText); 
        }, 300); 
    }); 
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
# PWAFiller 
# --------------------------------------------------------------------------- 
 
class PWAFiller: 
    def __init__(self, cdp_port: int = None): 
        self.cdp_port = cdp_port or settings.cdp_port 
        self.cdp_url = f"http://{settings.cdp_host}:{self.cdp_port}" 
 
    async def _get_saisie_page(self, browser: Browser) -> Page: 
        for context in browser.contexts: 
            for page in context.pages: 
                url = page.url.lower() 
                title = (await page.title()).lower() 
                if any(k in url or k in title for k in ["saisie", "ecriture", "axeane", "kompta", "webcompta"]): 
                    return page 
        pages = browser.contexts[0].pages if browser.contexts else [] 
        if pages: 
            return pages[0] 
        raise RuntimeError("Could not find the Axeane Kompta PWA page.") 
 
    async def discover_ng_models(self) -> list[dict]: 
        """ 
        Debug helper: connect and return all ng-model names found on the page. 
        Call this once to discover the real ng-model names before automating. 
        """ 
        async with async_playwright() as p: 
            browser = await p.chromium.connect_over_cdp(self.cdp_url) 
            try: 
                page = await self._get_saisie_page(browser) 
                return await page.evaluate(JS_LIST_NG_MODELS) 
            finally: 
                await browser.close() 
 
    async def _fill_header(self, page: Page, header: dict) -> None: 
        await asyncio.sleep(0.3) 
 
        # These ng-model names are best guesses — run discover_ng_models() 
        # to get the real ones from your PWA, then update here 
        field_map = { 
            "date_operation": "ec.dateOperation", 
            "mois":           "ec.mois", 
            "mvt":            "ec.mvt", 
            "jour":           "ec.jour", 
            "ref_doc":        "ec.refDoc", 
            "libelle":        "ec.libelle", 
        } 
        nya_map = { 
            "journal":  "ec.journal", 
            "devise":   "ec.devise", 
        } 
 
        for key, ng_model in field_map.items(): 
            value = header.get(key, "") 
            if value: 
                result = await page.evaluate(JS_SET_NG_MODEL, [ng_model, value]) 
                logger.debug(f"Header {key} ({ng_model}) = {value} → {result}") 
                await asyncio.sleep(0.15) 
 
        for key, ng_model in nya_map.items(): 
            value = header.get(key, "") 
            if value: 
                result = await page.evaluate(JS_SELECT_NYA, [ng_model, value]) 
                logger.debug(f"Header NYA {key} ({ng_model}) = {value} → {result}") 
                await asyncio.sleep(0.5) 
 
    async def _ensure_row_exists(self, page: Page, row_index: int) -> None: 
        current = await page.evaluate(JS_GET_ROW_COUNT) 
        while current <= row_index: 
            result = await page.evaluate(JS_CLICK_ADD_ROW) 
            logger.debug(f"Add row clicked: {result}") 
            await asyncio.sleep(0.5) 
            current = await page.evaluate(JS_GET_ROW_COUNT) 
 
    async def _fill_line(self, page: Page, row_index: int, line: dict) -> None: 
        await self._ensure_row_exists(page, row_index) 
        await asyncio.sleep(0.2) 
 
        # ng-model suffix guesses for row fields — update after discover_ng_models() 
        if line.get("compte"): 
            r = await page.evaluate(JS_SET_ROW_FIELD, [row_index, "compte", line["compte"]]) 
            logger.debug(f"Row {row_index} compte → {r}") 
            await asyncio.sleep(0.6)  # wait for typeahead 
 
        if line.get("libelle"): 
            r = await page.evaluate(JS_SET_ROW_FIELD, [row_index, "libelle", line["libelle"]]) 
            logger.debug(f"Row {row_index} libelle → {r}") 
            await asyncio.sleep(0.2) 
 
        if line.get("debit", 0) > 0: 
            r = await page.evaluate(JS_SET_ROW_FIELD, [row_index, "debit", str(line["debit"])]) 
            logger.debug(f"Row {row_index} debit → {r}") 
 
        if line.get("credit", 0) > 0: 
            r = await page.evaluate(JS_SET_ROW_FIELD, [row_index, "credit", str(line["credit"])]) 
            logger.debug(f"Row {row_index} credit → {r}") 
 
        if line.get("tresorerie"): 
            r = await page.evaluate(JS_SET_ROW_NYA, [row_index, "tresorerie", line["tresorerie"]]) 
            logger.debug(f"Row {row_index} tresorerie → {r}") 
            await asyncio.sleep(0.5) 
 
        await asyncio.sleep(0.2) 
 
    async def fill_entry(self, fill_data: dict, auto_save: bool = False) -> bool: 
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
 
    async def fill_document(self, all_fill_data: list[dict], auto_save: bool = False) -> FillingResult: 
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
        return FillingResult(success=failed == 0, rows_filled=filled, rows_failed=failed, errors=errors) 
