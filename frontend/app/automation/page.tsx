import { ChevronDown, CheckCircle2, FlaskConical, Zap, Terminal } from 'lucide-react';

export default function AutomationPage() {
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
              <input defaultChecked className="sr-only peer" type="checkbox" />
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
              <select className="w-full appearance-none bg-surface-container border border-outline-variant rounded-md px-4 py-3 pr-10 text-body-md font-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all">
                <option>INV-2023-Oct-Batch.csv (45 rows)</option>
                <option>Expenses_Q3_Final.xlsx (112 rows)</option>
                <option>Payroll_Extract_Nov.csv (24 rows)</option>
              </select>
              <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
            </div>
            <div className="flex items-center gap-3 mt-2 p-3 bg-surface-container-high rounded-md border border-outline-variant border-dashed">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <div className="text-sm">
                <span className="font-semibold text-on-surface block">Ready to process:</span>
                <span className="text-on-surface-variant">45 valid rows detected.</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-md flex flex-col gap-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-surface-variant text-on-surface flex items-center justify-center text-body-sm font-body-sm font-bold">2</div>
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Select Formula Logic</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="flex items-start gap-3 p-3 rounded-md border border-primary bg-surface-container cursor-pointer transition-colors">
                <input defaultChecked className="mt-1 text-primary focus:ring-primary" name="formula" type="radio" />
                <div>
                  <span className="block text-body-md font-body-md font-semibold text-primary">Standard Invoice Mapping (V2)</span>
                  <span className="block text-body-sm font-body-sm text-on-surface-variant mt-1">Maps Total, VAT, and Supplier Name to primary fields.</span>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-md border border-outline-variant bg-surface cursor-pointer hover:bg-surface-container transition-colors">
                <input className="mt-1 text-primary focus:ring-primary" name="formula" type="radio" />
                <div>
                  <span className="block text-body-md font-body-md font-semibold text-on-surface">Multi-line Itemized Entry</span>
                  <span className="block text-body-sm font-body-sm text-on-surface-variant mt-1">Splits total across multiple account codes based on rules.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-md mt-auto bg-surface border-t border-outline-variant">
            <h3 className="text-headline-sm font-headline-sm text-on-surface mb-4">Execution Actions</h3>
            <div className="flex flex-col gap-3">
              <button className="w-full py-3 px-4 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2 font-body-md font-semibold">
                <FlaskConical className="w-5 h-5" />
                Preview Fill (Dry Run)
              </button>
              <button className="w-full py-3 px-4 rounded-md bg-primary text-on-primary-fixed hover:bg-primary-container transition-all flex items-center justify-center gap-2 font-body-md font-semibold shadow-md">
                <Zap className="w-5 h-5 font-bold" />
                Fill in Axeane PWA
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
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-label-caps font-label-caps text-primary tracking-widest leading-none mt-0.5">RUNNING</span>
              </div>
            </div>
            <div className="p-md flex-1 overflow-y-auto console-text text-data-mono flex flex-col gap-2 bg-surface-container-lowest text-on-surface">
              <div className="text-outline">Initializing Automation Sequence...</div>
              <div className="text-outline">Loading formula: Standard Invoice Mapping (V2)</div>
              <div className="text-outline">Target: Axeane PWA Entry Module</div>
              <div className="text-tertiary mt-2">[System] Connection established. Beginning processing (45 rows).</div>
              <div className="flex gap-2 items-start mt-2">
                <span className="text-primary shrink-0">[Row 1]</span>
                <span className="text-on-surface-variant">Success: Reference AC-2023-001 filled. Amount: $1,200.00</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-primary shrink-0">[Row 2]</span>
                <span className="text-on-surface-variant">Success: Reference AC-2023-002 filled. Amount: $450.50</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-error shrink-0">[Row 3]</span>
                <span className="text-error">Warning: Supplier 'TechCorp' not found. Creating placeholder. Reference AC-2023-003 filled.</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-primary shrink-0">[Row 4]</span>
                <span className="text-on-surface-variant">Success: Reference AC-2023-004 filled. Amount: $8,900.00</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-primary shrink-0">[Row 5]</span>
                <span className="text-on-surface">Processing...</span>
                <span className="inline-block w-2 h-4 bg-primary animate-ping ml-1"></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-md">
            <div className="glass-panel rounded-xl p-md flex flex-col items-center justify-center text-center bg-surface-container border border-outline-variant">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Total Rows</span>
              <span className="text-display-lg font-display-lg text-on-surface font-data-mono">45</span>
            </div>
            <div className="glass-panel rounded-xl p-md flex flex-col items-center justify-center text-center bg-surface-container border border-outline-variant border-b-4 border-b-primary">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Successful</span>
              <span className="text-display-lg font-display-lg text-primary font-data-mono">4</span>
            </div>
            <div className="glass-panel rounded-xl p-md flex flex-col items-center justify-center text-center bg-surface-container border border-outline-variant border-b-4 border-b-error">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Warnings/Failed</span>
              <span className="text-display-lg font-display-lg text-error font-data-mono">1</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
