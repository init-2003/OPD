import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { PatientVisit } from '@/types';
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { getHTMLFromFragment, Mark, mergeAttributes } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/Components/ui/dropdown-menu';
import {
    ArrowLeft,
    Stethoscope,
    Save,
    AlertTriangle,
    Plus,
    Trash2,
    FileSpreadsheet,
    UserCheck,
    User,
    FileText,
    Printer,
    Sparkles,
    Pill,
    ShieldCheck,
    Activity,
    HeartPulse,
    Thermometer,
    Weight,
    Ruler,
    Wind,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    Undo2,
    Redo2,
    RotateCcw,
    Search,
    FileSymlink,
    FilePlus,
    Type,
    Layers,
    PanelLeftClose,
    PanelLeftOpen,
    ZoomIn,
    ZoomOut,
    Maximize2,
    ChevronDown,
    Check,
    Menu,
    X,
    Edit3,
    Loader2,
    MoreHorizontal,
} from 'lucide-react';
import { formatDateGregorian, formatVitalValue, cleanDecimals, formatPatientAge } from '@/lib/utils';
import PatientVitalsModal from '@/Components/PatientVitalsModal';

const isEmptyPage = (html: string) => {
    const el = document.createElement('div');
    el.innerHTML = html;
    return !(el.textContent || '').trim();
};

interface UltrasoundResultProps {
    patient: PatientVisit | null;
    hn: string;
    dbPresets?: PresetItem[];
}

interface PresetItem {
    id: string;
    label: string;
    text: string;
}

const DEFAULT_PRESETS: PresetItem[] = [];

// ---------- Standard A4 Paper Geometry (210mm × 297mm @ 96 DPI) ----------
const PAPER_WIDTH = 794; // px standard A4 paper width (210mm @ 96 DPI)
const CARD_PADDING_X = 40; // px left/right margin padding
const PAGE_WIDTH = PAPER_WIDTH - (CARD_PADDING_X * 2); // 714px usable inner width
const EDITOR_W = PAGE_WIDTH - 2; // px actual editor text content width
const LINE_H = 32.9; // px per line (matches 16pt mPDF line height)
const DEFAULT_CAP_LINES = 23; // Exactly 23 lines per page
const CARD_PADDING_Y = 40; // px top/bottom padding

const sanitizeHtml = (html: string) =>
    html
        .replace(/<p[^>]*>\s*(?:<br\s*\/?>\s*)+<\/p>/gi, '<p></p>')
        .replace(/<p[^>]*>\s*<\/p>/gi, '<p></p>');

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function toParagraphHtml(text: string): string {
    return text
        .split(/\r?\n/)
        .map((line) => `<p>${line === '' ? '' : line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`)
        .join('');
}

function splitIntoSavedPages(raw: string): string[] {
    if (!raw) return ['<p></p>'];
    let pages: string[] = [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            pages = parsed.map((p) => String(p ?? ''));
        }
    } catch (e) {
        // Not JSON
    }
    if (pages.length === 0) {
        pages = [raw];
    }
    const normalized = pages.map((p) => {
        const t = String(p || '').replace(/^\s+|\s+$/g, '');
        return /<\s*(p|div|br|b|i|strong|em|span|ul|ol|li|h[1-6]|table|tr|td)[\s>]/i.test(t) ? t : toParagraphHtml(t);
    }).map(sanitizeHtml);
    const isEmpty = (html: string) => {
        const el = document.createElement('div');
        el.innerHTML = html;
        return !(el.textContent || '').trim();
    };
    while (normalized.length > 1 && isEmpty(normalized[normalized.length - 1])) normalized.pop();
    return normalized.length ? normalized : ['<p></p>'];
}

interface EditorRegister {
    (index: number, editor: Editor | null): void;
}

interface PageEditorProps {
    index: number;
    html: string;
    onHtml: (html: string) => void;
    onFocusChange: () => void;
    register: EditorRegister;
    focusSignal: number | null;
    focusNonce: number;
    focusMode: 'start' | 'end';
    pageHeight: number;
    onBackspaceAtStart: (index: number) => boolean;
    onEnterAtEnd?: (index: number) => boolean;
    selectAllActiveRef: React.MutableRefObject<boolean>;
    onSelectAll: () => boolean;
    onGlobalEdit: (kind: 'clear' | 'replace', ch?: string) => boolean;
    onCopyAll: () => boolean;
    onClearSelectAll: () => void;
    enterSignalRef: React.MutableRefObject<boolean>;
    onFocused?: () => void;
    editable?: boolean;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
    }
}

const FontSize = Mark.create({
    name: 'fontSize',

    addOptions() {
        return {
            types: ['textStyle'],
        };
    },

    addAttributes() {
        return {
            size: {
                default: null,
                parseHTML: (element) => {
                    const fs = element.style.fontSize;
                    if (!fs) return null;
                    const num = parseInt(fs, 10);
                    return num ? `${num}pt` : fs;
                },
                renderHTML: (attributes) => {
                    if (!attributes.size) {
                        return {};
                    }
                    return {
                        style: `font-size: ${attributes.size}`,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[style*="font-size"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setFontSize: (size: string) => ({ chain }) => {
                const formatted = size.endsWith('pt') ? size : `${size}pt`;
                return chain()
                    .setMark('fontSize', { size: formatted })
                    .run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .unsetMark('fontSize')
                    .run();
            },
        };
    },
});

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const PAGE_EXTENSIONS = [
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3],
        },
    }),
    FontSize,
];

// One rich-text "paper" page. Content stays in sync with `html` from the
// parent (which reflows/splits pages) and reports local edits upward.
function PageEditor({ index, html, onHtml, onFocusChange, register, focusSignal, focusNonce, focusMode, pageHeight, onBackspaceAtStart, onEnterAtEnd, selectAllActiveRef, onSelectAll, onGlobalEdit, onCopyAll, onClearSelectAll, enterSignalRef, onFocused, editable = true }: PageEditorProps) {
    const lastEmitted = useRef(html);
    const edRef = useRef<Editor | null>(null);
    // Tiptap creates the Editor once and keeps the keydown closure from that
    // first render; route through refs so the handler always uses the LATEST
    // parent logic (also survives Vite HMR without a full page reload).
    const backspaceAtStartRef = useRef(onBackspaceAtStart);
    backspaceAtStartRef.current = onBackspaceAtStart;
    const enterAtEndRef = useRef(onEnterAtEnd);
    enterAtEndRef.current = onEnterAtEnd;
    const selectAllRef = useRef(onSelectAll);
    selectAllRef.current = onSelectAll;
    const globalEditRef = useRef(onGlobalEdit);
    globalEditRef.current = onGlobalEdit;
    const copyAllRef = useRef(onCopyAll);
    copyAllRef.current = onCopyAll;
    const clearSelectAllRef = useRef(onClearSelectAll);
    clearSelectAllRef.current = onClearSelectAll;

    const editor = useEditor({
        extensions: PAGE_EXTENSIONS,
        content: html,
        editable: editable,
        autofocus: false,
        editorProps: {
            attributes: {
                class: 'focus:outline-none',
            },
            handleKeyDown: (_view, event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
                    event.preventDefault();
                    edRef.current?.commands.insertContent('<p>[PAGE BREAK]</p>');
                    return true;
                }
                if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !selectAllActiveRef.current) {
                    if (enterAtEndRef.current && enterAtEndRef.current(index)) {
                        return true;
                    }
                    enterSignalRef.current = true;
                }
                if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey) {
                    if (edRef.current?.isActive('bulletList') || edRef.current?.isActive('orderedList')) {
                        return false;
                    }
                    event.preventDefault();
                    _view.dispatch(_view.state.tr.insertText('\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'));
                    return true;
                }
                if (selectAllActiveRef.current && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'c') {
                    return copyAllRef.current();
                }
                if (selectAllActiveRef.current && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'v') {
                    event.preventDefault();
                    navigator.clipboard
                        .readText()
                        .then((t) => globalEditRef.current('replace', t))
                        .catch(() => { });
                    return true;
                }
                if (selectAllActiveRef.current && !event.ctrlKey && !event.metaKey) {
                    if (event.key === 'Backspace' || event.key === 'Delete') return globalEditRef.current('clear');
                    if (event.key === 'Enter' && !event.shiftKey && !event.altKey) return globalEditRef.current('clear');
                    if (event.key.length === 1 && !event.altKey) return globalEditRef.current('replace', event.key);
                    selectAllActiveRef.current = false;
                }
                if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'a') {
                    return selectAllRef.current();
                }
                if (event.key === 'Backspace') {
                    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
                        const { selection, doc } = _view.state;
                        if (selection.empty && selection.from > 1) {
                            const from = selection.from;
                            const textBefore = doc.textBetween(Math.max(0, from - 10), from, ' ');
                            const match = textBefore.match(/[\u00A0\t]+$/);
                            if (match && match[0].length > 1) {
                                const count = Math.min(10, match[0].length);
                                event.preventDefault();
                                _view.dispatch(_view.state.tr.delete(from - count, from));
                                return true;
                            }
                        }
                    }
                    return backspaceAtStartRef.current(index);
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            if (selectAllActiveRef.current) {
                // A native edit reached the editor without going through the
                // virtual select-all interceptors (e.g. an exotic paste path):
                // release the virtual selection so the next keystroke can never
                // silently wipe the whole document.
                selectAllActiveRef.current = false;
                clearSelectAllRef.current();
            }
            const h = sanitizeHtml(editor.getHTML());
            lastEmitted.current = h;
            onHtml(h);
        },
        onFocus: () => {
            if (editor?.view?.dom) {
                editor.view.dom.scrollTop = 0;
                editor.view.dom.scrollLeft = 0;
            }
            onFocusChange();
        },
        onSelectionUpdate: () => {
            if (editor?.view?.dom) {
                editor.view.dom.scrollTop = 0;
                editor.view.dom.scrollLeft = 0;
            }
            if (editor?.view?.hasFocus()) {
                onFocusChange();
            }
        },
    });

    edRef.current = editor;

    useEffect(() => {
        if (editor && !editor.isDestroyed) {
            editor.setEditable(editable);
        }
    }, [editor, editable]);

    useEffect(() => {
        register(index, editor);
        return () => register(index, null);
    }, [editor, index, register]);

    // Force scrollTop = 0 so browser contenteditable auto-scroll never pushes text off top margin
    useLayoutEffect(() => {
        if (editor?.view?.dom) {
            editor.view.dom.scrollTop = 0;
            editor.view.dom.scrollLeft = 0;
            if (editor.view.dom.parentElement) {
                editor.view.dom.parentElement.scrollTop = 0;
                editor.view.dom.parentElement.scrollLeft = 0;
            }
        }
    });

    // External content change (reflow pushed/split content) -> update without
    // re-emitting the placeholder separate from user typing.
    useLayoutEffect(() => {
        if (editor && html !== lastEmitted.current) {
            lastEmitted.current = html;
            const isCurrentlyFocused = editor.view.hasFocus();
            const shouldPreserveSelection = isCurrentlyFocused && (focusSignal === null || focusSignal === index);
            const { from, to } = editor.state.selection;
            editor.commands.setContent(html, { emitUpdate: false });
            if (shouldPreserveSelection && !html.includes('\uFEFF')) {
                try {
                    const maxPos = editor.state.doc.content.size;
                    if (from > 0 && from <= maxPos) {
                        editor.commands.setTextSelection({
                            from: Math.min(from, maxPos),
                            to: Math.min(to, maxPos),
                        });
                    }
                } catch (err) {
                    // Ignore text selection error if position is not inline
                }
            }
        }
    }, [html, editor, focusSignal, index]);

    useEffect(() => {
        if (editor && focusSignal === index) {
            const doFocus = () => {
                try {
                    editor.view.focus();
                    if (focusMode === 'start') {
                        editor.commands.setTextSelection(1);
                    } else {
                        editor.commands.setTextSelection(editor.state.doc.content.size);
                    }
                } catch (e) {
                    try { editor.commands.focus(focusMode); } catch (err) { /* ignore */ }
                } finally {
                    onFocused?.();
                }
            };

            const timer = setTimeout(doFocus, 10);
            return () => clearTimeout(timer);
        }
    }, [focusSignal, focusNonce, index, editor, focusMode, onFocused]);

    // While a cross-page Ctrl+A selection is active, edits that arrive as
    // input events (IME composition, paste, drop, execCommand) must replace
    // the WHOLE document, not just the focused page. Capture-phase listener
    // runs before ProseMirror's own input handling.
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom as HTMLElement;
        const onBeforeInput = (e: InputEvent) => {
            if (!selectAllActiveRef.current) return;
            const t = e.inputType;
            if (t === 'insertText' || t === 'insertCompositionText' || t === 'insertFromPaste' || t === 'insertFromDrop' || t === 'insertReplacementText') {
                e.preventDefault();
                e.stopPropagation();
                const text = (e.data ?? '').replace(/\r?\n/g, '\n');
                globalEditRef.current('replace', text);
            } else if (t === 'insertParagraph' || t === 'insertLineBreak') {
                e.preventDefault();
                e.stopPropagation();
                globalEditRef.current('clear');
            } else if (t === 'deleteContentBackward' || t === 'deleteContentForward' || t === 'deleteByCut' || t === 'deleteContent') {
                e.preventDefault();
                e.stopPropagation();
                globalEditRef.current('clear');
            }
        };
        dom.addEventListener('beforeinput', onBeforeInput, true);
        const onPaste = (e: ClipboardEvent) => {
            if (!selectAllActiveRef.current) return;
            e.preventDefault();
            e.stopPropagation();
            const text = (e.clipboardData?.getData('text/plain') ?? '').replace(/\r?\n/g, '\n');
            globalEditRef.current('replace', text);
        };
        dom.addEventListener('paste', onPaste, true);
        return () => {
            dom.removeEventListener('beforeinput', onBeforeInput, true);
            dom.removeEventListener('paste', onPaste, true);
        };
    }, [editor]);

    return (
        <div
            className="xray-page-editor"
            style={{
                width: '100%',
                height: pageHeight,
                minHeight: pageHeight,
                maxHeight: pageHeight,
                overflow: 'hidden',
                boxSizing: 'border-box',
            }}
            onScroll={(e) => {
                e.currentTarget.scrollTop = 0;
                e.currentTarget.scrollLeft = 0;
            }}
        >
            <EditorContent editor={editor} />
        </div>
    );
}

