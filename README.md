# Axeane Kompta - Accounting Automation Platform

A full-stack accounting automation solution combining PDF invoice extraction with PWA data entry automation.

## 🏗️ Architecture

- **Backend**: FastAPI (Python) - Port `8000`
- **Frontend**: Next.js 14 (TypeScript/React) - Port `3000`

### Backend (`axeane-filler/`)

FastAPI application providing:
- `GET /health` - Server health check
- `POST /extraction/pdf` - Extract invoice data from PDF files
- `GET/POST/PUT/DELETE /formulas` - Formula CRUD operations
- `POST /automation/preview` - Preview automation logic (dry run)
- `POST /automation/fill` - Execute automation on Axeane PWA

**CORS**: Enabled for all origins on port 8000

### Frontend (`frontend/`)

Next.js 14 App Router with:
- Extraction page: Upload and extract invoices
- Formulas page: Manage accounting rules
- Automation page: Execute automated data entry
- Toast notifications for user feedback
- Full TypeScript type safety

## 🚀 Quick Start

### Prerequisites
- Python 3.9+ (for backend)
- Node.js 18+ (for frontend)
- npm or yarn

### 1. Backend Setup

```bash
cd axeane-filler

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local from .env.example
cp .env.example .env.local

# Update NEXT_PUBLIC_API_URL if backend is not on localhost:8000
# Default is already set to http://localhost:8000

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 📋 Environment Variables

### Frontend (`frontend/.env.local`)

```env
# Backend API base URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Other variables from .env.example
GEMINI_API_KEY=your_key_here
APP_URL=http://localhost:3000
```

### Backend (`axeane-filler/`)

Check `config.py` for configuration options. CORS is pre-configured to accept all origins.

## 🔌 API Integration

### Type-Safe API Client

The frontend includes a complete TypeScript API client (`lib/api.ts`) with:

- **Typed endpoints** matching backend Pydantic models
- **Error handling** with `ApiError` class
- **File upload** with progress tracking
- **Request/response validation**

### Usage Example

```typescript
import { apiClient } from '@/lib/api';

// Extract PDF
const extracted = await apiClient.extractPdf(file, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});

// Get formulas
const formulas = await apiClient.listFormulas();

// Create formula
const formula = await apiClient.createFormula({
  doc_type_name: 'Vente',
  journal_code: 'VT',
  libelle_filter: 'PASSAGER',
  lines: [
    {
      ordre: 1,
      compte: '411000',
      libelle_template: 'PASSAGER',
      sens_facture: 'debit',
      sens_avoir: 'credit',
      montant_source: 'ttc'
    }
  ]
});

// Preview automation
const preview = await apiClient.previewFill({
  document: extractedDoc,
  formula_id: 'vente_passager'
});

// Execute automation
const result = await apiClient.fillPwa({
  document: extractedDoc,
  formula_id: 'vente_passager',
  auto_save: true
});
```

### Toast Notifications

User feedback is provided via toast notifications:

```typescript
import { useToast } from '@/lib/toast';

export default function MyComponent() {
  const { success, error, warning, info } = useToast();

  const handleAction = async () => {
    try {
      // Do something
      success('Operation completed successfully');
    } catch (err) {
      error('Operation failed', err.message);
    }
  };

  return (
    // Component JSX
  );
}
```

## 📦 Project Structure

```
.
├── axeane-filler/              # Backend (FastAPI)
│   ├── main.py                 # App entry point
│   ├── config.py               # Configuration
│   ├── models/                 # Pydantic models
│   │   ├── invoice.py
│   │   └── formula.py
│   ├── routers/                # API route handlers
│   │   ├── extraction.py
│   │   ├── formulas.py
│   │   └── automation.py
│   ├── services/               # Business logic
│   ├── storage/                # Data persistence
│   └── requirements.txt
│
└── frontend/                   # Frontend (Next.js)
    ├── app/                    # App Router pages
    │   ├── extraction/         # Invoice extraction
    │   ├── formulas/           # Formula management
    │   ├── automation/         # Automation execution
    │   ├── settings/           # Settings
    │   └── layout.tsx          # Root layout with ToastProvider
    ├── lib/
    │   ├── api.ts              # Type-safe API client
    │   ├── toast.ts            # Toast hook
    │   └── utils.ts
    ├── components/
    │   ├── ToastProvider.tsx   # Toast context provider
    │   ├── ToastContainer.tsx  # Toast UI renderer
    │   ├── Sidebar.tsx
    │   └── TopNav.tsx
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

## 🔄 Typical Workflow

1. **Extract Invoice**: Upload PDF → Backend extracts invoice rows → Display results
2. **Manage Formulas**: Create/edit accounting rules that match extracted data
3. **Preview Automation**: Dry-run the automation to verify data mapping
4. **Execute**: Run actual automation in Axeane PWA with extracted data

## 🛠️ Development

### Adding a New Backend Endpoint

1. Create route in `axeane-filler/routers/`
2. Define Pydantic models in `axeane-filler/models/`
3. Implement service logic in `axeane-filler/services/`
4. Add TypeScript types in `frontend/lib/api.ts`
5. Add API client method in `ApiClient` class
6. Use in frontend components

### Running Tests

```bash
# Backend
cd axeane-filler
pytest

# Frontend
cd frontend
npm run test
```

### Linting

```bash
# Backend
cd axeane-filler
pylint routers/ models/ services/

# Frontend
cd frontend
npm run lint
```

## 📝 Notes

- Backend CORS is set to allow all origins (`["*"]`). Tighten this in production.
- File uploads use FormData with progress tracking via XMLHttpRequest
- All API responses are fully typed with TypeScript
- Toast notifications auto-dismiss after 4-6 seconds depending on type
- Environment variables are required for both services to communicate

## 🐛 Troubleshooting

### Backend Connection Issues

```bash
# Check if backend is running
curl http://localhost:8000/health

# Expected response
{"status": "ok"}
```

### PDF Upload Fails

- Ensure file is valid PDF format
- Check file size (large files may timeout)
- Verify `NEXT_PUBLIC_API_URL` is correct

### Formula Not Found

- Create formulas first via the Formulas page
- Ensure `libelle_filter` matches extracted invoice `libelle`
- Check formula IDs are correct

## 📄 License

All rights reserved.