# DOM Selector Map - Axeane Kompta Saisie des Écritures Form

## Header Fields (Form Inputs)
- **Date opération**: `#ec-date-creation`
- **Journal**: `ol#jo-eav` (nya-bs-select dropdown)
- **Mois**: `ol#inputMoisIdEcriture` (nya-bs-select dropdown)
- **Devise**: `ol#devise` (nya-bs-select dropdown)
- **Jour**: `#inputJourIdEcritureAv`
- **Réf/N°doc**: `#idDocumentInputMD2`
- **Libellé**: `#inputLibelleIdMD2`
- **Mvt (Mouvement)**: `#mvtSeq`

## Grid Row Fields (Dynamic - indexed by row)
Each row has a consistent ID pattern based on its index (0, 1, 2, ...):

- **N° Compte (Account)**: `#cc_{index}_3`
  - Example: `#cc_0_3`, `#cc_1_3`, `#cc_2_3`
  - Typeahead input with AngularJS binding

- **Libellé (Description)**: `#exlibelle{index}`
  - Example: `#exlibelle0`, `#exlibelle1`, `#exlibelle2`

- **Trésorerie (Treasury)**: `#treso-eav-{index}`
  - Example: `#treso-eav-0`, `#treso-eav-1`
  - ui-select dropdown (currently disabled in PWA)

- **Débit**: `#debit-eav-{index}`
  - Example: `#debit-eav-0`, `#debit-eav-1`
  - Numeric input (right-aligned)

- **Crédit**: `#credit-eav-{index}`
  - Example: `#credit-eav-0`, `#credit-eav-1`
  - Numeric input (right-aligned)

## UI Elements
- **Add Row Button**: `.fa-plus` or `[ng-click*="ajouterEcriture"]`
- **Save Button**: `button` containing "Enregistrer"
- **Table**: `table.td-t`
- **Rows Container**: `table tbody tr.td-row`

## CSS Classes Reference
- `.td-root` - Main container
- `.td-v3c` - V3 Card layout
- `.td-t` - Table
- `.td-row` - Table row
- `.tc-ck` - Checkbox column
- `.tc-nm` - Number column
- `.tc-cp` - Compte (Account) column
- `.tc-lb` - Libellé column
- `.tc-tr` - Trésorerie column
- `.tc-mt` - Montant (Debit/Credit) column

## Notes
- Thenya-bs-select dropdowns require clicking the button, finding the matching `<li>` option, and clicking it
- Account field uses AngularJS uib-typeahead for autocomplete
- Debit/Credit fields dispatch `input` and `change` events for AngularJS binding
- Row count can be obtained from: `document.querySelectorAll('table tbody tr.td-row').length`
