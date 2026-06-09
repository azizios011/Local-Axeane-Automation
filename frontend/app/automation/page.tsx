'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle2, FlaskConical, Zap, Terminal, Loader2 } from 'lucide-react';
import { apiClient, ExtractedDocument, FillPreviewRequest } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function AutomationPage() {
  const [selectedDoc, setSelectedDoc] = useState<ExtractedDocument | null>(null);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isFillLoading, setIsFillLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<any[]>([]);
  const [fillOutput, setFillOutput] = useState<string[]>([]);
  const { success, error } = useToast();

  const handlePreview = async () => {
    if (!selectedDoc) {
      error('Please select a document');
      return;
    }

    setIsPreviewLoading(true);
    setFillOutput([]);

    try {
      const req: FillPreviewRequest = {
        document: selectedDoc,
        formula_id: selectedFormulaId || undefined,
      };
      const results = await apiClient.previewFill(req);
      setPreviewResults(results);
      success(Preview ready for  rows);
    } catch (err) {
      error('Preview failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleFill = async () => {
    if (!selectedDoc) {
      error('Please select a document');
      return;
    }

    setIsFillLoading(true);
    setFillOutput(['Starting automation...']);

    try {
      const req = {
        document: selectedDoc,
        formula_id: selectedFormulaId || undefined,
        auto_save: autoSave,
      };
      const result = await apiClient.fillPwa(req);
      
      setFillOutput((prev) => [
        ...prev,
        Completed:  successful,  failed,
      ]);

      if (result.success) {
        success(Successfully filled  rows);
      } else {
        error(
          'Automation completed with errors',
          ${result.rows_failed} rows failed,
        );
      }
    } catch (err) {
      error('Fill failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsFillLoading(false);
    }
  };

  return (
    <main className="ml-sidebar-width flex-1 overflow-y-auto p-lg pt-[88px] flex flex-col gap-lg no-scrollbar min-h-screen">
      <div className="flex justify-between items-end mb-sm">
        <div>
          <h2 className="text-display-lg-mobile font-display-lg-mobile text-on-surface">PWA Automation Filler</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Configure and run automated data entry into external systems.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-body-sm font-body-sm text-on-surface-variant">Auto-Save after entry</span>
            <div className="relative">
              <input
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="sr-only peer"
                type="checkbox"
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter h-full pb-8">
        <div className="lg:col-span-5 flex flex-col gap-md">
          <div className="glass-panel rounded-xl p-md flex flex-col gap-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-surface-variant text-on-surface flex items-center justify-center text-body-sm font-body-sm font-bold">1</div>
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Select Extracted Document</h3>
            </div>
            <div className="relative">
              <select
                value={selectedDoc?.filename || ''}
                className="w-full appearance-none bg-surface-container border border-outline-variant rounded-md px-4 py-3 pr-10 text-body-md font-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="">Select a document...</option>
                {/* In real app, populate from extraction results */}
              </select>
              <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
            </div>
            {selectedDoc && (
              <div className="flex items-center gap-3 mt-2 p-3 bg-surface-container-high rounded-md border border-outline-variant border-dashed">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <div className="text-sm">
                  <span className="font-semibold text-on-surface block">Ready to process:</span>
                  <span className="text-on-surface-variant">{selectedDoc.rows.length} rows detected.</span>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-xl p-md flex flex-col gap-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-surface-variant text-on-surface flex items-center justify-center text-body-sm font-body-sm font-bold">2</div>
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Select Formula Logic</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="flex items-start gap-3 p-3 rounded-md border border-primary bg-surface-container cursor-pointer transition-colors">
                <input
                  checked={selectedFormulaId === null}
                  onChange={() => setSelectedFormulaId(null)}
                  className="mt-1 text-primary focus:ring-primary"
                  name="formula"
                  type="radio"
                />
                <div>
                  <span className="block text-body-md font-body-md font-semibold text-primary">Auto-detect by Libellé</span>
                  <span className="block text-body-sm font-body-sm text-on-surface-variant mt-1">Automatically select formula based on extracted libellé.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-md mt-auto bg-surface border-t border-outline-variant">
            <h3 className="text-headline-sm font-headline-sm text-on-surface mb-4">Execution Actions</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={handlePreview}
                disabled={!selectedDoc || isPreviewLoading}
                className="w-full py-3 px-4 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2 font-body-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Preview...
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-5 h-5" />
                    Preview Fill (Dry Run)
                  </>
                )}
              </button>
              <button
                onClick={handleFill}
                disabled={!selectedDoc || isFillLoading}
                className="w-full py-3 px-4 rounded-md bg-primary text-on-primary-fixed hover:bg-primary-container transition-all flex items-center justify-center gap-2 font-body-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isFillLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Filling...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 font-bold" />
                    Fill in Axeane PWA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-md h-full">
          <div className="glass-panel rounded-xl flex flex-col flex-1 bg-surface-container overflow-hidden border border-outline-variant min-h-[400px]">
            <div className="px-md py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-outline" />
                <h3 className="text-body-md font-body-md font-semibold text-on-surface">Live Progress Tracker</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={w-2 h-2 rounded-full }></span>
                <span className="text-label-caps font-label-caps text-on-surface-variant tracking-widest leading-none mt-0.5">
                  {isFillLoading ? 'RUNNING' : 'READY'}
                </span>
              </div>
            </div>
            <div className="p-md flex-1 overflow-y-auto console-text text-data-mono flex flex-col gap-2 bg-surface-container-lowest text-on-surface-variant">
              {fillOutput.length === 0 && previewResults.length === 0 ? (
                <div className="text-outline text-center mt-8">Ready to preview or execute</div>
              ) : (
                <>
                  {previewResults.map((result, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="text-primary shrink-0">[{result.reference}]</span>
                      <span className="text-on-surface-variant">Ready to fill</span>
                    </div>
                  ))}
                  {fillOutput.map((line, idx) => (
                    <div key={idx} className="text-primary">
                      {line}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