export default function UltrasoundResult({ patient, hn, dbPresets = [] }: UltrasoundResultProps) {

    const fromParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('from') || '' : '';
    const draftKey = `xray_draft_${hn}_${patient?.VT_NO || 'default'}`;

    const handleBack = () => {
        try {
            sessionStorage.removeItem('xray_sidebar_open');
        } catch (e) { }

        const doNav = () => {
            router.visit(route('patient.show', {
                hn,
                vt: patient?.VT_NO || '',
                ...(fromParam ? { from: fromParam } : {}),
            }));
        };

        if (isDirty) {
            setPendingNav(() => doNav);
        } else {
            try {
                localStorage.removeItem(draftKey);
            } catch (err) { }
            doNav();
        }
    };

    const [pages, setPages] = useState<string[]>(() => {
        const dbPages = splitIntoSavedPages(patient?.OP_Ultrasound_Result || patient?.OP_Xray_Result || '');
        try {
            const rawDraft = localStorage.getItem(draftKey);
            if (rawDraft) {
                const parsed = JSON.parse(rawDraft);
                if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
                    const hasContent = parsed.pages.some((p: string) => !isEmptyPage(p));
                    if (hasContent || parsed.pages.length > 1) {
                        return parsed.pages.map((p: string) => sanitizeHtml(String(p || '')));
                    }
                }
            }
        } catch (e) { }
        return dbPages;
    });
    const serializeForBaseline = (pagesList: string[]): string => {
        const final = pagesList.slice();
        while (final.length > 1 && isEmptyPage(final[final.length - 1])) {
            final.pop();
        }
        if (final.every(isEmptyPage)) {
            return '';
        }
        return JSON.stringify(final);
    };

    const [savedBaseline, setSavedBaseline] = useState<string>(() =>
        serializeForBaseline(splitIntoSavedPages(patient?.OP_Ultrasound_Result || patient?.OP_Xray_Result || ''))
    );
    const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
    const isDirty = useMemo(() => {
        return serializeForBaseline(pages) !== savedBaseline;
    }, [pages, savedBaseline]);

    const [linesPerPage, setLinesPerPage] = useState(DEFAULT_CAP_LINES);
    const EDITOR_HEIGHT = Math.round(LINE_H * linesPerPage);
    const CARD_HEIGHT = EDITOR_HEIGHT + (CARD_PADDING_Y * 2);
    const TA_HEIGHT = EDITOR_HEIGHT;
    const SAFE_TA_HEIGHT = Math.floor(TA_HEIGHT) - 5;
    const [activePage, setActivePage] = useState(0);
    const [focusPage, setFocusPage] = useState<number | null>(null);
    const [focusMode, setFocusMode] = useState<'start' | 'end'>('end');
    const [focusNonce, setFocusNonce] = useState(0);
    const measureRef = useRef<HTMLDivElement | null>(null);
    const editorsRef = useRef<(Editor | null)[]>([]);
    const [editorCount, setEditorCount] = useState(0);
    const cursorNonceRef = useRef(0);
    const pagesRef = useRef(pages);
    const enterSignalRef = useRef(false);
    const initializedRef = useRef(false);
    const selectAllActiveRef = useRef(false);
    const lastFlushKeyRef = useRef('');
    const [selectAllActive, setSelectAllActive] = useState(false);
    const selectAllFnRef = useRef<() => boolean>(() => false);
    const globalEditFnRef = useRef<(kind: 'clear' | 'replace', ch?: string) => boolean>(() => false);
    const copyAllFnRef = useRef<() => boolean>(() => false);

    useEffect(() => {
        pagesRef.current = pages;
    }, [pages]);

    const setEditor = useCallback((index: number, editor: Editor | null) => {
        editorsRef.current[index] = editor;
        setEditorCount((c) => c + 1);
    }, []);

    const scrollToPage = useCallback((pageIndex: number, smooth = true) => {
        const container = containerRef.current;
        const targetEl = document.getElementById(`xray-page-container-${pageIndex}`);
        if (container && targetEl) {
            const containerRect = container.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            const targetTop = container.scrollTop + (targetRect.top - containerRect.top) - 16;
            container.scrollTo({ top: Math.max(0, targetTop), behavior: smooth ? 'smooth' : 'auto' });
        }
    }, []);

    // Measure exact line count of a single HTML block element (<p>, <h1>, <ul>, etc.)
    const countBlockLines = (b: HTMLElement, m: HTMLElement): number => {
        const text = (b.textContent || '').trim();
        const tag = b.tagName.toLowerCase();

        // An empty paragraph is always exactly 1 line
        if (!text) return 1;

        if (tag === 'ul' || tag === 'ol') {
            const lis = Array.from(b.children);
            return Math.max(1, lis.length);
        }

        // Render the single block in the measure container with exact editor width & font metrics
        m.innerHTML = `<div class="ProseMirror" style="width:${EDITOR_W}px!important;padding:0!important;margin:0!important;font-family:'Angsana New','Angsana',Tahoma,sans-serif!important;font-size:16pt!important;line-height:${LINE_H}px!important;box-sizing:border-box!important;">${b.outerHTML}</div>`;
        const rendered = m.firstElementChild?.firstElementChild as HTMLElement;
        if (!rendered) return 1;
        const h = Math.max(rendered.offsetHeight, rendered.scrollHeight);
        return Math.max(1, Math.round(h / LINE_H));
    };

    // Calculate the total physical lines of an HTML string by summing its block lines
    const countHtmlLines = (html: string, m: HTMLElement): number => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const blocks = Array.from(tmp.children) as HTMLElement[];
        if (blocks.length === 0) return 0;

        let total = 0;
        for (const b of blocks) {
            total += countBlockLines(b, m);
        }
        return total;
    };

    const countPhysicalLines = (m: HTMLElement, html: string): number => {
        return countHtmlLines(html, m);
    };

    const isContentOverflowing = (m: HTMLElement, html: string): boolean => {
        return countHtmlLines(html, m) > linesPerPage;
    };

    const measureHeight = (m: HTMLElement, html: string): number => {
        return countHtmlLines(html, m) * LINE_H;
    };

    const pageCapPx = (): number => Math.floor(LINE_H * linesPerPage) - 2;

    const activeEditor = (): Editor | null =>
        editorsRef.current[activePage] ?? editorsRef.current[pagesRef.current.length - 1] ?? null;

    const [activeFontSize, setActiveFontSize] = useState<number>(16);

    const updateActiveFontSize = useCallback(() => {
        const ed = activeEditor();
        if (!ed || ed.isDestroyed) return;
        const sizeAttr = ed.getAttributes('fontSize')?.size;
        if (sizeAttr) {
            const num = parseInt(sizeAttr, 10);
            if (!isNaN(num)) {
                setActiveFontSize(num);
                return;
            }
        }
        if (ed.isActive('heading', { level: 1 })) {
            setActiveFontSize(20);
            return;
        }
        if (ed.isActive('heading', { level: 2 })) {
            setActiveFontSize(18);
            return;
        }
        if (ed.isActive('heading', { level: 3 })) {
            setActiveFontSize(16);
            return;
        }
        setActiveFontSize(16);
    }, [activePage, editorCount]);

    const handleSetFontSize = (size: number) => {
        const ed = activeEditor();
        if (!ed || ed.isDestroyed) return;
        if (size === 16) {
            ed.chain().focus().unsetFontSize().run();
        } else {
            ed.chain().focus().setFontSize(`${size}pt`).run();
        }
        setActiveFontSize(size);
    };

    const splitBlockToFit = (m: HTMLElement, currentHtml: string, blockHtml: string, maxAvailableLines?: number): string[] => {
        const tmp = document.createElement('div');
        tmp.innerHTML = blockHtml;
        const el = tmp.children[0] as HTMLElement | undefined;
        if (!el) return [blockHtml];
        const tag = el.tagName.toLowerCase();
        if (tag !== 'p' && tag !== 'h1' && tag !== 'h2' && tag !== 'h3' && tag !== 'h4' && tag !== 'h5' && tag !== 'h6') {
            return [blockHtml];
        }
        const text = el.textContent || '';
        if (!text.trim()) return [blockHtml];

        const targetCap = typeof maxAvailableLines === 'number'
            ? countHtmlLines(currentHtml, m) + maxAvailableLines
            : linesPerPage;

        let lo = 0;
        let hi = text.length;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            const testBlockHtml = `<${tag}>${escHtml(text.slice(0, mid))}</${tag}>`;
            const testTotalLines = countHtmlLines(currentHtml + testBlockHtml, m);
            if (testTotalLines <= targetCap) lo = mid;
            else hi = mid - 1;
        }
        if (lo <= 0 || lo >= text.length) return [blockHtml];

        const prefix = text.slice(0, lo);
        const suffix = text.slice(lo).replace(/^\s+/, '');
        const parts: string[] = [];
        if (prefix.trim()) parts.push(`<${tag}>${escHtml(prefix)}</${tag}>`);
        if (suffix.trim()) parts.push(`<${tag}>${escHtml(suffix)}</${tag}>`);
        return parts.length ? parts : [blockHtml];
    };

    const splitIntoPages = (m: HTMLElement, arr: string[], from: number, activeEd?: Editor | null, activeIdx?: number): string[] => {
        const pagesCopy = [...arr];
        const out = pagesCopy.slice(0, from);

        for (let pi = from; pi < pagesCopy.length; pi++) {
            let pageHtml = pagesCopy[pi] || '';

            // Handle [PAGE BREAK] command
            if (pageHtml.includes('[PAGE BREAK]')) {
                const parts = pageHtml.split(/<p[^>]*>\s*\[PAGE BREAK\]\s*<\/p>|\[PAGE BREAK\]/i);
                if (parts.length > 1) {
                    pageHtml = parts[0] || '<p></p>';
                    const restHtml = parts.slice(1).join('');
                    if (pi + 1 < pagesCopy.length) {
                        pagesCopy[pi + 1] = restHtml + pagesCopy[pi + 1];
                    } else if (restHtml.trim() !== '') {
                        pagesCopy.push(restHtml);
                    }
                }
            }

            // Word-style continuous flow: Pull up from subsequent page ONLY if this page has room (< linesPerPage)
            if (pi + 1 < pagesCopy.length && pagesCopy[pi + 1] && !pagesCopy[pi + 1].includes('[PAGE BREAK]')) {
                let curLines = countHtmlLines(pageHtml, m);
                if (curLines < linesPerPage) {
                    const tmpNext = document.createElement('div');
                    tmpNext.innerHTML = pagesCopy[pi + 1];
                    const nextBlocks = Array.from(tmpNext.children) as HTMLElement[];
                    const remainingNextBlocks: string[] = [];
                    let pulledAny = false;

                    for (const b of nextBlocks) {
                        const bLines = countBlockLines(b, m);
                        if (remainingNextBlocks.length === 0 && curLines + bLines <= linesPerPage) {
                            pageHtml += b.outerHTML;
                            curLines += bLines;
                            pulledAny = true;
                        } else if (remainingNextBlocks.length === 0 && curLines < linesPerPage) {
                            const available = Math.max(0, linesPerPage - curLines);
                            const parts = splitBlockToFit(m, pageHtml, b.outerHTML, available);
                            if (parts.length > 1 && parts[0] && parts[1]) {
                                pageHtml += parts[0];
                                curLines += countHtmlLines(parts[0], m);
                                remainingNextBlocks.push(parts[1]);
                                pulledAny = true;
                            } else {
                                remainingNextBlocks.push(b.outerHTML);
                            }
                        } else {
                            remainingNextBlocks.push(b.outerHTML);
                        }
                    }

                    if (pulledAny) {
                        pagesCopy[pi + 1] = remainingNextBlocks.join('');
                    }
                }
            }

            const totalPageLines = countHtmlLines(pageHtml, m);
            if (totalPageLines <= linesPerPage) {
                out[pi] = pageHtml.trim() === '' ? '<p></p>' : pageHtml;
                continue;
            }

            // This page overflows linesPerPage (23 lines) -> split and cascade overflow onto subsequent pages
            const tmp = document.createElement('div');
            tmp.innerHTML = pageHtml;
            const blocks = Array.from(tmp.children) as HTMLElement[];

            let curPageHtml = '';
            let curPageLines = 0;
            const overflowBlocks: string[] = [];

            for (const b of blocks) {
                const bLines = countBlockLines(b, m);
                if (overflowBlocks.length === 0 && curPageLines + bLines <= linesPerPage) {
                    curPageHtml += b.outerHTML;
                    curPageLines += bLines;
                } else if (overflowBlocks.length === 0) {
                    const available = Math.max(0, linesPerPage - curPageLines);
                    if (available > 0) {
                        const parts = splitBlockToFit(m, curPageHtml, b.outerHTML, available);
                        if (parts.length > 1 && parts[0] && parts[1]) {
                            curPageHtml += parts[0];
                            curPageLines += countHtmlLines(parts[0], m);
                            overflowBlocks.push(parts[1]);
                        } else if (curPageHtml.trim() !== '') {
                            overflowBlocks.push(b.outerHTML);
                        } else {
                            curPageHtml = b.outerHTML;
                            curPageLines += bLines;
                        }
                    } else {
                        overflowBlocks.push(b.outerHTML);
                    }
                } else {
                    overflowBlocks.push(b.outerHTML);
                }
            }

            out[pi] = curPageHtml || '<p></p>';
            const overflowHtml = overflowBlocks.join('');
            if (overflowHtml) {
                if (pi + 1 < pagesCopy.length) {
                    pagesCopy[pi + 1] = overflowHtml + pagesCopy[pi + 1];
                } else {
                    pagesCopy.push(overflowHtml);
                }
            }
        }

        while (
            out.length > 1 &&
            isEmptyPage(out[out.length - 1]) &&
            countHtmlLines(out[out.length - 2], m) < linesPerPage &&
            activeIdx !== out.length - 1
        ) {
            out.pop();
        }

        return out.length ? out : ['<p></p>'];
    };

    const ensureMeasure = () => {
        if (measureRef.current) return measureRef.current;
        const m = document.createElement('div');
        m.setAttribute('aria-hidden', 'true');
        m.className = 'xray-page-editor xray-measure';
        m.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;left:-9999px;top:0;width:${EDITOR_W}px;height:auto!important;max-height:none!important;min-height:0!important;overflow:visible!important;display:block!important;padding:0!important;margin:0!important;font-family:'Angsana New','Angsana',Tahoma,sans-serif!important;font-size:16pt!important;line-height:${LINE_H}px!important;`;
        document.body.appendChild(m);
        measureRef.current = m;
        return m;
    };

    useEffect(() => {
        const m = ensureMeasure();
        if (m && !initializedRef.current) {
            initializedRef.current = true;
            setPages((prev) => {
                const tmp = pagesRef.current;
                const arr = (tmp.length ? tmp : prev).map((p) => (p === '' ? '<p></p>' : p));
                return splitIntoPages(m, arr, 0);
            });
        }
        return () => {
            if (measureRef.current) {
                measureRef.current.remove();
                measureRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Word-like continuous flow: reflow from page 0 onward so text
    // flows DOWN to new pages when a page fills up, and flows UP (pulling the
    // next page's blocks up) when text is deleted.
    const flushPage = (i: number, html: string) => {
        const m = ensureMeasure();
        const ed = editorsRef.current[i];
        if (!m || !ed) return;

        // Duplicate-flush guard: Tiptap can deliver duplicate onUpdate transactions
        // per single keystroke.
        const flushKey = i + '|' + html;
        if (lastFlushKeyRef.current === flushKey) {
            enterSignalRef.current = false;
            return;
        }
        lastFlushKeyRef.current = flushKey;

        // Parse [SET_LINES_PER_PAGE: X] commands
        const lppMatch = html.match(/\[SET_LINES_PER_PAGE:\s*(\d+)\]/);
        if (lppMatch) {
            const newLpp = parseInt(lppMatch[1], 10);
            if (newLpp >= 5 && newLpp <= 100 && newLpp !== linesPerPage) {
                setLinesPerPage(newLpp);
            }
        }
        // Strip [SET_LINES_PER_PAGE: X] paragraphs and the caret marker \uFEFF
        const cleanHtml = html
            .replace(/<p[^>]*>\s*\[SET_LINES_PER_PAGE:\s*\d+\]\s*<\/p>/gi, '')
            .replace(/\uFEFF/g, '');

        // Capture the caret information on page i before reflow
        const sel = ed.state.selection;
        const caretBlockIndex = sel.$from ? sel.$from.index(0) : 0;
        const caretPos = sel.from;
        const wasEnter = enterSignalRef.current;
        enterSignalRef.current = false;

        const prev = pagesRef.current;
        const next = prev.slice();
        next[i] = cleanHtml;

        const result = splitIntoPages(m, next, 0, ed, i);

        // Collapse trailing empty pages only if previous page has room AND the user is not actively on the trailing page
        while (
            result.length > 1 &&
            isEmptyPage(result[result.length - 1]) &&
            countHtmlLines(result[result.length - 2], m) < linesPerPage &&
            activePage !== result.length - 1
        ) {
            result.pop();
        }

        // Check if page i overflowed to page i + 1
        const tmpDiv = document.createElement('div');
        tmpDiv.innerHTML = result[i] || '';
        const blocksOnPageI = tmpDiv.children.length;

        const isOverflowedToNext = i + 1 < result.length && result[i] !== cleanHtml;

        // Caret should only jump to page i + 1 if the block where caret was located moved to page i + 1
        let shouldFocusNext = false;
        if (isOverflowedToNext && !pendingCursor) {
            if (caretBlockIndex >= blocksOnPageI) {
                shouldFocusNext = true;
            }
        }

        // Synchronously update the active editor if its content changed during reflow
        if (result[i] && result[i] !== cleanHtml) {
            ed.commands.setContent(result[i], { emitUpdate: false });
            if (!shouldFocusNext) {
                try {
                    const maxPos = ed.state.doc.content.size;
                    if (caretPos > 0 && caretPos <= maxPos) {
                        ed.commands.setTextSelection({
                            from: Math.min(caretPos, maxPos),
                            to: Math.min(sel.to, maxPos),
                        });
                    }
                } catch (err) { }
            }
        }

        lastFlushKeyRef.current = i + '|' + (result[i] || cleanHtml);
        pagesRef.current = result;
        setPages(result);

        if (shouldFocusNext && i + 1 < result.length && !pendingCursor) {
            setFocusMode('start');
            setFocusPage(i + 1);
            setActivePage(i + 1);
            setFocusNonce((n) => n + 1);

            const tryFocus = (attempts = 0) => {
                const nextEd = editorsRef.current[i + 1];
                if (nextEd && !nextEd.isDestroyed) {
                    try {
                        nextEd.view.focus();
                        nextEd.commands.setTextSelection(1);
                    } catch (e) {
                        try { nextEd.commands.focus('start'); } catch (err) { }
                    }
                    scrollToPage(i + 1);
                } else if (attempts < 15) {
                    setTimeout(() => tryFocus(attempts + 1), 30);
                }
            };
            setTimeout(() => tryFocus(0), 10);
        } else {
            setFocusPage(null);
            setActivePage(i);
        }
    };



    const { setData, post, processing, data } = useForm({
        xray_result: JSON.stringify(pages),
        ref_doc: patient?.OP_SEND_DR_Name || '',
        vt_no: patient?.VT_NO || '',
    });



    // Backspace at the very start of a non-first page (Word-style):
    // Merges the first block of the current page with the last block of the previous page
    const [pendingCursor, setPendingCursor] = useState<{ ts: number; targetPage: number } | null>(null);
    const appliedCursorRef = useRef<number | null>(null);

    const findAndApplyPendingCursor = useCallback(() => {
        if (!pendingCursor) return false;
        if (appliedCursorRef.current === pendingCursor.ts) return true;

        const targetPage = pendingCursor.targetPage;
        const candidatePages = [targetPage, ...pages.map((_, idx) => idx).filter(idx => idx !== targetPage)];

        for (const j of candidatePages) {
            const ed2 = editorsRef.current[j];
            if (!ed2 || ed2.isDestroyed) continue;

            let foundPos = -1;
            ed2.state.doc.descendants((node, pos) => {
                if (node.isText && node.text && node.text.includes('\uFEFF')) {
                    foundPos = pos + node.text.indexOf('\uFEFF');
                    return false;
                }
            });

            if (foundPos !== -1) {
                appliedCursorRef.current = pendingCursor.ts;
                ed2.chain()
                    .focus()
                    .setTextSelection(foundPos + 1)
                    .deleteRange({ from: foundPos, to: foundPos + 1 })
                    .run();

                setActivePage(j);
                setPendingCursor(null);
                return true;
            }
        }
        return false;
    }, [pendingCursor, pages]);

    useEffect(() => {
        if (!pendingCursor) return;
        if (appliedCursorRef.current === pendingCursor.ts) return;

        if (!findAndApplyPendingCursor()) {
            const timer = setTimeout(() => {
                findAndApplyPendingCursor();
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [pendingCursor, findAndApplyPendingCursor, pages, editorCount]);

    // Handle Enter at the end of a full page: directly creates or moves cursor to next page with new line
    const handleEnterAtEnd = (i: number): boolean => {
        const ed = editorsRef.current[i];
        const m = ensureMeasure();
        if (!ed || !m) return false;

        const sel = ed.state.selection;
        if (!sel.empty) return false;

        const docSize = ed.state.doc.content.size;
        // Check if cursor is at the end of the page (within 2 positions from end of doc)
        const isAtEnd = sel.from >= docSize - 1;
        if (!isAtEnd) return false;

        const currentHtml = sanitizeHtml(ed.getHTML());
        const domOverflown = ed.view?.dom ? ed.view.dom.scrollHeight > EDITOR_HEIGHT : false;
        const isFull = isContentOverflowing(m, currentHtml) || countPhysicalLines(m, currentHtml) >= linesPerPage || domOverflown;

        if (isFull) {
            lastFlushKeyRef.current = '';
            const curPages = pagesRef.current.slice();
            const targetPage = i + 1;

            if (targetPage < curPages.length) {
                const nextPageHtml = curPages[targetPage] || '<p></p>';
                if (!isEmptyPage(nextPageHtml)) {
                    curPages[targetPage] = '<p></p>' + nextPageHtml;
                }
            } else {
                curPages.push('<p></p>');
            }

            pagesRef.current = curPages;
            setPages(curPages);
            setActivePage(targetPage);
            setFocusMode('start');
            setFocusPage(targetPage);
            setFocusNonce((n) => n + 1);

            const tryFocus = (attempts = 0) => {
                const nextEd = editorsRef.current[targetPage];
                if (nextEd && !nextEd.isDestroyed) {
                    try {
                        nextEd.view.focus();
                        if (nextEd.view.dom) nextEd.view.dom.focus();
                        nextEd.commands.setTextSelection(1);
                    } catch (e) {
                        try { nextEd.commands.focus('start'); } catch (err) { }
                    }
                    scrollToPage(targetPage);
                } else if (attempts < 15) {
                    setTimeout(() => tryFocus(attempts + 1), 30);
                }
            };
            setTimeout(() => tryFocus(0), 10);
            return true;
        }

        return false;
    };

    // Handle Backspace at start of page (flows text and cursor up to previous page)
    const handleBackspaceAtStart = (i: number): boolean => {
        const ed = editorsRef.current[i];
        if (!ed || i <= 0) return false;
        const sel = ed.state.selection;
        if (!sel.empty) return false;

        // ONLY trigger cross-page backspace if the cursor is in Block 0 and preceded only by whitespace or start of node
        const textBefore = ed.state.doc.textBetween(1, sel.$from.pos, '\n', '\n');
        const isAtFirstBlock = sel.$from.index(0) === 0 && (sel.$from.pos <= 1 || sel.$from.parentOffset === 0 || !textBefore.trim());
        if (!isAtFirstBlock) return false;

        const prevHtml = sanitizeHtml((editorsRef.current[i - 1]?.getHTML() ?? pagesRef.current[i - 1]) || '');
        const nextHtml = sanitizeHtml(ed.getHTML());

        const empty = isEmptyPage(nextHtml);
        if (empty) {
            lastFlushKeyRef.current = '';
            const nextPages = pagesRef.current.filter((_, idx) => idx !== i);
            const finalPages = nextPages.length ? nextPages : ['<p></p>'];
            pagesRef.current = finalPages;
            setPages(finalPages);
            setActivePage(i - 1);
            setFocusMode('end');
            setFocusPage(i - 1);
            setFocusNonce((n) => n + 1);
            setTimeout(() => {
                scrollToPage(i - 1);
            }, 50);
            return true;
        }

        const m = ensureMeasure();
        if (m) {
            const tmpPrev = document.createElement('div');
            tmpPrev.innerHTML = prevHtml;
            const tmpNext = document.createElement('div');
            tmpNext.innerHTML = nextHtml;

            let lastPrev = tmpPrev.lastElementChild;
            if (lastPrev && (lastPrev.textContent || '').trim() === '[PAGE BREAK]') {
                lastPrev.remove();
                lastPrev = tmpPrev.lastElementChild;
            }

            const firstNext = tmpNext.firstElementChild;

            if (firstNext) {
                const prevEmpty = !lastPrev || !(lastPrev.textContent || '').trim();

                if (prevEmpty && lastPrev) {
                    // Remove the empty paragraph at the end of the previous page and move firstNext in its place
                    lastPrev.remove();
                    const newBlock = document.createElement(firstNext.tagName.toLowerCase() || 'p');
                    newBlock.innerHTML = '\uFEFF' + firstNext.innerHTML;
                    tmpPrev.appendChild(newBlock);
                    firstNext.remove();
                } else if (lastPrev) {
                    // Merge firstNext directly to the end of lastPrev
                    lastPrev.innerHTML = lastPrev.innerHTML.replace(/\s+$/, '') + '\uFEFF' + firstNext.innerHTML;
                    firstNext.remove();
                } else {
                    const newBlock = document.createElement('p');
                    newBlock.innerHTML = '\uFEFF' + firstNext.innerHTML;
                    tmpPrev.appendChild(newBlock);
                    firstNext.remove();
                }

                const newPrevHtml = tmpPrev.innerHTML;
                const newNextHtml = tmpNext.innerHTML;

                cursorNonceRef.current += 1;
                setPendingCursor({ ts: cursorNonceRef.current, targetPage: i - 1 });

                lastFlushKeyRef.current = '';
                const next = pagesRef.current.slice();
                next[i - 1] = newPrevHtml;
                if (isEmptyPage(newNextHtml)) {
                    next.splice(i, 1);
                } else {
                    next[i] = newNextHtml;
                }
                while (
                    next.length > 1 &&
                    isEmptyPage(next[next.length - 1]) &&
                    (measureRef.current ? countPhysicalLines(measureRef.current, next[next.length - 2]) < linesPerPage : true)
                ) {
                    next.pop();
                }
                pagesRef.current = next;
                setPages(next);
                setTimeout(() => {
                    scrollToPage(i - 1);
                }, 50);
                return true;
            }
        }
        return false;
    };

    // Ctrl+A over ALL pages: select-all semantics across every page editor
    // (each page is its own ProseMirror doc). ProseMirror of the focused page
    // collapses any DOM selection that spans its siblings, so the state is
    // tracked in a ref + a visual overlay instead of a real DOM selection.
    const selectAllAcross = (): boolean => {
        const pms = Array.from(document.querySelectorAll('.ProseMirror')).filter(
            (e) => !e.classList.contains('xray-measure')
        ) as HTMLElement[];
        if (!pms.length) return false;
        selectAllActiveRef.current = true;
        setSelectAllActive(true);
        return true;
    };
    selectAllFnRef.current = selectAllAcross;

    // Ctrl+A followed by Delete/Backspace/Enter: wipe the whole document.
    const clearAllPages = (): boolean => {
        lastFlushKeyRef.current = '';
        selectAllActiveRef.current = false;
        setSelectAllActive(false);
        pagesRef.current = ['<p></p>'];
        setPages(['<p></p>']);
        setFocusPage(0);
        setFocusMode('end');
        setFocusNonce((n) => n + 1);
        return true;
    };

    // Ctrl+A followed by typing: replace the whole document with that text.
    const replaceAllPages = (_kind: 'clear' | 'replace', ch?: string): boolean => {
        lastFlushKeyRef.current = '';
        selectAllActiveRef.current = false;
        setSelectAllActive(false);
        const newHtml = [toParagraphHtml((ch ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').trim() || '<br>')];
        pagesRef.current = newHtml;
        setPages(newHtml);
        setFocusPage(0);
        setFocusMode('end');
        setFocusNonce((n) => n + 1);
        return true;
    };
    globalEditFnRef.current = (kind, ch) => (kind === 'clear' ? clearAllPages() : replaceAllPages(kind, ch));

    // Ctrl+A followed by Ctrl+C: copy the whole document's text.
    const copyAllPages = (): boolean => {
        const text = pagesRef.current
            .map((p) => {
                const tmp = document.createElement('div');
                tmp.innerHTML = p;
                return (tmp.textContent || '').trim();
            })
            .filter((t) => t.length > 0)
            .join('\n');
        if (text && navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => { });
        }
        return true;
    };
    copyAllFnRef.current = copyAllPages;

    useEffect(() => {
        // Any real mouse click collapses the cross-page selection.
        const onMouseDown = () => {
            selectAllActiveRef.current = false;
            setSelectAllActive(false);
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, []);

    useEffect(() => {
        // Drop trailing empty pages (e.g. a just-created page break) so the
        // PDF never prints blank sheets.
        const m = measureRef.current;
        const finalPages = pages.slice();
        while (
            finalPages.length > 1 &&
            isEmptyPage(finalPages[finalPages.length - 1]) &&
            (m ? countHtmlLines(finalPages[finalPages.length - 2], m) < linesPerPage : true) &&
            activePage !== finalPages.length - 1
        ) {
            finalPages.pop();
        }
        const hasContent = finalPages.some((p) => !isEmptyPage(p));
        const serialized = hasContent ? JSON.stringify(finalPages) : '';
        setData({
            xray_result: serialized,
            ref_doc: patient?.OP_SEND_DR_Name || '',
            vt_no: patient?.VT_NO || '',
        });
        try {
            if (hasContent) {
                localStorage.setItem(draftKey, JSON.stringify({
                    pages: finalPages,
                    updatedAt: Date.now(),
                }));
            } else {
                localStorage.removeItem(draftKey);
            }
        } catch (err) { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pages, draftKey, activePage]);

    const loadSavedPresets = (): PresetItem[] => {
        try {
            const saved = localStorage.getItem('xray_custom_presets');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            // Fallback
        }
        return [];
    };

    const [showAllergyDetails, setShowAllergyDetails] = useState(false);
    const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastActive, setToastActive] = useState(false);
    const toastTimerRef = useRef<{ hide?: NodeJS.Timeout; unmount?: NodeJS.Timeout }>({});

    const triggerSaveToast = () => {
        if (toastTimerRef.current.hide) clearTimeout(toastTimerRef.current.hide);
        if (toastTimerRef.current.unmount) clearTimeout(toastTimerRef.current.unmount);

        setToastVisible(true);
        setTimeout(() => {
            setToastActive(true);
        }, 20);

        toastTimerRef.current.hide = setTimeout(() => {
            setToastActive(false);
            toastTimerRef.current.unmount = setTimeout(() => {
                setToastVisible(false);
            }, 450);
        }, 3200);
    };

    const editingKey = `ultrasound_is_editing_${hn}_${patient?.VT_NO || 'default'}`;

    const rawDbResult = patient?.OP_Ultrasound_Result || patient?.OP_Xray_Result || '';
    const hasDbData = Boolean(rawDbResult && splitIntoSavedPages(rawDbResult).some((p) => !isEmptyPage(p)));

    const [isEditing, setIsEditing] = useState<boolean>(() => {
        // If there is NO saved data in database, start immediately in editing mode
        if (!hasDbData) return true;

        // If there is saved data in database, require clicking "แก้ไข" button unless already active in session
        try {
            const savedState = sessionStorage.getItem(editingKey);
            if (savedState !== null) {
                return savedState === 'true';
            }
        } catch (e) { }

        return false;
    });

    const handleSetIsEditing = (val: boolean) => {
        setIsEditing(val);
        try {
            if (val) {
                sessionStorage.setItem(editingKey, 'true');
            } else {
                sessionStorage.removeItem(editingKey);
            }
        } catch (e) { }
    };

    // When entering the page with no existing data, auto-focus cursor ready for typing immediately
    useEffect(() => {
        if (!hasDbData) {
            const timer = setTimeout(() => {
                const ed = editorsRef.current[0];
                if (ed && !ed.isDestroyed) {
                    try {
                        ed.view.focus();
                        ed.commands.focus('end');
                    } catch (e) { }
                } else {
                    setFocusPage(0);
                    setFocusMode('end');
                    setFocusNonce((n) => n + 1);
                }
            }, 120);
            return () => clearTimeout(timer);
        }
    }, [hasDbData]);
    const [customPresets, setCustomPresets] = useState<PresetItem[]>(loadSavedPresets);
    const [presetSearch, setPresetSearch] = useState('');
    const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
    const [fontSizeDropdownOpen, setFontSizeDropdownOpen] = useState(false);
    const [moreFontSizeOpen, setMoreFontSizeOpen] = useState(false);
    const [isAddPresetOpen, setIsAddPresetOpen] = useState(false);
    const [newPresetLabel, setNewPresetLabel] = useState('');
    const [newPresetText, setNewPresetText] = useState('');
    const hasAllergy = patient ? ((patient.STS && patient.STS.toUpperCase() === 'Y') || Boolean(patient.OP_ALLERGIC)) : false;

    // iPad & Tablet Responsive States
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
        try {
            const saved = sessionStorage.getItem('xray_sidebar_open');
            if (saved !== null) {
                return saved === 'true';
            }
        } catch (e) { }
        return true;
    });

    const handleSetSidebarOpen = (valOrFn: boolean | ((prev: boolean) => boolean)) => {
        setSidebarOpen((prev) => {
            const nextVal = typeof valOrFn === 'boolean' ? valOrFn : valOrFn(prev);
            try {
                sessionStorage.setItem('xray_sidebar_open', String(nextVal));
            } catch (e) { }
            return nextVal;
        });
    };

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [zoomMode, setZoomMode] = useState<'fit' | '100' | '90' | '75'>('100');
    const [scale, setScale] = useState(1.0);
    const containerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, []);

    useEffect(() => {
        const resetScroll = () => {
            if (containerRef.current) {
                containerRef.current.scrollTop = 0;
            }
        };
        resetScroll();
        const t1 = setTimeout(resetScroll, 50);
        const t2 = setTimeout(resetScroll, 150);
        const t3 = setTimeout(resetScroll, 300);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    useEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.clientWidth;
            const paperWidth = PAPER_WIDTH; // 794px standard A4
            if (zoomMode === '100') {
                setScale(1.0);
            } else if (zoomMode === '90') {
                setScale(0.9);
            } else if (zoomMode === '75') {
                setScale(0.75);
            } else {
                // Auto fit based on container width with padding and scrollbar buffer
                const availableWidth = Math.max(100, containerWidth - 64);
                const fitScale = Math.min(1.0, Math.max(0.3, availableWidth / paperWidth));
                setScale(fitScale);
            }
        };

        updateScale();
        window.addEventListener('resize', updateScale);

        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
            ro = new ResizeObserver(() => {
                updateScale();
            });
            ro.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateScale);
            ro?.disconnect();
        };
    }, [zoomMode, sidebarOpen]);

    const allPresets = [...customPresets, ...dbPresets];
    const filteredPresets = allPresets.filter((p) => {
        if (!presetSearch.trim()) return true;
        const q = presetSearch.toLowerCase();
        return p.label.toLowerCase().includes(q) || p.text.toLowerCase().includes(q);
    });

    const handleAddPreset = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPresetLabel.trim() || !newPresetText.trim()) return;

        const newItem: PresetItem = {
            id: Date.now().toString(),
            label: newPresetLabel.trim(),
            text: newPresetText.trim(),
        };

        const updated = [...customPresets, newItem];
        setCustomPresets(updated);
        try {
            localStorage.setItem('xray_custom_presets', JSON.stringify(updated));
        } catch (err) { }

        setNewPresetLabel('');
        setNewPresetText('');
        setIsAddPresetOpen(false);
    };

    const handleDeletePreset = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = customPresets.filter((p) => p.id !== id);
        setCustomPresets(updated);
        try {
            localStorage.setItem('xray_custom_presets', JSON.stringify(updated));
        } catch (err) { }
    };

    const handleResetPresets = () => {
        if (confirm('คุณต้องการรีเซ็ตข้อความสำเร็จรูปส่วนตัวเป็นค่าเริ่มต้นหรือไม่?')) {
            setCustomPresets(DEFAULT_PRESETS);
            try {
                localStorage.removeItem('xray_custom_presets');
            } catch (err) { }
        }
    };

    const handleCancelEdit = () => {
        if (isDirty) {
            const originalPages = splitIntoSavedPages(patient?.OP_Ultrasound_Result || patient?.OP_Xray_Result || '');
            setPages(originalPages);
            pagesRef.current = originalPages;
            try {
                localStorage.removeItem(draftKey);
            } catch (err) { }
        }
        handleSetIsEditing(false);
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (onSaved?: () => void) => {
        if (isSaving) return;
        setIsSaving(true);

        const payloadResult = JSON.stringify(pages);
        try {
            await axios.post(route('patient.ultrasound.update', { hn }), {
                xray_result: payloadResult,
                ref_doc: patient?.OP_SEND_DR_Name || '',
                vt_no: patient?.VT_NO || '',
            }, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            });

            setSavedBaseline(serializeForBaseline(pages));
            try {
                if (payloadResult && !splitIntoSavedPages(payloadResult).every(isEmptyPage)) {
                    localStorage.setItem(draftKey, JSON.stringify({
                        pages: splitIntoSavedPages(payloadResult),
                        updatedAt: Date.now(),
                    }));
                } else {
                    localStorage.removeItem(draftKey);
                }
            } catch (err) { }

            handleSetIsEditing(false);
            triggerSaveToast();
            onSaved?.();
        } catch (error) {
            console.error('Error saving ultrasound result:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenPdf = () => {
        if (!patient) return;
        const url = route('patient.ultrasound.pdf', { hn: patient.op_hn, vt: patient.VT_NO || '' });
        window.open(url, '_blank');
    };

    const insertPreset = (text: string) => {
        if (!isEditing) {
            handleSetIsEditing(true);
        }
        const ed = activeEditor() || editorsRef.current[0];
        if (!ed) return;
        const html = sanitizeHtml(toParagraphHtml(text.replace(/\r\n/g, '\n').trim()));
        ed.chain().focus().insertContent(html).run();
        setPresetDropdownOpen(false);
    };

    const handleAddBlankPage = () => {
        if (!isEditing) {
            handleSetIsEditing(true);
        }
        lastFlushKeyRef.current = '';
        const targetIndex = activePage >= 0 && activePage < pages.length ? activePage + 1 : pages.length;
        const newPages = [...pages];
        newPages.splice(targetIndex, 0, '<p></p>');
        pagesRef.current = newPages;
        setPages(newPages);
        setActivePage(targetIndex);
        setFocusPage(targetIndex);
        setFocusMode('start');
        setFocusNonce((n) => n + 1);

        // Smooth scroll container to the top of the new blank page properly without distortion
        setTimeout(() => {
            const container = containerRef.current;
            const targetEl = document.getElementById(`xray-page-container-${targetIndex}`);
            if (container && targetEl) {
                const containerRect = container.getBoundingClientRect();
                const targetRect = targetEl.getBoundingClientRect();
                const targetTop = container.scrollTop + (targetRect.top - containerRect.top) - 16;
                container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            }
            const ed = editorsRef.current[targetIndex];
            if (ed && !ed.isDestroyed) {
                ed.commands.focus('start');
            }
        }, 60);
    };

    const allPlainText = pages
        .map((p) => {
            const el = document.createElement('div');
            el.innerHTML = p;
            return el.textContent || el.innerText || '';
        })
        .join(' ');

    const wordCount = allPlainText.trim() ? allPlainText.trim().split(/\s+/).filter(Boolean).length : 0;
    const charCount = allPlainText.length;

    const renderPatientProfileCard = (isModal = false) => (
        <Card className={`overflow-hidden rounded-2xl h-full flex flex-col ${isModal ? 'border-none shadow-none' : 'border-slate-300/60 shadow-sm'}`}>
            <CardHeader className="p-4 shrink-0 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#00875A]" />
                    ข้อมูลผู้ป่วย (Patient Profile)
                </CardTitle>
                {!isModal && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        onClick={() => handleSetSidebarOpen(false)}
                        title="ซ่อนข้อมูลผู้ป่วย"
                    >
                        <PanelLeftClose className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-sm flex-1 min-h-0 overflow-y-auto">
                {/* Avatar & Basic Info */}
                <div className="flex items-center gap-3.5 p-3 liquid-glass-box rounded-xl">
                    <div className="border-2 border-slate-900 shadow-sm shrink-0 bg-slate-100 overflow-hidden inline-block w-fit h-fit rounded-none">
                        {patient?.Image_PT ? (
                            <img
                                src={patient.Image_PT}
                                alt={patient.fullname}
                                className="max-h-32 sm:max-h-36 w-auto max-w-[120px] sm:max-w-[140px] block rounded-none"
                            />
                        ) : (
                            <div className="w-24 sm:w-26 h-30 sm:h-32 bg-slate-100 text-slate-900 flex items-center justify-center">
                                <UserCheck className="h-8 w-8 text-slate-900 stroke-[2]" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                        <h4 className="font-bold text-base truncate text-slate-900">
                            {patient?.fullname || '-'}
                        </h4>
                        <p className="text-slate-600 font-mono text-xs sm:text-sm">
                            CN: <span className="font-bold text-sm text-[#00875A]">{patient?.op_hn || hn}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="bg-white text-slate-700 text-xs px-2 py-0.5 font-medium">
                                Visit No: {patient?.VT_NO || '-'}
                            </Badge>
                            <span className="text-xs text-slate-500 font-medium">{formatPatientAge(patient)} {patient?.op_sex ? `/ ${patient.op_sex}` : ''}</span>
                        </div>
                    </div>
                </div>

                {/* Doctor & Time & Allergy Status */}
                <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">แพทย์ผู้ตรวจ:</span>
                        <span className="font-bold text-slate-800 text-xs sm:text-sm">{patient?.OP_SEND_DR_Name || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">เวลาส่งตัว:</span>
                        <span className="font-mono font-semibold text-slate-700 text-xs sm:text-sm">{formatDateGregorian(patient?.formatted_date || patient?.pb_now1)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">สถานะแพ้ยา (STS):</span>
                        <div className="flex items-center gap-2">
                            <span className={`font-bold text-xs sm:text-sm ${hasAllergy ? 'text-rose-600 flex items-center gap-1.5' : 'text-[#007A4D] flex items-center gap-1.5'}`}>
                                {hasAllergy ? <><Pill className="h-4 w-4 text-rose-600 fill-rose-100" /> มีประวัติแพ้ยา (Y)</> : <><ShieldCheck className="h-4.5 w-4.5 text-[#00875A] fill-[#E8F8F2]" /> ไม่มีประวัติแพ้ยา (N)</>}
                            </span>
                            {patient?.OP_ALLERGIC && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800 bg-rose-50 rounded-md transition-colors shadow-2xs"
                                    onClick={() => setShowAllergyDetails(!showAllergyDetails)}
                                >
                                    {showAllergyDetails ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Allergy Alert Text if present and opened */}
                {patient?.OP_ALLERGIC && showAllergyDetails && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs sm:text-sm leading-relaxed font-semibold shadow-2xs animate-in fade-in-50 duration-200">
                        <p className="font-bold flex items-center gap-1.5 text-rose-700 mb-1 text-xs shrink-0">
                            <Pill className="h-3.5 w-3.5 text-rose-600 fill-rose-100 shrink-0" /> รายละเอียดการแพ้ยา:
                        </p>
                        <p className="whitespace-pre-wrap">{patient.OP_ALLERGIC}</p>
                    </div>
                )}

                {/* Vitals & Patient Details Summary */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800 text-xs sm:text-sm">สัญญาณชีพและข้อมูลซักประวัติ (Vital Signs)</p>
                        {patient && (
                            <Button
                                type="button"
                                onClick={() => setIsVitalsModalOpen(true)}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px] font-bold text-[#007A4D] hover:bg-[#E8F8F2] rounded-full flex items-center gap-1 cursor-pointer -mr-1"
                            >
                                <Edit3 className="h-3 w-3" />
                                <span>กรอกข้อมูล</span>
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 liquid-glass-box rounded-xl">
                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                <Thermometer className="h-3.5 w-3.5 text-[#00875A]" /> อุณหภูมิ (BT)
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {formatVitalValue(patient?.OP_BT, '°C')}
                            </span>
                        </div>
                        <div className="p-2 liquid-glass-box rounded-xl">
                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                <Weight className="h-3.5 w-3.5 text-[#00875A]" /> น้ำหนัก (BW)
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {formatVitalValue(patient?.OP_WEIGHT, 'Kg')}
                            </span>
                        </div>
                        <div className="p-2 liquid-glass-box rounded-xl">
                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                <Ruler className="h-3.5 w-3.5 text-[#00875A]" /> ส่วนสูง (HT)
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {formatVitalValue(patient?.OP_HIGHT, 'cm')}
                            </span>
                        </div>
                        <div className="p-2 liquid-glass-box rounded-xl">
                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                <Activity className="h-3.5 w-3.5 text-[#00875A]" /> ชีพจร (P)
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {formatVitalValue(patient?.OP_HR, 'bpm')}
                            </span>
                        </div>
                        <div className="p-2 liquid-glass-box rounded-xl">
                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                <HeartPulse className="h-3.5 w-3.5 text-[#00875A]" /> ความดัน (BP)
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {patient?.OP_BP_UP && patient?.OP_BP_DW ? `${cleanDecimals(patient.OP_BP_UP)} / ${cleanDecimals(patient.OP_BP_DW)}` : '-'}
                            </span>
                        </div>
                        <div className="p-2 liquid-glass-box rounded-xl">
                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                <Wind className="h-3.5 w-3.5 text-[#00875A]" /> หายใจ (R)
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {formatVitalValue(patient?.OP_RR || patient?.OP_R, 'bpm')}
                            </span>
                        </div>
                        <div className="p-2 liquid-glass-box rounded-xl">
                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                <Activity className="h-3.5 w-3.5 text-[#00875A]" /> O₂ Sat
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {formatVitalValue(patient?.OP_O2SAT, '%')}
                            </span>
                        </div>
                        {/* อาการเบื้องต้น (Chief Complaint) */}
                        <div className="p-2 liquid-glass-box rounded-xl space-y-0.5">
                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5 truncate">
                                <FileText className="h-3.5 w-3.5 text-[#00875A]" /> อาการเบื้องต้น
                            </span>
                            <span className="font-medium text-xs sm:text-sm text-slate-800 block truncate" title={patient?.OP_CHIEF || patient?.OP_DETAIL || '-'}>
                                {patient?.OP_CHIEF || patient?.OP_DETAIL || '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ผลการวินิจฉัย (Diagnosis) */}
                <div className="p-2 liquid-glass-box rounded-xl space-y-0.5">
                    <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                        <Stethoscope className="h-3.5 w-3.5 text-[#00875A]" /> ผลการวินิจฉัย (Diagnosis)
                    </span>
                    <span className="font-medium text-xs sm:text-sm text-slate-800 block whitespace-pre-wrap">
                        {patient?.OP_DIAG || '-'}
                    </span>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AuthenticatedLayout>
            <Head title={`แก้ไขผลตรวจ X-Ray - ${patient?.fullname || hn}`} />

            <div className="min-h-[calc(100vh-65px)] flex flex-col">

                {/* Top Full-Width Floating Toolbar across 100% of the screen */}
                <div className="px-3.5 pt-3 pb-1.5 shrink-0 z-20 w-full overflow-hidden">
                    <Card className="liquid-glass-card bg-white/95 backdrop-blur-md shadow-sm border border-slate-300/80 rounded-2xl px-3.5 py-1.5 flex items-center justify-between gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full">

                        {/* Left Navigation Group */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* Back Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs font-bold rounded-xl liquid-glass-btn-outline cursor-pointer touch-manipulation flex items-center gap-1 shrink-0"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span>กลับ</span>
                            </Button>

                            {/* Desktop XL Sidebar Toggle Button */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`h-8 px-2.5 text-xs font-bold rounded-xl hidden xl:flex items-center gap-1.5 liquid-glass-btn-outline cursor-pointer touch-manipulation shrink-0 transition-all ${!sidebarOpen ? 'bg-[#E8F8F2] text-[#007A4D] border-[#A7F3D0]' : ''}`}
                                onClick={() => handleSetSidebarOpen((prev) => !prev)}
                                title={sidebarOpen ? "ซ่อนข้อมูลผู้ป่วย" : "แสดงข้อมูลผู้ป่วย"}
                            >
                                {sidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5 text-[#00875A]" />}
                                <span>{sidebarOpen ? "ซ่อนข้อมูล" : "ข้อมูลผู้ป่วย"}</span>
                            </Button>

                            {/* iPad / Tablet Drawer Modal Button */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs font-bold rounded-xl flex xl:hidden items-center gap-1 liquid-glass-btn-outline cursor-pointer touch-manipulation shrink-0"
                                onClick={() => setDrawerOpen(true)}
                                title="ดูข้อมูลรายละเอียดผู้ป่วย"
                            >
                                <UserCheck className="h-3.5 w-3.5 text-[#00875A]" />
                                <span>ข้อมูลผู้ป่วย</span>
                            </Button>
                        </div>

                        {/* Center Formatting & Presets Tools */}
                        <div className={`flex items-center gap-1.5 mx-auto shrink-0 transition-all duration-200 ${!isEditing ? 'pointer-events-none opacity-40 select-none grayscale-[30%]' : ''
                            }`}>
                            {/* Quick Presets Dropdown */}
                            <DropdownMenu open={presetDropdownOpen} onOpenChange={setPresetDropdownOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className={`h-8 px-2.5 text-xs font-bold rounded-xl border-[#A7F3D0] text-[#007A4D] bg-[#E8F8F2] hover:bg-[#E8F8F2]/80 shadow-2xs cursor-pointer flex items-center gap-1.5 touch-manipulation shrink-0 transition-colors ${presetDropdownOpen ? 'bg-[#E8F8F2] border-[#00875A] text-[#004D31] ring-2 ring-[#00875A]/20' : ''
                                            }`}
                                    >
                                        <Sparkles className="h-3.5 w-3.5 text-[#00875A] shrink-0" />
                                        <span>Preset</span>
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 text-[#007A4D] shrink-0 transition-transform duration-300 ease-in-out ${presetDropdownOpen ? 'rotate-180 text-[#004D31]' : 'rotate-0 opacity-70'
                                                }`}
                                        />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-88 max-h-[420px] flex flex-col overflow-hidden p-2 bg-white/95 backdrop-blur-md shadow-xl border border-slate-200 rounded-2xl">
                                    {/* Pinned / Sticky Search Box */}
                                    <div className="p-1 pb-2 shrink-0 border-b border-slate-100/80">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                            <Input
                                                type="text"
                                                placeholder="ค้นหา Preset..."
                                                value={presetSearch}
                                                onChange={(e) => setPresetSearch(e.target.value)}
                                                className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    {/* Scrollable Preset Cards List */}
                                    <div className="space-y-1.5 p-0.5 pt-2 flex-1 min-h-0 overflow-y-auto max-h-80">
                                        {filteredPresets.map((preset) => (
                                            <div
                                                key={preset.id}
                                                onClick={() => insertPreset(preset.text)}
                                                className="w-full h-[88px] text-left p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#00875A] hover:bg-[#E8F8F2]/30 transition-all duration-150 group flex flex-col justify-between cursor-pointer relative overflow-hidden shrink-0"
                                            >
                                                <div className="flex items-center justify-between gap-1 shrink-0">
                                                    <span className="font-bold text-slate-800 group-hover:text-[#007A4D] text-xs flex items-center gap-1 truncate" title={preset.label}>
                                                        <Plus className="h-3 w-3 text-[#00875A] shrink-0" /> {preset.label}
                                                    </span>
                                                    <Badge variant="outline" className="bg-white text-[10px] px-1.5 py-0 text-slate-500 border-slate-200 group-hover:border-[#A7F3D0] group-hover:text-[#007A4D] shrink-0">
                                                        แทรก
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed italic pr-1 overflow-hidden h-[34px]">
                                                    "{preset.text}"
                                                </p>
                                            </div>
                                        ))}
                                        {filteredPresets.length === 0 && (
                                            <div className="p-4 text-center text-xs text-slate-400">
                                                ไม่พบ Preset
                                            </div>
                                        )}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                            {/* Text Formatting Group (B / I / U) - Always visible */}
                            <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 shrink-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 w-7 p-0 rounded-lg transition-colors touch-manipulation ${activeEditor()?.isActive('bold') ? 'bg-[#00875A] text-white font-bold shadow-2xs' : 'text-slate-700 hover:bg-white'}`}
                                    title="ตัวหนา (Ctrl+B)"
                                    onClick={() => activeEditor()?.chain().focus().toggleBold().run()}
                                >
                                    <Bold className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 w-7 p-0 rounded-lg transition-colors touch-manipulation ${activeEditor()?.isActive('italic') ? 'bg-[#00875A] text-white italic shadow-2xs' : 'text-slate-700 hover:bg-white'}`}
                                    title="ตัวเอียง (Ctrl+I)"
                                    onClick={() => activeEditor()?.chain().focus().toggleItalic().run()}
                                >
                                    <Italic className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 w-7 p-0 rounded-lg transition-colors touch-manipulation ${activeEditor()?.isActive('underline') ? 'bg-[#00875A] text-white underline shadow-2xs' : 'text-slate-700 hover:bg-white'}`}
                                    title="ขีดเส้นใต้ (Ctrl+U)"
                                    onClick={() => activeEditor()?.chain().focus().toggleUnderline().run()}
                                >
                                    <UnderlineIcon className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {/* Large Desktop Full Tools (Hidden on screens < xl) */}
                            <div className="hidden xl:flex items-center gap-1.5 shrink-0">
                                <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                                {/* Undo & Redo Group */}
                                <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 rounded-lg text-slate-700 hover:bg-white hover:shadow-2xs touch-manipulation"
                                        title="เลิกทำ (Ctrl+Z)"
                                        onClick={() => activeEditor()?.chain().focus().undo().run()}
                                    >
                                        <Undo2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 rounded-lg text-slate-700 hover:bg-white hover:shadow-2xs touch-manipulation"
                                        title="ทำซ้ำ (Ctrl+Y)"
                                        onClick={() => activeEditor()?.chain().focus().redo().run()}
                                    >
                                        <Redo2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                                {/* Font Size Dropdown */}
                                <DropdownMenu open={fontSizeDropdownOpen} onOpenChange={setFontSizeDropdownOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={`h-7 px-2 text-xs font-bold rounded-lg border border-slate-200/80 bg-slate-100/90 text-slate-800 hover:bg-white shadow-2xs cursor-pointer flex items-center gap-1 touch-manipulation shrink-0 transition-all duration-200 ${fontSizeDropdownOpen ? 'bg-white border-[#00875A]/50 ring-2 ring-[#00875A]/20 shadow-xs' : ''
                                                }`}
                                            title="ขนาดตัวอักษร (Font Size)"
                                        >
                                            <span className="min-w-[1.25rem] text-center font-bold text-slate-800">{activeFontSize}</span>
                                            <ChevronDown
                                                className={`h-3 w-3 text-slate-500 shrink-0 transition-transform duration-300 ease-in-out ${fontSizeDropdownOpen ? 'rotate-180 text-[#00875A]' : 'rotate-0 opacity-70'
                                                    }`}
                                            />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[3.25rem] w-14 max-h-56 overflow-y-auto p-1 bg-white/95 backdrop-blur-md shadow-xl border border-slate-200 rounded-xl animate-in fade-in-50 zoom-in-95 duration-150">
                                        {FONT_SIZES.map((size) => (
                                            <DropdownMenuItem
                                                key={size}
                                                onClick={() => {
                                                    handleSetFontSize(size);
                                                    setFontSizeDropdownOpen(false);
                                                }}
                                                className={`flex items-center justify-center text-xs py-1 px-1 rounded-lg cursor-pointer font-semibold transition-colors ${activeFontSize === size
                                                    ? 'bg-[#00875A] text-white shadow-2xs'
                                                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                                    }`}
                                            >
                                                <span>{size}</span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                                {/* Headings Group */}
                                <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 w-7 p-0 text-xs font-bold rounded-lg transition-colors touch-manipulation ${activeEditor()?.isActive('heading', { level: 1 }) ? 'bg-[#00875A] text-white shadow-2xs' : 'text-slate-700 hover:bg-white'}`}
                                        title="หัวข้อใหญ่ 1"
                                        onClick={() => activeEditor()?.chain().focus().toggleHeading({ level: 1 }).run()}
                                    >
                                        <span className="font-extrabold text-xs">H₁</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 w-7 p-0 text-xs font-bold rounded-lg transition-colors touch-manipulation ${activeEditor()?.isActive('heading', { level: 2 }) ? 'bg-[#00875A] text-white shadow-2xs' : 'text-slate-700 hover:bg-white'}`}
                                        title="หัวข้อรอง 2"
                                        onClick={() => activeEditor()?.chain().focus().toggleHeading({ level: 2 }).run()}
                                    >
                                        <span className="font-extrabold text-xs">H₂</span>
                                    </Button>
                                </div>

                                <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                                {/* Lists Group */}
                                <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 w-7 p-0 rounded-lg transition-colors touch-manipulation ${activeEditor()?.isActive('bulletList') ? 'bg-[#00875A] text-white shadow-2xs' : 'text-slate-700 hover:bg-white'}`}
                                        title="รายการสัญลักษณ์ (Bullet List)"
                                        onClick={() => activeEditor()?.chain().focus().toggleBulletList().run()}
                                    >
                                        <List className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 w-7 p-0 rounded-lg transition-colors touch-manipulation ${activeEditor()?.isActive('orderedList') ? 'bg-[#00875A] text-white shadow-2xs' : 'text-slate-700 hover:bg-white'}`}
                                        title="รายการตัวเลข (Numbered List)"
                                        onClick={() => activeEditor()?.chain().focus().toggleOrderedList().run()}
                                    >
                                        <ListOrdered className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                                {/* Blank Page Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs font-bold rounded-xl border-amber-300 text-amber-800 bg-amber-50/90 hover:bg-amber-100 shadow-2xs cursor-pointer touch-manipulation flex items-center gap-1 shrink-0"
                                    title="เพิ่มหน้ากระดาษใหม่ (Blank Page)"
                                    onClick={handleAddBlankPage}
                                >
                                    <FilePlus className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Blank Page</span>
                                </Button>
                            </div>

                            {/* Small / Tablet Screens Three-Dots More Options Menu (Visible on screens < xl) */}
                            <div className="flex xl:hidden items-center gap-1 shrink-0">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0 rounded-xl border border-slate-200/80 bg-slate-100/90 text-slate-700 hover:bg-white shadow-2xs cursor-pointer flex items-center justify-center touch-manipulation shrink-0 transition-colors"
                                            title="เครื่องมือเพิ่มเติม (More Formatting Tools)"
                                        >
                                            <MoreHorizontal className="h-4 w-4 text-slate-700" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-56 p-1.5 bg-white/95 backdrop-blur-md shadow-xl border border-slate-200 rounded-2xl animate-in fade-in-50 zoom-in-95 duration-150">
                                        {/* Font Size Interactive Toggle */}
                                        <div className="rounded-xl overflow-hidden bg-slate-50/90 border border-slate-200/80 mb-1">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setMoreFontSizeOpen((prev) => !prev);
                                                }}
                                                className="w-full flex items-center justify-between gap-2 text-xs py-2 px-2.5 rounded-lg cursor-pointer font-semibold text-slate-800 hover:bg-white transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Type className="h-3.5 w-3.5 text-[#00875A]" />
                                                    <span>ขนาดตัวอักษร</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-extrabold text-[#00875A] bg-[#E8F8F2] border border-[#A7F3D0] px-2 py-0.5 rounded-md text-[11px]">
                                                        {activeFontSize} pt
                                                    </span>
                                                    <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${moreFontSizeOpen ? 'rotate-180 text-[#00875A]' : ''}`} />
                                                </div>
                                            </button>

                                            {moreFontSizeOpen && (
                                                <div className="p-1.5 pt-0 border-t border-slate-200/60 bg-white grid grid-cols-4 gap-1 max-h-44 overflow-y-auto animate-in fade-in-50 duration-150">
                                                    {FONT_SIZES.map((size) => (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (!isEditing) handleSetIsEditing(true);
                                                                handleSetFontSize(size);
                                                                setMoreFontSizeOpen(false);
                                                            }}
                                                            className={`py-1.5 px-1 text-xs rounded-md font-bold transition-all text-center cursor-pointer ${activeFontSize === size
                                                                ? 'bg-[#00875A] text-white shadow-2xs'
                                                                : 'bg-slate-100/80 text-slate-700 hover:bg-[#E8F8F2] hover:text-[#007A4D]'
                                                                }`}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-px bg-slate-100 my-1" />

                                        {/* Undo & Redo */}
                                        <DropdownMenuItem
                                            onClick={() => activeEditor()?.chain().focus().undo().run()}
                                            className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg cursor-pointer font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            <Undo2 className="h-3.5 w-3.5 text-slate-500" />
                                            <span>เลิกทำ (Undo)</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => activeEditor()?.chain().focus().redo().run()}
                                            className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg cursor-pointer font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            <Redo2 className="h-3.5 w-3.5 text-slate-500" />
                                            <span>ทำซ้ำ (Redo)</span>
                                        </DropdownMenuItem>

                                        <div className="h-px bg-slate-100 my-1" />

                                        {/* Headings */}
                                        <DropdownMenuItem
                                            onClick={() => activeEditor()?.chain().focus().toggleHeading({ level: 1 }).run()}
                                            className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg cursor-pointer font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            <span className="font-extrabold text-xs text-[#00875A] w-4 text-center">H₁</span>
                                            <span>หัวข้อใหญ่ 1</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => activeEditor()?.chain().focus().toggleHeading({ level: 2 }).run()}
                                            className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg cursor-pointer font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            <span className="font-extrabold text-xs text-[#00875A] w-4 text-center">H₂</span>
                                            <span>หัวข้อรอง 2</span>
                                        </DropdownMenuItem>

                                        <div className="h-px bg-slate-100 my-1" />

                                        {/* Lists */}
                                        <DropdownMenuItem
                                            onClick={() => activeEditor()?.chain().focus().toggleBulletList().run()}
                                            className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg cursor-pointer font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            <List className="h-3.5 w-3.5 text-slate-500" />
                                            <span>รายการสัญลักษณ์ (Bullet List)</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => activeEditor()?.chain().focus().toggleOrderedList().run()}
                                            className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg cursor-pointer font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            <ListOrdered className="h-3.5 w-3.5 text-slate-500" />
                                            <span>รายการตัวเลข (Numbered List)</span>
                                        </DropdownMenuItem>

                                        <div className="h-px bg-slate-100 my-1" />

                                        {/* Blank Page */}
                                        <DropdownMenuItem
                                            onClick={handleAddBlankPage}
                                            className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg cursor-pointer font-bold text-amber-800 bg-amber-50/80 hover:bg-amber-100"
                                        >
                                            <FilePlus className="h-3.5 w-3.5 text-amber-600" />
                                            <span>เพิ่มหน้ากระดาษ (Blank Page)</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                        {/* Zoom & Auto-Fit Controls (Always fully clickable in read & edit modes) */}
                        <div className="flex items-center gap-0.5 bg-slate-100/90 border border-slate-200/80 rounded-xl p-0.5 shadow-2xs shrink-0">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg text-slate-700 hover:bg-white hover:shadow-2xs cursor-pointer touch-manipulation"
                                title="ย่อขนาดกระดาษ (75%)"
                                onClick={() => setZoomMode('75')}
                            >
                                <ZoomOut className="h-3 w-3" />
                            </Button>
                            <span className="text-[11px] font-bold px-1 min-w-[2.5rem] text-center text-slate-700 select-none">
                                {Math.round(scale * 100)}%
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg text-slate-700 hover:bg-white hover:shadow-2xs cursor-pointer touch-manipulation"
                                title="ขยายขนาดกระดาษ (100%)"
                                onClick={() => setZoomMode('100')}
                            >
                                <ZoomIn className="h-3 w-3" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-1.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer touch-manipulation ${zoomMode === 'fit' ? 'bg-[#00875A] text-white shadow-2xs' : 'text-slate-700 hover:bg-white'}`}
                                title="ปรับพอดีหน้าจอ iPad/Tablet อัตโนมัติ"
                                onClick={() => setZoomMode(zoomMode === 'fit' ? '100' : 'fit')}
                            >
                                Fit
                            </Button>
                        </div>

                        {/* Right Actions, Edit, Save & Print */}
                        <div className="flex items-center gap-1.5 shrink-0">

                            {!isEditing ? (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        handleSetIsEditing(true);
                                        setFocusPage(0);
                                        setFocusNonce((n) => n + 1);
                                        setFocusMode('end');
                                    }}
                                    size="sm"
                                    className="h-8 px-3.5 liquid-glass-btn-primary text-white font-bold rounded-xl text-xs shadow-md cursor-pointer touch-manipulation flex items-center gap-1.5 shrink-0 transition-all active:scale-95 animate-in fade-in duration-200"
                                    title="เปิดโหมดแก้ไขเอกสาร"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    <span>แก้ไข</span>
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                        className="h-8 px-2.5 text-xs font-bold rounded-xl text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer touch-manipulation flex items-center gap-1 shrink-0 transition-all"
                                        title="ยกเลิกการแก้ไข (สลับสู่โหมดอ่าน)"
                                    >
                                        <X className="h-3.5 w-3.5 text-slate-500" />
                                        <span>ยกเลิก</span>
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={() => handleSave()}
                                        disabled={isSaving}
                                        size="sm"
                                        className="h-8 px-3.5 liquid-glass-btn-primary text-white font-bold rounded-xl text-xs shadow-md cursor-pointer touch-manipulation flex items-center gap-1.5 shrink-0 transition-all active:scale-95 disabled:opacity-90"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Save className="h-3.5 w-3.5" />
                                        )}
                                        <span>บันทึก</span>
                                    </Button>
                                </>
                            )}

                            <Button
                                type="button"
                                onClick={handleOpenPdf}
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 liquid-glass-btn-outline text-slate-800 font-bold rounded-xl text-xs cursor-pointer touch-manipulation flex items-center gap-1 shrink-0"
                            >
                                <Printer className="h-3.5 w-3.5 text-[#00875A]" />
                                <span>Print</span>
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Main Content Underneath Toolbar */}
                <div className="flex-1 flex gap-3.5 px-3.5 pt-1.5 pb-3.5 overflow-hidden min-h-0">

                    {/* Left Sidebar (Desktop XL only): Patient Profile Card */}
                    <div
                        className={`hidden xl:flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${sidebarOpen ? 'w-96 opacity-100 mr-0' : 'w-0 opacity-0 -mr-3.5 pointer-events-none'
                            }`}
                    >
                        <div className="w-96 h-full overflow-hidden flex flex-col">
                            {renderPatientProfileCard(false)}
                        </div>
                    </div>

                    {/* Middle: Editor Paper Canvas Card (Flex-1, background expands to 100%, paper stays fixed 804px width in center) */}
                    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 ease-in-out">
                        <Card className="overflow-hidden rounded-2xl h-full flex flex-col border-slate-300/60 shadow-sm bg-slate-200/40">
                            {/* Editor Content Area: stacked Google Docs paper pages with responsive scale */}
                            <div
                                ref={containerRef}
                                className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-300/30 flex flex-col items-center ${zoomMode === 'fit' ? 'overflow-x-hidden' : 'overflow-x-auto'}`}
                                style={{ WebkitOverflowScrolling: 'touch' }}
                            >
                                <div
                                    style={{
                                        width: scale !== 1 ? `${Math.round(PAPER_WIDTH * scale)}px` : `${PAPER_WIDTH}px`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <div
                                        className={`flex flex-col items-center gap-8 origin-top ${selectAllActive ? 'xray-select-all' : ''}`}
                                        style={{
                                            transform: scale !== 1 ? `scale(${scale})` : undefined,
                                            transformOrigin: 'top center',
                                            width: PAPER_WIDTH,
                                            marginBottom: scale < 1 ? `-${Math.round((1 - scale) * (pages.length * (CARD_HEIGHT + 60)))}px` : undefined,
                                        }}
                                    >
                                        {pages.map((text, i) => (
                                            <div key={i} id={`xray-page-container-${i}`} className="flex flex-col items-center group shrink-0">
                                                {/* Page Container Header Tag */}
                                                <div className="w-full flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1.5 px-1">
                                                    <span className="text-slate-800 font-bold">ผลตรวจ X-Ray — หน้า {i + 1}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="liquid-glass-box text-slate-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                                            หน้า {i + 1} / {pages.length}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Google Docs Paper Card */}
                                                <div
                                                    className={`bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-300/80 rounded-md relative transition-shadow group-hover:shadow-[0_12px_36px_rgba(0,0,0,0.16)] shrink-0 ${isEditing ? 'cursor-text' : 'cursor-default'}`}
                                                    onClick={() => {
                                                        if (!isEditing) return;
                                                        const ed = editorsRef.current[i];
                                                        if (ed) {
                                                            ed.commands.focus();
                                                            setActivePage(i);
                                                        }
                                                    }}
                                                    style={{
                                                        width: PAPER_WIDTH,
                                                        height: CARD_HEIGHT,
                                                        maxHeight: CARD_HEIGHT,
                                                        minHeight: CARD_HEIGHT,
                                                        padding: `${CARD_PADDING_Y}px ${CARD_PADDING_X}px`,
                                                        overflow: 'hidden',
                                                        boxSizing: 'border-box',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <PageEditor
                                                        index={i}
                                                        html={text}
                                                        onHtml={(h) => {
                                                            flushSync(() => {
                                                                flushPage(i, h);
                                                            });
                                                        }}
                                                        onFocusChange={() => {
                                                            setActivePage(i);
                                                            updateActiveFontSize();
                                                        }}
                                                        register={setEditor}
                                                        focusSignal={focusPage}
                                                        focusNonce={focusNonce}
                                                        focusMode={focusMode}
                                                        pageHeight={EDITOR_HEIGHT}
                                                        onBackspaceAtStart={handleBackspaceAtStart}
                                                        onEnterAtEnd={handleEnterAtEnd}
                                                        selectAllActiveRef={selectAllActiveRef}
                                                        onSelectAll={selectAllFnRef.current}
                                                        onGlobalEdit={globalEditFnRef.current}
                                                        onCopyAll={copyAllFnRef.current}
                                                        onClearSelectAll={() => {
                                                            selectAllActiveRef.current = false;
                                                            setSelectAllActive(false);
                                                        }}
                                                        enterSignalRef={enterSignalRef}
                                                        onFocused={() => setFocusPage(null)}
                                                        editable={isEditing}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Stats Footer inside Card */}
                            <div className="px-4 py-2 shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-xs flex items-center justify-center text-xs text-slate-600 font-medium">
                                <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
                                    <span className="flex items-center gap-1.5 text-slate-700">
                                        <FileText className="h-3.5 w-3.5 text-[#00875A]" />
                                        <strong className="text-slate-900 font-bold">{wordCount.toLocaleString()}</strong> คำ (Words)
                                    </span>
                                    <span className="h-3.5 w-px bg-slate-300/80 hidden sm:inline-block" />
                                    <span className="flex items-center gap-1.5 text-slate-700">
                                        <Type className="h-3.5 w-3.5 text-[#00875A]" />
                                        <strong className="text-slate-900 font-bold">{charCount.toLocaleString()}</strong> ตัวอักษร (Characters)
                                    </span>
                                    <span className="h-3.5 w-px bg-slate-300/80 hidden sm:inline-block" />
                                    <span className="flex items-center gap-1.5 text-slate-700">
                                        <Layers className="h-3.5 w-3.5 text-[#00875A]" />
                                        <strong className="text-slate-900 font-bold">{pages.length}</strong> หน้า (Pages)
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* iPad / Tablet Drawer Modal */}
                    <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
                        <DialogContent className="max-w-md w-[92vw] sm:w-[420px] max-h-[85vh] p-0 overflow-hidden rounded-2xl">
                            {renderPatientProfileCard(true)}
                        </DialogContent>
                    </Dialog>

                    {/* Right Sidebar: Presets / Templates Card (Fixed Width: 300px, Full Height) */}
                    <div className="w-76 shrink-0 flex flex-col h-full overflow-hidden">
                        <Card className="overflow-hidden rounded-2xl h-full flex flex-col border-slate-300/60 shadow-sm">
                            <CardHeader className="p-3 shrink-0 border-b border-slate-100 flex flex-row items-center justify-between">
                                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-[#00875A]" />
                                    Preset
                                </CardTitle>
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 px-2.5 text-[11px] liquid-glass-btn-primary text-white font-bold rounded-lg flex items-center gap-0.5 shadow-md cursor-pointer"
                                        onClick={() => setIsAddPresetOpen(true)}
                                    >
                                        <Plus className="h-3 w-3" /> เพิ่ม
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                                        title="รีเซ็ตเป็นค่าเริ่มต้น"
                                        onClick={handleResetPresets}
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="p-3 space-y-2.5 text-xs flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="relative shrink-0">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder="ค้นหา Preset..."
                                        value={presetSearch}
                                        onChange={(e) => setPresetSearch(e.target.value)}
                                        className="pl-8 h-8 text-[11px] rounded-lg"
                                    />
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 shrink-0">
                                    <span>คลิกเพื่อแทรกข้อความ:</span>
                                    <span className="text-[10px] liquid-glass-box text-[#007A4D] bg-[#E8F8F2] border border-[#A7F3D0] px-2 py-0.5 rounded-full font-bold">
                                        {filteredPresets.length} รายการ
                                    </span>
                                </div>

                                <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-0.5">
                                    {filteredPresets.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 text-center py-4">
                                            ไม่พบข้อความที่ค้นหา
                                        </p>
                                    ) : (
                                        filteredPresets.map((p) => (
                                            <div
                                                key={p.id}
                                                onClick={() => insertPreset(p.text)}
                                                className="w-full h-[88px] text-left p-2.5 rounded-xl liquid-glass-box hover:border-[#00875A] hover:bg-[#E8F8F2]/30 transition-all duration-150 group flex flex-col justify-between cursor-pointer relative overflow-hidden shrink-0"
                                            >
                                                <div className="flex items-center justify-between gap-1 shrink-0">
                                                    <span className="font-bold text-slate-800 group-hover:text-[#007A4D] text-xs flex items-center gap-1 truncate" title={p.label}>
                                                        <Plus className="h-3 w-3 text-[#00875A] shrink-0" /> {p.label}
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Badge variant="outline" className="bg-white text-[10px] px-1.5 py-0 text-slate-500 border-slate-200 group-hover:border-[#A7F3D0] group-hover:text-[#007A4D]">
                                                            แทรก
                                                        </Badge>
                                                        {p.id.startsWith('db_') ? null : (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDeletePreset(p.id, e)}
                                                                className="h-5 w-5 rounded p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                                                                title="ลบข้อความส่วนตัวนี้"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed italic pr-1 overflow-hidden h-[34px]">
                                                    "{p.text}"
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Modal Form for Adding Custom Preset */}
            <Dialog open={isAddPresetOpen} onOpenChange={setIsAddPresetOpen}>
                <DialogContent className="sm:max-w-2xl w-full bg-white rounded-2xl p-7 shadow-2xl border border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Sparkles className="h-5 w-5 text-[#00875A]" />
                            เพิ่ม Preset ใหม่ (Custom Preset)
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAddPreset} className="space-y-5 pt-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700">
                                ชื่อปุ่ม / หัวข้อข้อความ <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                type="text"
                                required
                                value={newPresetLabel}
                                onChange={(e) => setNewPresetLabel(e.target.value)}
                                placeholder="เช่น: ปอดอักเสบ (Pneumonia) หรือ Upper Abdomen Normal"
                                className="h-10 text-sm bg-white font-medium border-slate-300 rounded-xl focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700">
                                รายละเอียดข้อความผลตรวจที่จะแทรก <span className="text-rose-500">*</span>
                            </Label>
                            <textarea
                                required
                                rows={8}
                                value={newPresetText}
                                onChange={(e) => setNewPresetText(e.target.value)}
                                placeholder="เช่น:&#10;Liver: Normal / Fatty change&#10;Gallbladder: Normal&#10;สรุปผล: ไม่พบความผิดปกติ"
                                className="w-full text-sm p-4 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/20 font-sans leading-relaxed"
                            />
                        </div>

                        <DialogFooter className="flex gap-2 pt-3 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddPresetOpen(false)}
                                className="h-10 px-5 text-sm font-bold rounded-xl border-slate-300 hover:bg-slate-100"
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                type="submit"
                                className="h-10 px-6 liquid-glass-btn-primary text-white text-sm font-bold rounded-xl shadow-sm"
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                บันทึกข้อความสำเร็จรูป
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Unsaved Changes Navigation Guard Modal */}
            <Dialog open={Boolean(pendingNav)} onOpenChange={(open) => { if (!open) setPendingNav(null); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ยังไม่ได้บันทึกผลตรวจ
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-sm text-slate-600">
                        มีข้อความผลตรวจที่ยังไม่ได้บันทึก ต้องการดำเนินการอย่างไร?
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingNav(null)}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                try {
                                    localStorage.removeItem(draftKey);
                                } catch (err) { }
                                const nav = pendingNav;
                                setPendingNav(null);
                                nav?.();
                            }}
                        >
                            ออกโดยไม่บันทึก
                        </Button>
                        <Button
                            size="sm"
                            className="liquid-glass-btn-primary text-white font-bold"
                            onClick={() => {
                                const nav = pendingNav;
                                setPendingNav(null);
                                handleSave(() => nav?.());
                            }}
                        >
                            <Save className="h-4 w-4 mr-1.5" />
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bottom-Right Sliding 3D Liquid Glass Toast Notification with Slide Up & Down Animation */}
            {toastVisible && (
                <div
                    className={`fixed bottom-7 right-7 z-50 pointer-events-none transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${toastActive
                            ? 'translate-y-0 opacity-100 scale-100'
                            : 'translate-y-12 opacity-0 scale-95'
                        }`}
                >
                    <div className="flex flex-col liquid-glass-toast text-slate-800 px-6 py-3.5 rounded-2xl sm:rounded-3xl shadow-2xl pointer-events-auto min-w-[260px] sm:min-w-[300px]">
                        <span className="text-[15px] sm:text-base font-extrabold text-slate-900 tracking-tight">
                            บันทึกสำเร็จ
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                            บันทึกผลการตรวจเรียบร้อยแล้ว
                        </span>
                    </div>
                </div>
            )}

            {/* Patient Vitals & Clinical Info Modal */}
            <PatientVitalsModal
                open={isVitalsModalOpen}
                onOpenChange={setIsVitalsModalOpen}
                patient={patient}
                onSuccess={() => {
                    // Inertia will reload page props automatically on post
                }}
            />
        </AuthenticatedLayout>
    );
}
