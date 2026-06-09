'use client';

import { useEffect, useState } from 'react';
import { Plus, Code, Pencil, Trash2, ListTree, Braces, Network, Brackets, Loader2, Save, X, Trash } from 'lucide-react';
import { apiClient, Formula, FormulaCreate, FormulaLine, SensType } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const { success, error } = useToast();

  const [formData, setFormData] = useState<Partial<FormulaCreate>>({
    doc_type_name: 'Vente',
    journal_code: 'VT',
    libelle_filter: '',
    lines: [],
  });

  useEffect(() => {
    loadFormulas();
  }, []);

  const loadFormulas = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.listFormulas();
      setFormulas(data);
      if (data.length > 0 && !selectedFormula) {
        setSelectedFormula(data[0]);
      }
    } catch (err) {
      error('Failed to load formulas', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFormula = async (formulaId: string) => {
    if (!confirm('Are you sure you want to delete this formula?')) return;
    try {
      await apiClient.deleteFormula(formulaId);
      setFormulas((prev) => prev.filter((f) => f.id !== formulaId));
      if (selectedFormula?.id === formulaId) {
        setSelectedFormula(formulas.find(f => f.id !== formulaId) || null);
      }
      success('Formula deleted successfully');
    } catch (err) {
      error('Failed to delete formula', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSaveFormula = async () => {
    if (!formData.doc_type_name || !formData.journal_code || !formData.libelle_filter) {
      error('Please fill in all required fields');
      return;
    }

    try {
      if (isEditing && selectedFormula) {
        const updated = await apiClient.updateFormula(selectedFormula.id, formData);
        setFormulas((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f))
        );
        setSelectedFormula(updated);
        success('Formula updated successfully');
      } else {
        const created = await apiClient.createFormula(formData as FormulaCreate);
        setFormulas((prev) => [...prev, created]);
        setSelectedFormula(created);
        success('Formula created successfully');
        setShowNewForm(false);
      }
      setIsEditing(false);
    } catch (err) {
      error('Failed to save formula', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleAddLine = () => {
    const lines = [...(formData.lines || [])];
    lines.push({
      ordre: lines.length + 1,
      compte: '',
      libelle_template: '{libelle}',
      sens_facture: SensType.debit,
      sens_avoir: SensType.credit,
      montant_source: 'ttc',
    });
    setFormData({ ...formData, lines });
  };

  const handleRemoveLine = (index: number) => {
    const lines = (formData.lines || []).filter((_, i) => i !== index);
    // Re-order
    const reorderedLines = lines.map((line, i) => ({ ...line, ordre: i + 1 }));
    setFormData({ ...formData, lines: reorderedLines });
  };

  const handleUpdateLine = (index: number, field: keyof FormulaLine, value: unknown) => {
    const lines = [...(formData.lines || [])];
    lines[index] = { ...lines[index], [field]: value };
    setFormData({ ...formData, lines });
  };

  const startEdit = (formula: Formula) => {
    setSelectedFormula(formula);
    setFormData({
      doc_type_name: formula.doc_type_name,
      journal_code: formula.journal_code,
      libelle_filter: formula.libelle_filter,
      lines: JSON.parse(JSON.stringify(formula.lines)),
    });
    setIsEditing(true);
    setShowNewForm(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowNewForm(false);
  };

  if (isLoading) {
    return (
      <main className="ml-sidebar-width flex-1 p-lg pt-[88px] overflow-y-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-body-md text-on-surface-variant">Loading formulas...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="ml-sidebar-width flex-1 p-lg pt-[88px] overflow-y-auto">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">Formula Rules & Ledger Mappings</h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant">Define how extracted data should be mapped to accounting entries.</p>
        </div>
        <button
          onClick={() => {
            setShowNewForm(true);
            setIsEditing(false);
            setFormData({
              doc_type_name: 'Vente',
              journal_code: 'VT',
              libelle_filter: '',
              lines: [],
            });
          }}
          className="bg-primary/10 text-primary border border-primary px-4 py-2 rounded-lg text-label-caps font-label-caps flex items-center gap-2 hover:bg-primary/20 focus:ring-2 focus:ring-primary transition-all shadow-[0_0_10px_rgba(78,222,163,0.2)]"
        >
          <Plus className="w-4 h-4" />
          New Formula
        </button>
      </div>

      <div className="grid grid-cols-12 gap-gutter min-h-[calc(100vh-220px)] items-stretch">
        {/* Left Sidebar: Formula List */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-sm overflow-y-auto pr-2 pb-4">
          {formulas.length === 0 ? (
            <div className="bg-surface-container rounded-xl p-8 text-center border border-outline-variant">
              <p className="text-on-surface-variant">No formulas found.</p>
            </div>
          ) : (
            formulas.map((formula) => (
              <div
                key={formula.id}
                onClick={() => !isEditing && !showNewForm && setSelectedFormula(formula)}
                className={`rounded-xl p-md relative cursor-pointer group transition-all border ${
                  selectedFormula?.id === formula.id
                    ? 'bg-surface-container-high border-primary shadow-lg'
                    : 'bg-surface-container border-outline-variant hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start mb-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Code className={`w-4 h-4 ${selectedFormula?.id === formula.id ? 'text-primary' : 'text-on-surface-variant'}`} />
                      <h3 className="text-[11px] font-label-caps tracking-widest uppercase text-on-surface">
                        {formula.doc_type_name} ({formula.journal_code})
                      </h3>
                    </div>
                    <div className="inline-flex items-center gap-1 bg-surface-container-lowest px-2 py-1 rounded text-data-mono font-data-mono text-primary border border-outline-variant text-xs">
                      {formula.libelle_filter}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(formula);
                      }}
                      className="p-1.5 text-on-surface-variant hover:text-primary bg-surface-container-highest rounded border border-outline-variant"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFormula(formula.id);
                      }}
                      className="p-1.5 text-on-surface-variant hover:text-error bg-surface-container-highest rounded border border-outline-variant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 mt-md opacity-70">
                  {formula.lines.slice(0, 2).map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between text-data-mono font-data-mono text-[11px]">
                      <span className="text-on-surface">{line.compte}</span>
                      <span className="text-on-surface-variant uppercase">{line.sens_facture}</span>
                      <span className="text-primary">{line.montant_source}</span>
                    </div>
                  ))}
                  {formula.lines.length > 2 && (
                    <div className="text-[10px] text-on-surface-variant italic">+{formula.lines.length - 2} more lines</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Content: Editor or Viewer */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant shadow-xl rounded-xl flex flex-col h-full overflow-hidden">
          {isEditing || showNewForm ? (
            <div className="flex flex-col h-full">
              <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
                <h3 className="text-headline-sm font-headline-sm text-on-surface">
                  {isEditing ? 'Edit Formula' : 'Create New Formula'}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-label-caps font-label-caps text-on-surface-variant hover:text-on-surface flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button
                    onClick={handleSaveFormula}
                    className="px-4 py-2 bg-primary text-on-primary-fixed rounded-md text-label-caps font-label-caps flex items-center gap-2 hover:bg-primary-fixed shadow-md"
                  >
                    <Save className="w-4 h-4" /> Save Formula
                  </button>
                </div>
              </div>

              <div className="p-lg overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">Doc Type</label>
                    <input
                      type="text"
                      value={formData.doc_type_name}
                      onChange={(e) => setFormData({ ...formData, doc_type_name: e.target.value })}
                      className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none focus:border-primary"
                      placeholder="e.g. Vente"
                    />
                  </div>
                  <div>
                    <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">Journal Code</label>
                    <input
                      type="text"
                      value={formData.journal_code}
                      onChange={(e) => setFormData({ ...formData, journal_code: e.target.value })}
                      className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none focus:border-primary"
                      placeholder="e.g. VT"
                    />
                  </div>
                  <div>
                    <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">Libellé Filter</label>
                    <input
                      type="text"
                      value={formData.libelle_filter}
                      onChange={(e) => setFormData({ ...formData, libelle_filter: e.target.value })}
                      className="w-full bg-surface-container-highest border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none focus:border-primary"
                      placeholder="Matches extracted libellé"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-label-caps font-label-caps text-secondary flex items-center gap-2">
                      <ListTree className="w-4 h-4" /> Accounting Lines
                    </h4>
                    <button
                      onClick={handleAddLine}
                      className="text-primary text-label-caps font-label-caps flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-4 h-4" /> Add Line
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.lines?.map((line, idx) => (
                      <div key={idx} className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-1">
                          <span className="text-data-mono text-on-surface-variant text-xs">#{line.ordre}</span>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] uppercase text-on-surface-variant mb-1 block">Compte</label>
                          <input
                            type="text"
                            value={line.compte}
                            onChange={(e) => handleUpdateLine(idx, 'compte', e.target.value)}
                            className="w-full bg-surface-container-high border border-outline-variant rounded px-2 py-1 text-data-mono text-sm text-on-surface"
                            placeholder="411000"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] uppercase text-on-surface-variant mb-1 block">Libellé Template</label>
                          <input
                            type="text"
                            value={line.libelle_template}
                            onChange={(e) => handleUpdateLine(idx, 'libelle_template', e.target.value)}
                            className="w-full bg-surface-container-high border border-outline-variant rounded px-2 py-1 text-sm text-on-surface"
                            placeholder="{libelle}"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] uppercase text-on-surface-variant mb-1 block">Sens (FC)</label>
                          <select
                            value={line.sens_facture}
                            onChange={(e) => handleUpdateLine(idx, 'sens_facture', e.target.value)}
                            className="w-full bg-surface-container-high border border-outline-variant rounded px-2 py-1 text-sm text-on-surface"
                          >
                            <option value={SensType.debit}>DEBIT</option>
                            <option value={SensType.credit}>CREDIT</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] uppercase text-on-surface-variant mb-1 block">Sens (AC)</label>
                          <select
                            value={line.sens_avoir}
                            onChange={(e) => handleUpdateLine(idx, 'sens_avoir', e.target.value)}
                            className="w-full bg-surface-container-high border border-outline-variant rounded px-2 py-1 text-sm text-on-surface"
                          >
                            <option value={SensType.debit}>DEBIT</option>
                            <option value={SensType.credit}>CREDIT</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] uppercase text-on-surface-variant mb-1 block">Montant Source</label>
                          <select
                            value={line.montant_source}
                            onChange={(e) => handleUpdateLine(idx, 'montant_source', e.target.value)}
                            className="w-full bg-surface-container-high border border-outline-variant rounded px-2 py-1 text-sm text-on-surface"
                          >
                            <option value="ttc">TTC</option>
                            <option value="ht">HT</option>
                            <option value="tva">TVA</option>
                          </select>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-on-surface-variant hover:text-error"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!formData.lines || formData.lines.length === 0) && (
                      <div className="text-center py-8 border-2 border-dashed border-outline-variant rounded-lg text-on-surface-variant italic">
                        No lines added. Click "Add Line" to begin mapping.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedFormula ? (
            <div className="flex flex-col h-full">
              <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                    <Braces className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-headline-sm font-headline-sm text-on-surface">{selectedFormula.libelle_filter}</h3>
                    <p className="text-body-sm text-on-surface-variant">{selectedFormula.doc_type_name} &bull; {selectedFormula.journal_code}</p>
                  </div>
                </div>
                <button
                  onClick={() => startEdit(selectedFormula)}
                  className="px-4 py-2 border border-outline-variant text-on-surface hover:text-primary hover:border-primary/50 rounded-md text-label-caps font-label-caps flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit Formula
                </button>
              </div>
              <div className="p-lg overflow-y-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant text-label-caps font-label-caps text-on-surface-variant">
                      <th className="py-2 px-4">#</th>
                      <th className="py-2 px-4">Compte</th>
                      <th className="py-2 px-4">Libellé Template</th>
                      <th className="py-2 px-4">Sens (FC)</th>
                      <th className="py-2 px-4">Sens (AC)</th>
                      <th className="py-2 px-4">Source</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {selectedFormula.lines.map((line, idx) => (
                      <tr key={idx} className="border-b border-outline-variant/30 hover:bg-surface-container-high transition-colors">
                        <td className="py-3 px-4 text-on-surface-variant">{line.ordre}</td>
                        <td className="py-3 px-4 font-data-mono text-on-surface font-bold">{line.compte}</td>
                        <td className="py-3 px-4 text-on-surface">{line.libelle_template}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${line.sens_facture === 'debit' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'}`}>
                            {line.sens_facture.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${line.sens_avoir === 'debit' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'}`}>
                            {line.sens_avoir.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-primary font-data-mono uppercase">{line.montant_source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-lg">
              <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 text-on-surface-variant border border-outline-variant">
                <Network className="w-8 h-8" />
              </div>
              <h3 className="text-headline-sm font-headline-sm text-on-surface mb-2">Select a Formula</h3>
              <p className="text-body-md text-on-surface-variant max-w-xs">
                Choose a formula from the list to view its mapping rules or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
