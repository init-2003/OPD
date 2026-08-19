# Project Guidelines & Agent Rules

## Technology Stack & Architecture
- **Framework**: Laravel 13 (PHP 8.5)
- **Frontend**: React 19 + Inertia.js + TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **UI Library**: Shadcn/ui (Radix UI primitives + Tailwind) & Headless UI (`@headlessui/react`)
- **Database**: SQLite (`database/database.sqlite`)

---

## Design System & Theme Conventions
- **Unified Medical Emerald Green Palette**:
  - Primary Theme Green: `#00875A` / `#007A4D` / `emerald-600` / `emerald-700`
  - Subtle Green Backgrounds / Hover: `#E8F8F2` / `emerald-50` / `emerald-100/60`
  - Focus Ring & Accent: `#00875A/20`
  - Glassmorphic UI utilities defined in `app.css`: `.liquid-glass-card`, `.liquid-glass-box`, `.liquid-glass-btn-primary`.
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

## Responsive Design & Tablet / iPad Compatibility
- **Badges & Pill Tags**: Always apply `whitespace-nowrap shrink-0` on badges, visit tags, and count labels (e.g. `${count} รูป`) to prevent awkward line breaks on tablets/iPads.
- **Scroll Containers**: Tables and card lists must support smooth momentum touch scrolling with `WebkitOverflowScrolling: 'touch'`.

---

## Character Encoding & Internationalization
- **Strict UTF-8 Encoding**: All source code files (`.tsx`, `.ts`, `.php`, `.json`) must strictly maintain UTF-8 encoding.
- **No Mojibake**: Never introduce corrupted or double-encoded characters. Always verify Thai text strings remain clean and readable.

---

## X-Ray Findings Editor & PDF Generator
The main feature: paginated rich-text findings editor + PDF output on the X-ray form template.

### Editor (frontend) — `resources/js/Pages/UltrasoundResult.tsx`
- Tiptap (StarterKit) editor, one instance per "paper" page; pages stored as `string[]` of page HTML, saved as a **JSON array** in `OP_Xray_Result`. Plain text is coerced to `<p>`-wrapped HTML on load.
- **Auto-pagination (Word-style, no manual page breaks)**:
  - Requirement: when text fills the page it must flow onto a new page automatically; deleting text must pull the content below back up automatically.
  - Page geometry: `PAGE_WIDTH=724`, `EDITOR_W=722`, `LINE_H=32.9px`, `DEFAULT_CAP_LINES=25`, `TA_HEIGHT` dynamic (LINE_H × linesPerPage).
  - `flushPage()` re-splits the page on every keystroke via `splitIntoPages()` (hidden measure div `xray-page-editor xray-measure`); overflow moves to the next page and focuses it.
  - `splitIntoPages()` handles hard `[PAGE BREAK]` commands: splits content at those points, each segment becomes a separate page.
  - `[SET_LINES_PER_PAGE: X]` command: parsed in `flushPage()`, updates `linesPerPage` state dynamically (5–100 range); the paragraph is stripped from stored HTML.
  - `splitGiantBlock()` splits a single long paragraph at the char where the page fills (binary search + ~2100-char safety cap).
  - `handleBackspaceAtStart()`: Backspace at the very start of a page flows that page's top blocks up into the previous page while it has room; deletes the page if it becomes empty.
  - Trailing empty pages are dropped on every state change; Ctrl+A/C/V + Backspace select-all handling spans all pages.
- Editor geometry CSS in `resources/css/app.css` (`*.xray-page-*` rules).

### PDF generator (backend) — `DashboardController@downloadXrayPdf`
- Route `GET /patient/{hn}/pdf` (`patient.xray.pdf`); saves via POST `/patient/{hn}/xray` → `updateXray` → `OP_Xray_Result` (JSON array of page HTML strings).
- **1 editor page → 1 PDF page, lines match the box**: each stored page JSON element is chunked so a PDF page holds **exactly 23 lines** (`$findingsTextWidth = 540pt`, `$maxFindingsLines = 23`) — the middle findings box on the form; rich HTML blocks stay intact, only plain text is split across pages; empty stored pages are skipped.
- Body font 16pt (line pitch 24.64pt, first baseline at y-bot 641.07 ≈ 200.8pt from top; usable height ≈ 583pt); margins: `top 65mm`, `bottom 26.5mm`, `left 10mm`, `right 8.4mm`.
- Form look: the X-ray form template rendered as `public/XRAY_Form.png` is used as a full-page watermark repeated on every page (`watermarkImgBehind=true`); field values printed via `SetHTMLHeader`/`SetHTMLFooter` with absolute pt coords (HN, name, age, ref-doctor, report-on; footer: report-by, date).
- Template PDF reveals its true coordinates via content stream: `0.75 0 0 -0.75 0 841.92 cm`; `user_x = 0.75·e`, `user_y (from bottom) = 841.92 − 0.75·f` (verified for labels CN/NAME/Age/Sex/RefDoc/ReportOn). Embedded font F1/F2 have `unitsPerEm=4096` (width arrays must divide by 4096, not 1000).
- Verify positions on the output PDF by decompressing content streams (scripts `scratch_dump.php`, etc.). mpdf's `GetStringWidth()` reports current-font width in pt at the current font size.

---

## Build & Verification
- Frontend build: `npm run build` (= `tsc && vite build`); dev: `npm run dev`.
- PHP syntax check: `php -l`.
- PDF coordinates are checked by decompressing the generated PDF's content streams.

## Project Conventions
- **Shadcn UI Components**: Store all reusable Shadcn UI components under `@/Components/ui/` (`resources/js/Components/ui/`).
- **Utility Functions**: Store utility functions like `cn()` in `@/lib/utils` (`resources/js/lib/utils.ts`).
- **Path Aliases**:
  - `@/*` -> `resources/js/*`
  - `ziggy-js` -> `vendor/tightenco/ziggy`
- **Build Tool**: Vite (`npx vite build` or `npm run dev`)

## Code Style & Best Practices
1. **Component Design**: Prefer Shadcn UI primitives (`Button`, `Card`, `Input`, `Label`, `Dialog`, `DropdownMenu`, etc.) for all new UI components.
2. **TypeScript**: Maintain full TypeScript type safety across React pages and components.
3. **Database Operations**: Use Eloquent models and migrations. SQLite PDO driver must be enabled (`extension=pdo_sqlite` in `php.ini`).
