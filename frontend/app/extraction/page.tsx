'use client';

import { useState, useRef } from 'react';
import { FileUp, FileText, Braces, Eye, Send, ChevronLeft, ChevronRight, Loader2, Zap } from 'lucide-react';
import { apiClient, ExtractedDocument, InvoiceRow } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAppContext } from '@/lib/context';
import { useRouter } from 'next/navigation';

export default function ExtractionPage() {
  const { extractedDoc, setExtractedDoc } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const itemsPerPage = 10;
  const totalPages = extractedDoc ? Math.ceil(extractedDoc.rows.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = extractedDoc?.rows.slice(startIndex, endIndex) || [];

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      error('Invalid file', 'Please upload a PDF file');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const result = await apiClient.extractPdf(file, (progress) => {
        setUploadProgress(Math.round(progress));
      });
      setExtractedDoc(result);
      setCurrentPage(1);
      success('PDF extracted successfully', `Found ${result.rows.length} invoice rows`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract PDF';
      error('Extraction failed', errorMessage);
      console.error('Extraction error:', err);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const downloadJSON = () => {
    if (!extractedDoc) return;
    const dataStr = JSON.stringify(extractedDoc, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${extractedDoc.filename.replace('.pdf', '')}_extracted.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <main className="ml-sidebar-width mt-16 p-lg xl:p-xl flex flex-col gap-lg min-h-[calc(100vh-4rem)]">
      <div className="flex justify-between items-end mb-sm">
        <div>
          <h1 className="text-display-lg font-display-lg text-on-surface">Invoice Extraction</h1>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Upload PDF invoices to extract structured accounting data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Upload Section */}
        <div
          className="lg:col-span-2 bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col h-64 relative group overflow-hidden cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            accept=".pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            type="file"
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <div className="flex-1 border-2 border-dashed border-outline-variant group-hover:border-primary group-hover:bg-surface-container-high transition-colors duration-200 rounded-lg flex flex-col items-center justify-center bg-surface-container-low">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-md group-hover:bg-primary-container/20 transition-colors border border-outline-variant group-hover:border-primary/50">
              {isLoading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <FileUp className="w-8 h-8 text-primary" />
              )}
            </div>
            <p className="text-headline-sm font-headline-sm text-on-surface mb-xs">
              {isLoading ? 'Processing...' : 'Drag & Drop PDF here'}
            </p>
            <p className="text-body-sm font-body-sm text-on-surface-variant mb-lg">
              {isLoading ? `${uploadProgress}% complete` : 'or click to browse from your computer'}
            </p>
            {!isLoading && (
              <button
                className="bg-primary text-on-primary hover:bg-primary-fixed rounded-lg px-lg py-md text-label-caps font-label-caps transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface relative z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Select PDF
              </button>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className="lg:col-span-1 bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">
                {extractedDoc ? 'Extraction Complete' : 'Ready to Upload'}
              </h3>
              <span
                className={`${
                  extractedDoc
                    ? 'bg-primary-container/20 border-primary/30 text-primary'
                    : 'bg-surface-container-highest border-outline-variant/50 text-on-surface-variant'
                } border px-2 py-1 rounded text-label-caps font-label-caps`}
              >
                {extractedDoc ? 'Complete' : 'Idle'}
              </span>
            </div>
            {extractedDoc && (
              <div className="flex items-center gap-3 mb-sm bg-surface-container-highest p-3 rounded-lg border border-outline-variant/50">
                <FileText className="w-5 h-5 text-tertiary" />
                <span className="text-body-sm font-body-sm text-on-surface font-medium truncate">
                  {extractedDoc.filename}
                </span>
              </div>
            )}
            {extractedDoc && (
              <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">
                Extracted {extractedDoc.rows.length} invoice rows
              </p>
            )}
            {!extractedDoc && (
              <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">
                Upload a PDF to get started
              </p>
            )}
          </div>
          {extractedDoc && (
            <div>
              <div className="flex justify-between text-label-caps font-label-caps text-primary mb-2">
                <span>Progress</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden border border-outline-variant/30">
                <div className="bg-primary h-2 rounded-full w-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(78,222,163,0.5)]"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      {extractedDoc && (
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden mt-md">
          <div className="px-lg py-md border-b border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-high">
            <div>
              <h2 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                Extraction Results
                <span className="bg-surface-container-highest text-on-surface-variant border border-outline-variant rounded-full px-3 py-1 text-label-caps font-label-caps ml-2">
                  {extractedDoc.rows.length} Rows
                </span>
              </h2>
            </div>
              <button
                onClick={() => router.push('/automation')}
                className="border border-primary/50 text-primary hover:bg-primary/10 rounded-lg px-4 py-2 text-label-caps font-label-caps transition-colors flex items-center gap-2 focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface shadow-[0_0_10px_rgba(78,222,163,0.1)]"
              >
                <Zap className="w-[18px] h-[18px]" />
                Go to Automation
              </button>
              <button
                onClick={downloadJSON}
                className="border border-outline-variant text-on-surface hover:text-primary hover:border-primary/50 hover:bg-surface-container-highest rounded-lg px-4 py-2 text-label-caps font-label-caps transition-colors flex items-center gap-2 focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface"
              >
                <Braces className="w-[18px] h-[18px]" />
                Download JSON
              </button>
              <button className="border border-outline-variant text-on-surface hover:text-primary hover:border-primary/50 hover:bg-surface-container-highest rounded-lg px-4 py-2 text-label-caps font-label-caps transition-colors flex items-center gap-2 focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface">
                <Eye className="w-[18px] h-[18px]" />
                View Raw
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-outline-variant">
                  <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant whitespace-nowrap uppercase">Reference</th>
                  <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant whitespace-nowrap uppercase">Date</th>
                  <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant uppercase">Libellé</th>
                  <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant text-right whitespace-nowrap uppercase">HT</th>
                  <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant text-right whitespace-nowrap uppercase">TVA</th>
                  <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant text-right whitespace-nowrap uppercase">TTC</th>
                  <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant uppercase">Client</th>
                </tr>
              </thead>
              <tbody className="text-body-sm font-body-sm text-on-surface">
                {paginatedRows.map((row: InvoiceRow, idx: number) => (
                  <tr key={idx} className="border-b border-outline-variant hover:bg-surface-container-high transition-colors group">
                    <td className="px-md py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            row.ref_prefix === 'FC' ? 'bg-primary shadow-[0_0_8px_rgba(78,222,163,0.6)]' : 'bg-tertiary'
                          }`}
                        ></span>
                        <span className="font-data-mono text-data-mono text-on-surface">{row.reference}</span>
                      </div>
                    </td>
                    <td className="px-md py-3 text-on-surface-variant whitespace-nowrap font-data-mono text-data-mono">
                      {row.date}
                    </td>
                    <td className="px-md py-3 max-w-xs truncate" title={row.libelle}>
                      {row.libelle}
                    </td>
                    <td className="px-md py-3 text-right text-data-mono font-data-mono text-primary">
                      {formatCurrency(row.ht)}
                    </td>
                    <td className="px-md py-3 text-right text-data-mono font-data-mono text-on-surface-variant">
                      {formatCurrency(row.tva)}
                    </td>
                    <td className="px-md py-3 text-right text-data-mono font-data-mono font-semibold text-primary">
                      {formatCurrency(row.ttc)}
                    </td>
                    <td className="px-md py-3">
                      {row.client ? (
                        <span className="bg-surface-container-highest text-on-surface px-2 py-1 rounded text-label-caps font-label-caps border border-outline-variant">
                          {row.client}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant text-body-sm">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-md py-sm border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-body-sm font-body-sm text-on-surface-variant">
            <span>
              Showing {startIndex + 1} to {Math.min(endIndex, extractedDoc.rows.length)} of{' '}
              {extractedDoc.rows.length} entries
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest disabled:opacity-50 text-on-surface border border-transparent hover:border-outline-variant transition-colors"
              >
                <ChevronLeft className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest disabled:opacity-50 text-on-surface border border-transparent hover:border-outline-variant transition-colors"
              >
                <ChevronRight className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
