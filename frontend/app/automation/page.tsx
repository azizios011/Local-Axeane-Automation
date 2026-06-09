'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle2, FlaskConical, Zap, Terminal, Loader2, AlertCircle, PlayCircle, History } from 'lucide-react';
import { apiClient, ExtractedDocument, FillPreviewRequest, Formula, FillPreviewResult } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAppContext } from '@/lib/context';

export default function AutomationPage() {
  const { extractedDoc, cdpPort } = useAppContext();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isFillLoading, setIsFillLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<FillPreviewResult[]>([]);
  const [fillOutput, setFillOutput] = useState<{msg: string, type: 'info' | 'success' | 'error' | 'warn'}[]>([]);
  const { success, error, info } = useToast();

  useEffect(() => {
    loadFormulas();
  }, []);

  const loadFormulas = async () => {
    try {
      const data = await apiClient.listFormulas();
      setFormulas(data);
    } catch (err) {
      console.error('Failed to load formulas:', err);
    }
  };

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    setFillOutput((prev) => [...prev, { msg, type }]);
  };

  const handlePreview = async () => {
    if (!extractedDoc) {
      error('No document selected', 'Please extract a PDF first.');
      return;
    }

    setIsPreviewLoading(true);
    setPreviewResults([]);
    addLog(`Generating dry-run preview for ${extractedDoc.rows.length} rows...`, 'info');

    try {
      const req: FillPreviewRequest = {
        document: extractedDoc,
        formula_id: selectedFormulaId || undefined,
      };
      const results = await apiClient.previewFill(req);
      setPreviewResults(results);
      success('Preview generated', `Calculated mappings for ${results.length} rows.`);
      addLog(`Preview ready. Mapped ${results.length} rows using ${selectedFormulaId ? 'selected formula' : 'auto-detection'}.`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      error('Preview failed', msg);
      addLog(`Preview error: ${msg}`, 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleFill = async () => {
    if (!extractedDoc) {
      error('No document selected');
      return;
    }

    setIsFillLoading(true);
    addLog('Initializing PWA Automation Filler...', 'info');
    
    const cdpPort = parseInt(localStorage.getItem('CDP_PORT') || '9222');
    addLog(`Targeting Axeane PWA with ${extractedDoc.rows.length} entries on port ${cdpPort}.`, 'info');

    try {
      const req = {
        document: extractedDoc,
        formula_id: selectedFormulaId || undefined,
        auto_save: autoSave,
        cdp_port: cdpPort,
      };
      const result = await apiClient.fillPwa(req);
      
      if (result.success) {
        success('Automation Complete', `Successfully filled ${result.rows_filled} rows.`);
        addLog(`SUCCESS: ${result.rows_filled} rows processed.`, 'success');
      } else {
        error('Automation Partial Success', `${result.rows_failed} rows failed.`);
        addLog(`PARTIAL SUCCESS: ${result.rows_filled} filled, ${result.rows_failed} failed.`, 'warn');
        result.errors.forEach(err => addLog(`Error: ${err}`, 'error'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection lost or browser error';
      error('Fill failed', msg);
      addLog(`CRITICAL ERROR: ${msg}`, 'error');
    } finally {
      setIsFillLoading(false);
    }
  };

  return (
    <main className="ml-sidebar-width flex-1 overflow-y-auto p-lg pt-[88px] flex flex-col gap-lg no-scrollbar min-h-screen">
      <div className="flex justify-between items-end mb-sm">
        <div>
          <h2 className="text-display-lg-mobile font-display-lg-mobile text-on-surface">PWA Automation Filler</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Execute automated data entry into Axeane Kompta PWA.</p>
        </div>
        <div className="flex items-center gap-6 bg-surface-container p-3 rounded-lg border border-outline-variant">
          <label className="flex items-center gap-3 cursor-pointer group">
            <span className="text-label-caps font-label-caps text-on-surface-variant group-hover:text-primary transition-colors">Auto-Save Mode</span>
            <div className="relative">
              <input
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="sr-only peer"
                type="checkbox"
              />
              <div className="w-10 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter h-full pb-8 items-stretch">
        <div className="lg:col-span-5 flex flex-col gap-md">
          {/* Step 1: Document */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold">01</div>
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Target Document</h3>
            </div>
            {!extractedDoc ? (
              <div className="p-6 border-2 border-dashed border-outline-variant rounded-lg text-center">
                <p className="text-body-sm text-on-surface-variant mb-3">No document extracted yet.</p>
                <button 
                  onClick={() => window.location.href='/extraction'}
                  className="text-primary text-label-caps font-label-caps hover:underline"
                >
                  Go to Extraction →
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-surface-container-high rounded-lg border border-primary/30">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <div className="flex-1 min-w-0">
                  <span className="text-body-md font-bold text-on-surface block truncate">{extractedDoc.filename}</span>
                  <span className="text-body-sm text-on-surface-variant">{extractedDoc.rows.length} rows ready for processing.</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Formula */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold">02</div>
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Mapping Strategy</h3>
            </div>
            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${selectedFormulaId === null ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-high hover:border-primary/50'}`}>
                <input
                  checked={selectedFormulaId === null}
                  onChange={() => setSelectedFormulaId(null)}
                  className="mt-1 accent-primary"
                  name="formula"
                  type="radio"
                />
                <div>
                  <span className={`block text-body-md font-bold ${selectedFormulaId === null ? 'text-primary' : 'text-on-surface'}`}>AI Auto-Detection</span>
                  <span className="block text-body-sm text-on-surface-variant mt-1">Smart-match rows to formulas based on libellé patterns.</span>
                </div>
              </label>

              <div className="relative">
                <select
                  value={selectedFormulaId || ''}
                  onChange={(e) => setSelectedFormulaId(e.target.value || null)}
                  className="w-full appearance-none bg-surface-container-high border border-outline-variant rounded-lg px-4 py-3 pr-10 text-body-sm text-on-surface focus:border-primary focus:outline-none transition-all"
                >
                  <option value="">Or select a specific formula...</option>
                  {formulas.map(f => (
                    <option key={f.id} value={f.id}>{f.libelle_filter} ({f.journal_code})</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto pt-4 flex flex-col gap-3">
            <button
              onClick={handlePreview}
              disabled={!extractedDoc || isPreviewLoading || isFillLoading}
              className="w-full py-4 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container-high hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-3 font-bold disabled:opacity-50"
            >
              {isPreviewLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FlaskConical className="w-5 h-5" />
              )}
              Preview Dry Run
            </button>
            <button
              onClick={handleFill}
              disabled={!extractedDoc || isFillLoading}
              className="w-full py-4 rounded-xl bg-primary text-on-primary-fixed hover:bg-primary-fixed transition-all flex items-center justify-center gap-3 font-bold disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {isFillLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              Start PWA Automation
            </button>
          </div>
        </div>

        {/* Output Console */}
        <div className="lg:col-span-7 flex flex-col gap-md">
          <div className="bg-surface-container border border-outline-variant rounded-xl flex flex-col flex-1 overflow-hidden shadow-inner">
            <div className="px-md py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <h3 className="text-label-caps font-label-caps text-on-surface">Execution Console</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isFillLoading ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.8)]' : 'bg-on-surface-variant opacity-30'}`}></div>
                <span className="text-[10px] font-bold tracking-widest text-on-surface-variant">
                  {isFillLoading ? 'LIVE_STREAMING' : 'IDLE'}
                </span>
              </div>
            </div>
            <div className="p-md flex-1 overflow-y-auto font-data-mono text-[12px] bg-surface-container-lowest text-on-surface-variant flex flex-col gap-1.5 min-h-[500px]">
              {fillOutput.length === 0 && previewResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale">
                  <PlayCircle className="w-12 h-12 mb-2" />
                  <p>Awaiting execution signals...</p>
                </div>
              ) : (
                <>
                  {previewResults.length > 0 && (
                    <div className="mb-4 p-3 bg-surface-container rounded border border-outline-variant">
                      <div className="text-primary font-bold mb-2 flex items-center gap-2">
                        <History className="w-3 h-3" /> PREVIEW DATA:
                      </div>
                      {previewResults.map((res, i) => (
                        <div key={i} className="flex gap-2 border-b border-outline-variant/10 py-1 last:border-0">
                          <span className="text-primary">[{res.reference}]</span>
                          <span className="text-on-surface truncate">{JSON.stringify(res.fill_data)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {fillOutput.map((log, idx) => (
                    <div key={idx} className={`flex gap-3 ${
                      log.type === 'success' ? 'text-primary' : 
                      log.type === 'error' ? 'text-error' : 
                      log.type === 'warn' ? 'text-tertiary' : 'text-on-surface-variant'
                    }`}>
                      <span className="opacity-40">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                      <span className="flex-1">{log.msg}</span>
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
