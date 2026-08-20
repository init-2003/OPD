# Project Guidelines & Agent Rules

## Technology Stack & Architecture
- **Framework**: Laravel 13 (PHP 8.5)
- **Frontend**: React 19 + Inertia.js + TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **UI Library**: Shadcn/ui (Radix UI primitives + Tailwind) & Headless UI (`@headlessui/react`)
- **Database**: SQLite (`database/database.sqlite`)
- **Request Strategy**:
  - **Inertia.js**: Page routing, view rendering, and full-page prop synchronization.
  - **Axios**: Silent background operations (Preset CRUD, asynchronous ultrasound image uploads with progress tracking, background auto-save) without triggering Inertia page re-renders.

---

## Design System & Theme Conventions
- **Unified Medical Emerald Green Palette**:
  - Primary Theme Green: `#00875A` / `#007A4D` / `emerald-600` / `emerald-700`
  - Subtle Green Backgrounds / Hover: `#E8F8F2` / `emerald-50` / `emerald-100/60`
  - Focus Ring & Accent: `#00875A/20`
  - Glassmorphic UI utilities defined in `app.css`: `.liquid-glass-card`, `.liquid-glass-box`, `.liquid-glass-btn-primary`, `.liquid-glass-btn-outline`.
- **Typography & Font Weight Guidelines**:
  - Content values (e.g. Chief Complaint text, Diagnosis descriptions, Notes) should use **`font-medium text-slate-800`** to maintain clean legibility and prevent overly heavy/dense Thai characters (avoid `font-bold` on multi-line text bodies).
  - Field labels use `font-semibold text-slate-500` or `font-bold text-slate-700`.

---

## Terminology & UI Standards
- **Chief Complaint**: Must be labeled as **"อาการเบื้องต้น"** everywhere (Do NOT use "อาการสำคัญ").
- **No Colon Suffixes**: Section headers and card labels for Chief Complaint & Diagnosis do NOT include colons (`:`).
  - Example: `<FileText /> อาการเบื้องต้น` and `<Stethoscope /> ผลการวินิจฉัย (Diagnosis)`
- **Modal Dialog Titles**:
  - `แก้ไขอาการเบื้องต้น (Chief Complaint)` / `เพิ่มอาการเบื้องต้น (Chief Complaint)`
  - `แก้ไขผลการวินิจฉัย (Diagnosis)` / `เพิ่มผลการวินิจฉัย (Diagnosis)`
- **Action Buttons**: `บันทึกอาการเบื้องต้น`, `บันทึกผลการวินิจฉัย`, `บันทึกแก้ไข`.

---

## Dialog & Modal Behavior (Auto-Focus Caret)
- **Auto-Focus Caret at End of Text**: When opening edit modals for Chief Complaint or Diagnosis, the `<Textarea>` must auto-focus and place the cursor at the end of the text so the user can continue typing immediately without manual repositioning:
  - Setup `useRef<HTMLTextAreaElement>(null)` for each textarea.
  - Add `useEffect([isOpen])` with `setTimeout(..., 80)` calling `ref.current.focus()` and `ref.current.setSelectionRange(len, len)`.
  - Add `onFocus={(e) => { const len = e.currentTarget.value.length; e.currentTarget.setSelectionRange(len, len); }}` on the `<Textarea>`.

---

## State & Session Persistence
- **Dashboard Selection & Filters**: Preserve patient selection, search query, and status filters across page refreshes (F5) using `sessionStorage`:
  - Keys: `dashboard_selected_hn`, `dashboard_selected_vt`, `dashboard_search`, `dashboard_status_filter`, `dashboard_date`.
  - On page reload, restore the selected patient row and automatically navigate to the patient's table page (`currentPage`).
- **Realtime Local State Sync**: Synchronize local React states with Inertia props using `useEffect([patients])` so edits to `OP_CHIEF`, `OP_DIAG`, or `OP_PROC` reflect immediately without losing the active selection.

---

## Preset Management & Context Menu
- **Database Model**: Stored in table `PHM_XRAY` (`PH_Xray_ID`, `PH_Xray_Name`, `PH_Xray_Result`).
- **Context Menu Interaction**:
  - Right-click (desktop) and long-press (tablet/iPad touch) on preset buttons triggers the floating Liquid Glass context menu.
  - Action buttons: "แก้ไข Preset" (Edit) and "ลบ Preset" (Delete with confirmation).
  - Context menu layout: Streamlined without header title box.
  - Background Persistence: Actions execute asynchronously via Axios (`PUT /api/presets/{id}`, `POST /api/presets`, `DELETE /api/presets/{id}`).

---

