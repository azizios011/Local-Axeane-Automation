'use client';

import { useEffect, useState } from 'react';
import { Plus, Code, Pencil, Trash2, ListTree, Braces, Network, Brackets, Loader2 } from 'lucide-react';
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
    doc_type_name: '',
    journal_code: '',
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
        setSelectedFormula(formulas[0] || null);
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
    const lines = formData.lines || [];
    lines.push({
      ordre: lines.length + 1,
      compte: '',
      libelle_template: '',
      sens_facture: SensType.debit,
      sens_avoir: SensType.credit,
      montant_source: 'ttc',
    });
    setFormData({ ...formData, lines });
  };

  const handleRemoveLine = (index: number) => {
    const lines = (formData.lines || []).filter((_, i) => i !== index);
    setFormData({ ...formData, lines });
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
      lines: formula.lines,
    });
    setIsEditing(true);
    setShowNewForm(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowNewForm(false);
    if (selectedFormula) {
      setFormData({
        doc_type_name: selectedFormula.doc_type_name,
        journal_code: selectedFormula.journal_code,
        libelle_filter: selectedFormula.libelle_filter,
        lines: selectedFormula.lines,
      });
    }
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
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">Formula Rules & Ledger Mappings Manager</h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant">Map matching criteria and dynamic string scripts using variables: row.ttc, row.ht, row.tva.</p>
        </div>
        <button
          onClick={() => {
            setShowNewForm(true);
            setIsEditing(false);
            setFormData({
              doc_type_name: '',
              journal_code: '',
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

      <div className="grid grid-cols-12 gap-gutter min-h-[calc(100vh-180px)] items-stretch">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-sm overflow-y-auto pr-2 pb-4">
          {formulas.map((formula) => (
            <div
              key={formula.id}
              onClick={() => !isEditing && setSelectedFormula(formula)}
              className={
ounded-xl p-md relative cursor-pointer group transition-all \}
            >
              <div
                className={bsolute left-0 top-0 bottom-0 w-1 rounded-l-xl \}
              ></div>
              <div className="flex justify-between items-start mb-sm">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Code className={w-4 h-4 \} />
                    <h3 className={	ext-[11px] font-label-caps tracking-widest uppercase \}>
                      {formula.doc_type_name}
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-1 bg-surface px-2 py-1 rounded text-data-mono font-data-mono text-on-surface-variant border border-surface-variant text-xs">
                    {formula.libelle_filter}
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(formula);
                    }}
                    className="p-1 text-on-surface-variant hover:text-primary bg-surface rounded border border-surface-variant"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFormula(formula.id);
                    }}
                    className="p-1 text-on-surface-variant hover:text-error bg-surface rounded border border-surface-variant"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-md">
                {formula.lines.slice(0, 2).map((line, idx) => (
                  <div key={idx} className="flex items-center justify-between text-data-mono font-data-mono text-[12px]">
                    <span className="text-on-surface">{line.compte}</span>
                    <span className="text-on-surface-variant">{line.sens_facture}</span>
                    <span className="text-primary">{line.montant_source}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-8 bg-surface-container border border-surface-variant shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl flex flex-col h-full overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (isEditing || showNewForm) ? (
            <>Editor UI here</>
          ) : selectedFormula ? (
            <>Viewer UI here</>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-body-md text-on-surface-variant">Select a formula or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
