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
- **Badges & Pill Tags**: Always apply `whitespace-nowrap shrink-0` on badges, visit tags, and count labels (e.g. `${count} รูป`) to prevent awkward line breaks on tablets/Ipad.
- **Scroll Containers**: Tables and card lists must support smooth momentum touch scrolling with `WebkitOverflowScrolling: 'touch'`.

---

## Character Encoding & Internationalization
- **Strict UTF-8 Encoding**: All source code files (`.tsx`, `.ts`, `.php`, `.json`) must strictly maintain UTF-8 encoding.
- **No Mojibake**: Never introduce corrupted or double-encoded characters. Always verify Thai text strings remain clean and readable.

---

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
