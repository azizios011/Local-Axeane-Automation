# Axeane-Filler: PWA Form Automation - DOM Selector Update

## Summary
The `pwa_filler.py` has been updated with exact DOM selectors extracted from the actual Axeane Kompta XHTML form structure. The form uses AngularJS with nya-bs-select dropdowns and custom V3 card architecture.

## Updated Selectors

### Header Fields
All header fields now use exact CSS selectors instead of generic attribute patterns:

| Field | Selector |
|-------|----------|
| Date Opération | `#ec-date-creation` |
| Journal | `ol#jo-eav` |
| Mois | `ol#inputMoisIdEcriture` |
| Devise | `ol#devise` |
| Jour | `#inputJourIdEcritureAv` |
| Réf/N°doc | `#idDocumentInputMD2` |
| Libellé | `#inputLibelleIdMD2` |
| Mvt (Mouvement) | `#mvtSeq` |

### Grid Row Fields (Dynamic)
Row indices are 0-based. Use dynamic selectors:

| Field | Selector Pattern | Examples |
|-------|------------------|----------|
| Account (Compte) | `#cc_{index}_3` | `#cc_0_3`, `#cc_1_3`, `#cc_2_3` |
| Libellé | `#exlibelle{index}` | `#exlibelle0`, `#exlibelle1` |
| Débit | `#debit-eav-{index}` | `#debit-eav-0`, `#debit-eav-1` |
| Crédit | `#credit-eav-{index}` | `#credit-eav-0`, `#credit-eav-1` |
| Trésorerie | `#treso-eav-{index}` | `#treso-eav-0`, `#treso-eav-1` |

## JavaScript Helpers Updated

The following inline JavaScript helpers have been optimized:

1. **JS_SET_ROW_COMPTE** - Sets account using direct selector `#cc_{index}_3`
2. **JS_SET_ROW_LIBELLE** - Sets description using `#exlibelle{index}`
3. **JS_SET_ROW_AMOUNT** - Sets debit/credit using `#{field}-eav-{index}`

All helpers now:
- Use template literals for dynamic selectors
- Properly dispatch `input` and `change` events for AngularJS binding
- Support AngularJS scope updates when available

## Form Structure Reference

The Saisie des écritures form uses:
- **Table ID**: `td-t`
- **Row Class**: `td-row`
- **Header**: V3 Card with class `td-v3hd`
- **Info Zone**: Class `td-v3-info-zone` for header fields
- **Grid**: Class `td-li` wrapping the table

## Key Improvements

✅ Replaced generic attribute selectors with exact IDs
✅ Fixed row selector patterns to use consistent indexing
✅ Added dynamic selector generation using template literals
✅ Improved AngularJS event dispatching
✅ Added Devise field support
✅ Reordered header fields to logical order

## Testing Recommendations

1. **Unit Test**: Verify selectors exist with browser DevTools
2. **Integration Test**: Run with actual PWA instance on port 9222
3. **Validation**: Check that:
   - Text inputs accept values
   - nya-bs-select dropdowns open and select options
   - AngularJS ng-models update properly
   - Debit/Credit calculations trigger

## Files Modified
- `/services/pwa_filler.py` - Complete rewrite with updated selectors
- `/DOM_SELECTORS.md` - Reference documentation

## Next Steps
1. Test with actual Axeane Kompta PWA instance
2. Adjust selectors if form structure varies between versions
3. Add error handling for selector mismatches
4. Implement retry logic for AngularJS timing issues
