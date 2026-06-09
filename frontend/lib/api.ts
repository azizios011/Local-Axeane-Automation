/**
 * TypeScript API client for Axeane Kompta backend
 * Matches FastAPI Pydantic models exactly
 */

// ============================================================================
// TYPE DEFINITIONS (matching backend models)
// ============================================================================

export enum RefPrefix {
  avoir = 'AC',
  facture = 'FC',
}

export interface InvoiceRow {
  reference: string; // e.g. "AC000024" or "FC000125"
  ref_prefix: RefPrefix;
  date: string; // dd/MM/yyyy
  mois?: string | null; // month label e.g. "Janvier"
  jour?: string | null; // day number
  libelle: string; // e.g. "PASSAGER"
  mvt?: string | null;
  ht: number;
  tva: number;
  ttc: number;
  client?: string | null;
  extra: Record<string, unknown>;
}

export interface ExtractedDocument {
  filename: string;
  doc_type?: string | null; // e.g. "Vente"
  rows: InvoiceRow[];
}

export interface FillingResult {
  success: boolean;
  rows_filled: number;
  rows_failed: number;
  errors: string[];
}

export enum SensType {
  debit = 'debit',
  credit = 'credit',
}

export enum DocType {
  facture = 'FC',
  avoir = 'AC',
}

export interface FormulaLine {
  ordre: number; // row order (1, 2, 3...)
  compte: string; // N° Compte e.g. "411000"
  libelle_template: string; // e.g. "PASSAGER" or "{ref}" or "{client}"
  sens_facture: SensType; // debit or credit for FC
  sens_avoir: SensType; // debit or credit for AC (usually flipped)
  montant_source: string; // which extracted field maps here e.g. "ttc", "ht", "tva"
  tresorerie?: string | null; // Trésorerie dropdown value if needed
}

export interface Formula {
  id: string; // e.g. "vente_passager"
  doc_type_name: string; // e.g. "Vente"
  journal_code: string; // e.g. "VT"
  libelle_filter: string; // the Libellé value this formula applies to e.g. "PASSAGER"
  lines: FormulaLine[];
}

export interface FormulaCreate {
  doc_type_name: string;
  journal_code: string;
  libelle_filter: string;
  lines: FormulaLine[];
}

export interface FormulaUpdate {
  doc_type_name?: string;
  journal_code?: string;
  libelle_filter?: string;
  lines?: FormulaLine[];
}

export interface FillRequest {
  document: ExtractedDocument;
  formula_id?: string | null; // explicit formula id, OR auto-detect by libelle
  cdp_port?: number | null; // override default CDP port
  auto_save?: boolean; // click Enregistrer after each entry
}

export interface FillPreviewRequest {
  document: ExtractedDocument;
  formula_id?: string | null;
}

export interface FillPreviewResult {
  reference: string;
  ref_prefix: RefPrefix;
  fill_data: Record<string, unknown>;
}

// ============================================================================
// API ERROR HANDLING
// ============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public detail?: string,
  ) {
    const message = detail || `${status} ${statusText}`;
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// API CLIENT
// ============================================================================

export class ApiClient {
  private _baseUrl: string | null = null;

  constructor(baseUrl?: string) {
    if (baseUrl) this._baseUrl = baseUrl;
  }

  private get baseUrl(): string {
    if (this._baseUrl) return this._baseUrl;
    
    // Check localStorage first (client-side)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('NEXT_PUBLIC_API_URL');
      if (saved) return saved;
    }
    
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  setBaseUrl(url: string) {
    this._baseUrl = url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    if (!response.ok) {
      let detail: string | undefined;
      try {
        const errorData = await response.json();
        detail = errorData.detail || errorData.message;
      } catch {
        // If response is not JSON, we'll just use status text
      }
      throw new ApiError(response.status, response.statusText, detail);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    try {
      return await response.json();
    } catch {
      return undefined as T;
    }
  }

  // ==============================
  // Health Check
  // ==============================

  async getHealth(): Promise<{ status: string }> {
    return this.request('/health');
  }

  // ==============================
  // Extraction Endpoints
  // ==============================

  async extractPdf(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<ExtractedDocument> {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          let detail: string | undefined;
          try {
            const errorData = JSON.parse(xhr.responseText);
            detail = errorData.detail || errorData.message;
          } catch {
            // ignore
          }
          reject(
            new ApiError(xhr.status, xhr.statusText, detail || 'Upload failed'),
          );
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      const url = `${this.baseUrl}/extraction/pdf`;
      xhr.open('POST', url, true);
      xhr.send(formData);
    });
  }

  // ==============================
  // Formulas Endpoints
  // ==============================

  async listFormulas(): Promise<Formula[]> {
    return this.request('/formulas');
  }

  async getFormula(formulaId: string): Promise<Formula> {
    return this.request(`/formulas/${formulaId}`);
  }

  async createFormula(payload: FormulaCreate): Promise<Formula> {
    return this.request('/formulas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async updateFormula(formulaId: string, payload: FormulaUpdate): Promise<Formula> {
    return this.request(`/formulas/${formulaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async deleteFormula(formulaId: string): Promise<void> {
    return this.request(`/formulas/${formulaId}`, {
      method: 'DELETE',
    });
  }

  // ==============================
  // Automation Endpoints
  // ==============================

  async previewFill(req: FillPreviewRequest): Promise<FillPreviewResult[]> {
    return this.request('/automation/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });
  }

  async fillPwa(req: FillRequest): Promise<FillingResult> {
    return this.request('/automation/fill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