## Responsive Design & Tablet / iPad Compatibility
- **Badges & Pill Tags**: Always apply `whitespace-nowrap shrink-0` on badges, visit tags, and count labels (e.g. `${count} รูป`) to prevent awkward line breaks on tablets/iPads.
- **Scroll Containers**: Tables and card lists must support smooth momentum touch scrolling with `WebkitOverflowScrolling: 'touch'`.

---

## Character Encoding & Internationalization
- **Strict UTF-8 Encoding**: All source code files (`.tsx`, `.ts`, `.php`, `.json`) must strictly maintain UTF-8 encoding.
- **No Mojibake**: Never introduce corrupted or double-encoded characters. Always verify Thai text strings remain clean and readable.

---

## X-Ray Findings Editor & PDF Generator
The core clinical reporting feature: paginated rich-text findings editor + PDF output matching the official X-ray form template (`public/XRAY_Form.png`).

### Editor (frontend) — `resources/js/Pages/UltrasoundResult.tsx`
- **Tiptap Editor**: One instance per page; pages stored as `string[]` of HTML, persisted as a **JSON array** in `OP_Xray_Result` (or `OP_Ultrasound_Result`).
- **Shift+Enter & HardBreak**: Configured with `hardBreak: { keepMarks: true }`. Shift+Enter creates inline `<br/>` elements within paragraphs.
- **Page Geometry & Prevention of Text Clipping**:
  - `PAPER_WIDTH = 794px`, `CARD_PADDING_X = 40px`, `PAGE_WIDTH = 714px`, `EDITOR_W = 712px`.
  - `LINE_H = 32.9px` (matches 16pt mPDF line pitch).
  - `DEFAULT_CAP_LINES = 23`, `CARD_PADDING_Y = 36px`, `EDITOR_HEIGHT = Math.round(LINE_H * linesPerPage) + 16px`.
  - Uses `overflow: visible` and `minHeight` so Thai descender vowels (e.g. `ุ`, `ู`, `ญ`, `ฐ`) and cursor lines are never clipped at the bottom boundary.
- **Auto-pagination & Flow**:
  - `countBlockLines()` and `countHtmlLines()` calculate line heights via DOM rendered heights using `Math.ceil((h - 2) / LINE_H)` to accurately count wrapped lines, empty lines, and `<br/>` sub-lines.
  - `flushPage()` re-splits pages on keystroke via `splitIntoPages()`; overflow smoothly cascades to subsequent pages.
  - Handles `[PAGE BREAK]` commands and dynamic `[SET_LINES_PER_PAGE: X]` markers.
  - `handleBackspaceAtStart()` flows text back up to the preceding page when space allows.

### PDF Generator (backend) — `DashboardController@downloadXrayPdf` / `PatientPdfController`
- **Route**: `GET /patient/{hn}/pdf` (`patient.ultrasound.pdf` / `patient.xray.pdf`).
- **1 Editor Page ➔ 1 PDF Page**: Each stored page JSON element is chunked with `$maxFindingsLines = 23` lines (`$findingsTextWidth = 540.0pt`).
- **Precision Vertical Centering Margins**:
  - Form template top line at `y = 61.9mm` (175.5pt); bottom line at `y = 269.9mm` (765.0pt).
  - Calibrated margins: `'margin_top' => 70.3mm`, `'margin_bottom' => 26.5mm`, `'margin_left' => 10.0mm`, `'margin_right' => 8.4mm`.
  - Symmetrically centers findings text between top and bottom lines with exact equal **`8.4mm`** top and bottom gaps.
- **HTML Tokenizer & Integrity**: Tokenizer preserves `<br/>` tags inside `<p>...</p>` blocks and increments line counts with `\n` without fragmenting paragraph containers, preventing text overlapping.
- **Template Watermark & Coordinates**:
  - Full-page watermark: `public/XRAY_Form.png` (`watermarkImgBehind = true`).
  - Header fields (HN, Name, Age, Sex, RefDoc, ReportOn) and Footer fields (ReportBy, Date) printed via absolute coordinates matching the template grid.

---

## Build & Verification
- Frontend build: `npm run build` (= `tsc && vite build`); dev: `npm run dev`.
- PHP syntax & test suite: `php artisan test` (Pest).
- PDF layout is validated against form coordinates and decompressed stream output.

## Project Conventions
- **Shadcn UI Components**: Store all reusable Shadcn UI components under `@/Components/ui/` (`resources/js/Components/ui/`).
- **Utility Functions**: Store utility functions like `cn()` in `@/lib/utils` (`resources/js/lib/utils.ts`).
- **Path Aliases**:
  - `@/*` -> `resources/js/*`
  - `ziggy-js` -> `vendor/tightenco/ziggy`
- **Build Tool**: Vite (`npm run build` or `npm run dev`)
