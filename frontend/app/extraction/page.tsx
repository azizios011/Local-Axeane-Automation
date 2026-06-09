import { FileUp, FileText, Braces, Eye, Send, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ExtractionPage() {
  return (
    <main className="ml-sidebar-width mt-16 p-lg xl:p-xl flex flex-col gap-lg min-h-[calc(100vh-4rem)]">
      <div className="flex justify-between items-end mb-sm">
        <div>
          <h1 className="text-display-lg font-display-lg text-on-surface">Invoice Extraction</h1>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Upload PDF invoices to extract structured accounting data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col h-64 relative group overflow-hidden">
          <input accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" type="file" />
          <div className="flex-1 border-2 border-dashed border-outline-variant group-hover:border-primary group-hover:bg-surface-container-high transition-colors duration-200 rounded-lg flex flex-col items-center justify-center bg-surface-container-low">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-md group-hover:bg-primary-container/20 transition-colors border border-outline-variant group-hover:border-primary/50">
              <FileUp className="w-8 h-8 text-primary" />
            </div>
            <p className="text-headline-sm font-headline-sm text-on-surface mb-xs">Drag & Drop PDF here</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant mb-lg">or click to browse from your computer</p>
            <button className="bg-primary text-on-primary hover:bg-primary-fixed rounded-lg px-lg py-md text-label-caps font-label-caps transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface relative z-20">
              Extract Invoice
            </button>
          </div>
        </div>

        <div className="lg:col-span-1 bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Active Task</h3>
              <span className="bg-primary-container/20 border border-primary/30 text-primary px-2 py-1 rounded text-label-caps font-label-caps">Processing</span>
            </div>
            <div className="flex items-center gap-3 mb-sm bg-surface-container-highest p-3 rounded-lg border border-outline-variant/50">
              <FileText className="w-5 h-5 text-tertiary" />
              <span className="text-body-sm font-body-sm text-on-surface font-medium truncate">INV_2023_TechCorp_001.pdf</span>
            </div>
            <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">Extracting Line Items & VAT...</p>
          </div>
          <div>
            <div className="flex justify-between text-label-caps font-label-caps text-primary mb-2">
              <span>Progress</span>
              <span>68%</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden border border-outline-variant/30">
              <div className="bg-primary h-2 rounded-full w-[68%] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(78,222,163,0.5)]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden mt-md">
        <div className="px-lg py-md border-b border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-high">
          <div>
            <h2 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
              Extraction Results
              <span className="bg-surface-container-highest text-on-surface-variant border border-outline-variant rounded-full px-3 py-1 text-label-caps font-label-caps ml-2">3 Pending Review</span>
            </h2>
          </div>
          <div className="flex gap-sm">
            <button className="border border-outline-variant text-on-surface hover:text-primary hover:border-primary/50 hover:bg-surface-container-highest rounded-lg px-4 py-2 text-label-caps font-label-caps transition-colors flex items-center gap-2 focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface">
              <Braces className="w-[18px] h-[18px]" />
              Download JSON
            </button>
            <button className="border border-outline-variant text-on-surface hover:text-primary hover:border-primary/50 hover:bg-surface-container-highest rounded-lg px-4 py-2 text-label-caps font-label-caps transition-colors flex items-center gap-2 focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface">
              <Eye className="w-[18px] h-[18px]" />
              View Raw
            </button>
            <button className="bg-primary text-on-primary hover:bg-primary-fixed rounded-lg px-4 py-2 text-label-caps font-label-caps transition-colors flex items-center gap-2 shadow-sm focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface">
              <Send className="w-[18px] h-[18px]" fill="currentColor" />
              Send to Automation
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant whitespace-nowrap uppercase">Reference (AC/FC)</th>
                <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant whitespace-nowrap uppercase">Date</th>
                <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant uppercase">Libellé</th>
                <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant text-right whitespace-nowrap uppercase">HT</th>
                <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant text-right whitespace-nowrap uppercase">TVA</th>
                <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant text-right whitespace-nowrap uppercase">TTC</th>
                <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant uppercase">Client</th>
              </tr>
            </thead>
            <tbody className="text-body-sm font-body-sm text-on-surface">
              <tr className="border-b border-outline-variant hover:bg-surface-container-high transition-colors group">
                <td className="px-md py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(78,222,163,0.6)]"></span>
                    <span className="font-data-mono text-data-mono text-on-surface">FC-2023-089</span>
                  </div>
                </td>
                <td className="px-md py-3 text-on-surface-variant whitespace-nowrap font-data-mono text-data-mono">2023-10-15</td>
                <td className="px-md py-3 max-w-xs truncate" title="Prestations de conseil IT - Octobre">Prestations de conseil IT - Octobre</td>
                <td className="px-md py-3 text-right text-data-mono font-data-mono text-primary">4 500.00 €</td>
                <td className="px-md py-3 text-right text-data-mono font-data-mono text-on-surface-variant">900.00 €</td>
                <td className="px-md py-3 text-right text-data-mono font-data-mono font-semibold text-primary">5 400.00 €</td>
                <td className="px-md py-3">
                  <span className="bg-surface-container-highest text-on-surface px-2 py-1 rounded text-label-caps font-label-caps border border-outline-variant">TechCorp Inc.</span>
                </td>
              </tr>
              <tr className="border-b border-outline-variant bg-surface-container hover:bg-surface-container-high transition-colors group">
                <td className="px-md py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                    <span className="font-data-mono text-data-mono text-on-surface">AC-2023-112</span>
                  </div>
                </td>
                <td className="px-md py-3 text-on-surface-variant whitespace-nowrap font-data-mono text-data-mono">2023-10-18</td>
                <td className="px-md py-3 max-w-xs truncate" title="Achat matériel informatique (Serveurs)">Achat matériel informatique (Serveurs)</td>
                <td className="px-md py-3 text-right text-data-mono font-data-mono text-primary">12 000.00 €</td>
                <td className="px-md py-3 text-right text-data-mono font-data-mono text-on-surface-variant">2 400.00 €</td>
                <td className="px-md py-3 text-right text-data-mono font-data-mono font-semibold text-primary">14 400.00 €</td>
                <td className="px-md py-3">
                  <span className="bg-surface-container-highest text-on-surface px-2 py-1 rounded text-label-caps font-label-caps border border-outline-variant">ServerPro Ltd</span>
                </td>
              </tr>
              <tr className="border-b border-outline-variant hover:bg-surface-container-high transition-colors group">
                <td className="px-md py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(78,222,163,0.6)]"></span>
                    <span className="font-data-mono text-data-mono text-on-surface">FC-2023-090</span>
                  </div>
                </td>
                <td className="px-md py-3 text-on-surface-variant whitespace-nowrap font-data-mono text-data-mono">2023-10-20</td>
                <td className="px-md py-3 max-w-xs truncate" title="Licences SaaS Annuelles">Licences SaaS Annuelles</td>
                <td className="px-md py-3 text-right text-data-mono font-data-mono text-primary">1 200.00 €</td>
                <td className="px-md py-3 text-right text-data-mono font-data-mono text-on-surface-variant">240.00 €</td>
                <td className="px-md py-3 text-right text-data-mono font-data-mono font-semibold text-primary">1 440.00 €</td>
                <td className="px-md py-3">
                  <span className="bg-surface-container-highest text-on-surface px-2 py-1 rounded text-label-caps font-label-caps border border-outline-variant">CloudSystems</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-md py-sm border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-body-sm font-body-sm text-on-surface-variant">
          <span>Showing 1 to 3 of 3 entries</span>
          <div className="flex gap-1">
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest disabled:opacity-50 text-on-surface border border-transparent hover:border-outline-variant transition-colors" disabled>
              <ChevronLeft className="w-[18px] h-[18px]" />
            </button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest disabled:opacity-50 text-on-surface border border-transparent hover:border-outline-variant transition-colors" disabled>
              <ChevronRight className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
