import { Plus, Code, Pencil, Trash2, ListTree, Braces, Network, Brackets } from 'lucide-react';

export default function FormulasPage() {
  return (
    <main className="ml-sidebar-width flex-1 p-lg pt-[88px] overflow-y-auto">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">Formula Rules & Ledger Mappings Manager</h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant">Map matching criteria and dynamic string scripts using variables: row.ttc, row.ht, row.tva.</p>
        </div>
        <button className="bg-primary/10 text-primary border border-primary px-4 py-2 rounded-lg text-label-caps font-label-caps flex items-center gap-2 hover:bg-primary/20 focus:ring-2 focus:ring-primary transition-all shadow-[0_0_10px_rgba(78,222,163,0.2)]">
          <Plus className="w-4 h-4" />
          Generate Client Template Mapping Card
        </button>
      </div>

      <div className="grid grid-cols-12 gap-gutter min-h-[calc(100vh-180px)] items-stretch">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-sm overflow-y-auto pr-2 pb-4">
          <div className="bg-surface-container border border-primary shadow-[0_0_15px_rgba(78,222,163,0.15)] rounded-xl p-md relative cursor-pointer group transition-all">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"></div>
            <div className="flex justify-between items-start mb-sm">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-primary" />
                  <h3 className="text-[11px] font-label-caps text-on-surface tracking-widest uppercase">Client Rule: Telecom</h3>
                </div>
                <div className="inline-flex items-center gap-1 bg-surface px-2 py-1 rounded text-data-mono font-data-mono text-on-surface-variant border border-surface-variant">
                  &quot;Orange *&quot; OR &quot;Maroc Telecom *&quot;
                </div>
              </div>
              <div className="flex gap-1 opacity-100 transition-opacity">
                <button className="p-1 text-on-surface-variant hover:text-primary bg-surface rounded border border-surface-variant" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button className="p-1 text-on-surface-variant hover:text-error bg-surface rounded border border-surface-variant" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-md">
              <div className="flex items-center justify-between text-data-mono font-data-mono text-[12px]">
                <span className="text-on-surface">6125</span>
                <span className="text-on-surface-variant">Debit</span>
                <span className="text-primary">row.ht</span>
              </div>
              <div className="flex items-center justify-between text-data-mono font-data-mono text-[12px]">
                <span className="text-on-surface">4452</span>
                <span className="text-on-surface-variant">Debit</span>
                <span className="text-primary">row.tva</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-surface-variant shadow-sm rounded-xl p-md relative cursor-pointer group hover:border-outline hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-sm">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-on-surface-variant" />
                  <h3 className="text-[11px] font-label-caps text-on-surface-variant tracking-widest uppercase group-hover:text-on-surface">Client Rule: Office</h3>
                </div>
                <div className="inline-flex items-center gap-1 bg-surface px-2 py-1 rounded text-data-mono font-data-mono text-on-surface-variant border border-surface-variant/50">
                  &quot;Buro *&quot; OR &quot;Papeterie *&quot;
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 text-on-surface-variant hover:text-primary bg-surface rounded border border-surface-variant" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-md">
              <div className="flex items-center justify-between text-data-mono font-data-mono text-[12px]">
                <span className="text-on-surface-variant group-hover:text-on-surface">6122</span>
                <span className="text-on-surface-variant/70">Debit</span>
                <span className="text-on-surface-variant">row.ttc</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-surface-variant shadow-sm rounded-xl p-md relative cursor-pointer group hover:border-outline hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-sm">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-on-surface-variant" />
                  <h3 className="text-[11px] font-label-caps text-on-surface-variant tracking-widest uppercase group-hover:text-on-surface">Client Rule: Consulting</h3>
                </div>
                <div className="inline-flex items-center gap-1 bg-surface px-2 py-1 rounded text-data-mono font-data-mono text-on-surface-variant border border-surface-variant/50">
                  &quot;Consulting&quot; AND &gt; 5000
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-md">
              <div className="flex items-center justify-between text-data-mono font-data-mono text-[12px]">
                <span className="text-on-surface-variant group-hover:text-on-surface">6136</span>
                <span className="text-on-surface-variant/70">Debit</span>
                <span className="text-on-surface-variant">row.ttc</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-surface-container border border-surface-variant shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl flex flex-col h-full overflow-hidden">
          <div className="border-b border-surface-variant p-lg bg-surface-container-high shrink-0">
            <div className="flex items-center justify-between mb-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                  <ListTree className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-headline-sm font-headline-sm text-on-surface">Client Rule: Telecom</h2>
                  <p className="text-body-sm font-body-sm text-primary">Active Session • Configuration Editor</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 border border-surface-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-lg text-[11px] font-label-caps tracking-wider transition-all">Test Rule</button>
                <button className="px-4 py-2 bg-primary/10 text-primary border border-primary hover:bg-primary/20 rounded-lg text-[11px] font-label-caps tracking-wider transition-all shadow-[0_0_10px_rgba(78,222,163,0.1)]">Save Changes</button>
              </div>
            </div>
          </div>

          <div className="p-lg overflow-y-auto flex-1 flex flex-col gap-lg bg-surface">
            <div>
              <h4 className="text-[11px] font-label-caps text-on-surface-variant uppercase mb-sm tracking-wider flex items-center gap-2">
                <Braces className="w-4 h-4" />
                Identity Matching Keyword
              </h4>
              <div className="bg-surface-container border border-surface-variant rounded-lg p-md">
                <div className="grid grid-cols-12 gap-sm items-center">
                  <div className="col-span-11">
                    <input className="w-full bg-surface border border-surface-variant rounded p-3 text-data-mono font-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none text-primary" type="text" defaultValue='"Orange *" OR "Maroc Telecom *"' />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button className="text-on-surface-variant hover:text-error p-2 bg-surface rounded border border-surface-variant">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-label-caps text-on-surface-variant uppercase mb-sm tracking-wider flex items-center gap-2">
                <Network className="w-4 h-4" />
                Ledger Mapping Matrix
              </h4>
              <div className="flex flex-col gap-sm">
                <div className="bg-surface-container border border-surface-variant rounded-lg p-md shadow-sm">
                  <div className="grid grid-cols-12 gap-md items-center">
                    <div className="col-span-3">
                      <input className="w-full bg-surface border border-surface-variant rounded p-2 text-data-mono font-data-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none" type="text" defaultValue="61250000" />
                    </div>
                    <div className="col-span-3">
                      <select className="w-full bg-surface border border-surface-variant rounded p-2 text-data-mono font-data-mono text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none">
                        <option>Debit</option>
                        <option>Credit</option>
                      </select>
                    </div>
                    <div className="col-span-5 flex items-center gap-2 bg-surface border border-surface-variant rounded p-2">
                      <Brackets className="w-4 h-4 text-primary" />
                      <input className="w-full bg-transparent border-none p-0 text-data-mono font-data-mono text-primary focus:ring-0 outline-none" type="text" defaultValue="row.ht" />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button className="text-on-surface-variant hover:text-error p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container border border-surface-variant rounded-lg p-md shadow-sm">
                  <div className="grid grid-cols-12 gap-md items-center">
                    <div className="col-span-3">
                      <input className="w-full bg-surface border border-surface-variant rounded p-2 text-data-mono font-data-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none" type="text" defaultValue="44520000" />
                    </div>
                    <div className="col-span-3">
                      <select className="w-full bg-surface border border-surface-variant rounded p-2 text-data-mono font-data-mono text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none">
                        <option>Debit</option>
                        <option>Credit</option>
                      </select>
                    </div>
                    <div className="col-span-5 flex items-center gap-2 bg-surface border border-surface-variant rounded p-2">
                      <Brackets className="w-4 h-4 text-primary" />
                      <input className="w-full bg-transparent border-none p-0 text-data-mono font-data-mono text-primary focus:ring-0 outline-none" type="text" defaultValue="row.tva" />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button className="text-on-surface-variant hover:text-error p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
                <button className="mt-xs text-on-surface-variant bg-surface-container border border-dashed border-surface-variant hover:border-primary hover:text-primary rounded-lg p-3 text-[11px] font-label-caps flex justify-center items-center gap-2 transition-all w-max">
                  <Plus className="w-4 h-4" /> Add Ledger Row
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
