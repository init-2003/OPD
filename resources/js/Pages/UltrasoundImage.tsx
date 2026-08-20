import React, { useState, useRef, useMemo, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import { PatientVisit } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/Components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/Components/ui/dropdown-menu';
import {
    ArrowLeft,
    UploadCloud,
    FileImage,
    Trash2,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    Edit3,
    FileText,
    User,
    Eye,
    Maximize2,
    Printer,
    Plus,
    CheckSquare,
    Square,
    Check,
    RefreshCw,
    ChevronDown,
    UserCheck,
    Camera,
    Pill,
    ShieldCheck,
    Thermometer,
    Weight,
    Ruler,
    Activity,
    HeartPulse,
    Wind,
    Stethoscope,
    Calendar,
    FolderOpen,
    Layers,
    ImageIcon,
    CheckCheck,
    Filter,
    ExternalLink,
} from 'lucide-react';
import { formatVitalValue, cleanDecimals, formatPatientAge } from '@/lib/utils';

export interface XrayImageItem {
    id: string;
    filename: string;
    url: string;
    size: string;
    category?: string;
    uploaded_at: string;
    vt_id?: number | null;
    vt_no?: number | null;
    full_path?: string;
}

export interface VisitItem {
    VT_ID: number;
    VT_NO: number;
    op_hn: string;
    pb_now1?: string;
    formatted_date?: string;
    OP_SEND_DR_Name?: string;
    OP_SEND_DR?: string;
    OP_CHIEF?: string;
    OP_DIAG?: string;
    OP_DETAIL?: string;
    image_count?: number;
    [key: string]: any;
}

interface UltrasoundImageProps {
    patient: PatientVisit | null;
    visits?: VisitItem[];
    allImages?: XrayImageItem[];
    unassignedXrayImages?: XrayImageItem[];
    defaultVtNo?: number | null;
    defaultVtId?: number | null;
    hn: string;
}

export default function UltrasoundImage({
    patient,
    visits = [],
    allImages = [],
    unassignedXrayImages = [],
    defaultVtNo = null,
    defaultVtId = null,
    hn,
}: UltrasoundImageProps) {
    const fromParam = new URLSearchParams(window.location.search).get('from') || '';

    // Multi-select Visits State: Array of selected VT_NOs (or 'unassigned')
    // Restores from URL query params (?vt=23 or ?vts=23,24) and sessionStorage on refresh
    const [selectedVtNos, setSelectedVtNos] = useState<(number | 'unassigned')[]>(() => {
        if (typeof window === 'undefined') return [];
        const urlParams = new URLSearchParams(window.location.search);
        const queryVts = urlParams.get('vts');
        if (queryVts) {
            const parsed = queryVts
                .split(',')
                .map((s) => s.trim() === 'unassigned' ? 'unassigned' : Number(s.trim()))
                .filter((x) => x === 'unassigned' || (!isNaN(x) && x > 0)) as (number | 'unassigned')[];
            if (parsed.length > 0) return parsed;
        }
        const queryVt = urlParams.get('vt');
        if (queryVt) {
            if (queryVt === 'unassigned') return ['unassigned'];
            const num = Number(queryVt);
            if (!isNaN(num) && num > 0) return [num];
        }
        try {
            const saved = sessionStorage.getItem(`xray_selected_vts_${hn}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { }
        if (defaultVtNo !== null && defaultVtNo !== undefined && Number(defaultVtNo) > 0) {
            return [Number(defaultVtNo)];
        }
        return [];
    });

    // Synchronize selected visits to URL query string and sessionStorage on changes so refresh preserves them
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        if (selectedVtNos.length === 0) {
            url.searchParams.delete('vt');
            url.searchParams.delete('vts');
        } else if (selectedVtNos.length === 1) {
            url.searchParams.set('vt', String(selectedVtNos[0]));
            url.searchParams.delete('vts');
        } else {
            url.searchParams.set('vts', selectedVtNos.join(','));
            url.searchParams.delete('vt');
        }
        window.history.replaceState({}, '', url.toString());
        try {
            if (selectedVtNos.length > 0) {
                sessionStorage.setItem(`xray_selected_vts_${hn}`, JSON.stringify(selectedVtNos));
            } else {
                sessionStorage.removeItem(`xray_selected_vts_${hn}`);
            }
        } catch (e) { }
    }, [selectedVtNos, hn]);

    // Toggle a single visit selection
    const handleToggleVisit = (vtNo: number | 'unassigned') => {
        setSelectedVtNos((prev) => {
            if (prev.includes(vtNo)) {
                return prev.filter((item) => item !== vtNo);
            } else {
                return [...prev, vtNo];
            }
        });
    };

    // Select ALL visits
    const handleSelectAllVisits = () => {
        const allNos: (number | 'unassigned')[] = visits.map((v) => Number(v.VT_NO));
        if (unassignedXrayImages.length > 0) {
            allNos.push('unassigned');
        }
        if (selectedVtNos.length === allNos.length) {
            setSelectedVtNos([]);
        } else {
            setSelectedVtNos(allNos);
        }
    };

    // Select ONLY one visit
    const handleSelectOnlyVisit = (vtNo: number | 'unassigned') => {
        setSelectedVtNos([vtNo]);
        const url = new URL(window.location.href);
        if (vtNo === 'unassigned') {
            url.searchParams.delete('vt');
        } else {
            url.searchParams.set('vt', String(vtNo));
        }
        window.history.replaceState({}, '', url.toString());
    };

    const handleBack = () => {
        try {
            sessionStorage.removeItem(`xray_selected_imgs_${hn}`);
            sessionStorage.removeItem(`xray_selection_mode_${hn}`);
        } catch (e) { }
        const firstVt = typeof selectedVtNos[0] === 'number' ? selectedVtNos[0] : (visits[0]?.VT_NO || '');
        router.visit(route('patient.show', {
            hn: patient?.op_hn || hn,
            vt: firstVt,
            ...(fromParam ? { from: fromParam } : {}),
        }));
    };

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadTargetVtNo, setUploadTargetVtNo] = useState<number | ''>(() => {
        const first = selectedVtNos.find((item) => typeof item === 'number') as number | undefined;
        return first || defaultVtNo || (visits[0]?.VT_NO ?? '');
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Bottom-Right 3D Liquid Glass Toast State
    const [toastVisible, setToastVisible] = useState(false);
    const [toastActive, setToastActive] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ title: string; desc: string }>({ title: '', desc: '' });
    const toastTimerRef = useRef<{ hide?: NodeJS.Timeout; unmount?: NodeJS.Timeout }>({});

    const triggerToast = (title: string, desc: string) => {
        if (toastTimerRef.current.hide) clearTimeout(toastTimerRef.current.hide);
        if (toastTimerRef.current.unmount) clearTimeout(toastTimerRef.current.unmount);

        setToastMessage({ title, desc });
        setToastVisible(true);
        requestAnimationFrame(() => {
            setToastActive(true);
        });

        toastTimerRef.current.hide = setTimeout(() => {
            setToastActive(false);
            toastTimerRef.current.unmount = setTimeout(() => {
                setToastVisible(false);
            }, 400);
        }, 2800);
    };

    // Open upload modal pre-selected to a specific visit with optional initial dropped files
    const handleOpenUploadForVisit = (vtNo?: number, filesToAdd?: File[]) => {
        if (vtNo) {
            setUploadTargetVtNo(vtNo);
        } else {
            const first = selectedVtNos.find((item) => typeof item === 'number') as number | undefined;
            if (first) {
                setUploadTargetVtNo(first);
            } else if (visits.length > 0) {
                setUploadTargetVtNo(visits[0].VT_NO);
            }
        }
        if (filesToAdd && filesToAdd.length > 0) {
            setSelectedFiles(filesToAdd);
        } else {
            setSelectedFiles([]);
        }
        setUploadError('');
        setUploadProgress(0);
        setIsUploadModalOpen(true);
    };

    const handleDropOnVisit = (e: React.DragEvent, vtNo: number) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

        const validFiles: File[] = [];
        Array.from(e.dataTransfer.files).forEach((file) => {
            if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)) {
                validFiles.push(file);
            }
        });

        if (validFiles.length > 0) {
            handleOpenUploadForVisit(vtNo, validFiles);
        }
    };

    // Multi-select for PDF printing state - Restores from sessionStorage on refresh
    const [selectedImageFilenames, setSelectedImageFilenames] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = sessionStorage.getItem(`xray_selected_imgs_${hn}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { }
        return [];
    });

    const [isSelectionMode, setIsSelectionMode] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        try {
            const saved = sessionStorage.getItem(`xray_selection_mode_${hn}`);
            if (saved === 'true') return true;
        } catch (e) { }
        return false;
    });

    // Sync selected images and selection mode to sessionStorage so browser refresh preserves them
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            if (isSelectionMode) {
                sessionStorage.setItem(`xray_selection_mode_${hn}`, 'true');
            } else {
                sessionStorage.removeItem(`xray_selection_mode_${hn}`);
            }
            if (selectedImageFilenames.length > 0) {
                sessionStorage.setItem(`xray_selected_imgs_${hn}`, JSON.stringify(selectedImageFilenames));
            } else {
                sessionStorage.removeItem(`xray_selected_imgs_${hn}`);
            }
        } catch (e) { }
    }, [selectedImageFilenames, isSelectionMode, hn]);

    // Clear selection state when navigating away to another page in the SPA
    useEffect(() => {
        const removeListener = router.on('start', (event) => {
            const targetUrl = new URL(event.detail.visit.url.href, window.location.origin);
            if (targetUrl.pathname !== window.location.pathname) {
                try {
                    sessionStorage.removeItem(`xray_selection_mode_${hn}`);
                    sessionStorage.removeItem(`xray_selected_imgs_${hn}`);
                } catch (e) { }
            }
        });
        return () => removeListener();
    }, [hn]);

    const [layoutPerPage, setLayoutPerPage] = useState<1 | 2 | 4 | 6>(() => {
        const v = Number(new URLSearchParams(window.location.search).get('layout'));
        return v === 2 || v === 4 || v === 6 ? (v as 1 | 2 | 4 | 6) : 1;
    });

    // Lightbox & Image Preview State
    const [activeImage, setActiveImage] = useState<XrayImageItem | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isNoTransition, setIsNoTransition] = useState(false);
    const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const dragStartRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number }>({
        startX: 0,
        startY: 0,
        startPanX: 0,
        startPanY: 0,
    });
    const pinchStartDistRef = useRef<number>(0);
    const pinchStartZoomRef = useRef<number>(1);
    const isPinchingRef = useRef<boolean>(false);
    const lastTapTimeRef = useRef<number>(0);

    // Delete Confirmation State
    const [deletingImage, setDeletingImage] = useState<XrayImageItem | null>(null);
    const [deletingSelected, setDeletingSelected] = useState(false);

    // Right-Click Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        image: XrayImageItem | null;
        visitVtNo?: number;
    }>({
        isOpen: false,
        x: 0,
        y: 0,
        image: null,
    });

    const handleContextMenu = (e: React.MouseEvent, img: XrayImageItem, visitVtNo?: number) => {
        e.preventDefault();
        e.stopPropagation();

        const menuWidth = 190;
        const menuHeight = 135;
        const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
        const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

        setContextMenu({
            isOpen: true,
            x: Math.max(12, x),
            y: Math.max(12, y),
            image: img,
            visitVtNo,
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };

    // Long Press Handler for iPad & Touch Devices
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const isLongPressTriggeredRef = useRef<boolean>(false);

    const handleTouchStart = (e: React.TouchEvent, img: XrayImageItem, visitVtNo?: number) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        isLongPressTriggeredRef.current = false;

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = setTimeout(() => {
            isLongPressTriggeredRef.current = true;
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(40); } catch (err) { }
            }

            const menuWidth = 190;
            const menuHeight = 135;
            const x = Math.min(touch.clientX, window.innerWidth - menuWidth - 12);
            const y = Math.min(touch.clientY, window.innerHeight - menuHeight - 12);

            setContextMenu({
                isOpen: true,
                x: Math.max(12, x),
                y: Math.max(12, y),
                image: img,
                visitVtNo,
            });
        }, 480); // 480ms standard iPad long-press duration
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!longPressTimerRef.current) return;
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
            const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
            // Cancel long-press if moved more than 8px (user is scrolling)
            if (dx > 8 || dy > 8) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    useEffect(() => {
        if (!contextMenu.isOpen) return;

        const handleOutsideClick = () => {
            handleCloseContextMenu();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleCloseContextMenu();
            }
        };

        window.addEventListener('click', handleOutsideClick);
        window.addEventListener('contextmenu', handleOutsideClick);
        window.addEventListener('scroll', handleOutsideClick, true);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('click', handleOutsideClick);
            window.removeEventListener('contextmenu', handleOutsideClick);
            window.removeEventListener('scroll', handleOutsideClick, true);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [contextMenu.isOpen]);

    // Filtered selected visits objects
    const selectedVisitsList = useMemo(() => {
        return visits.filter((v) => selectedVtNos.includes(Number(v.VT_NO)));
    }, [visits, selectedVtNos]);

    const isUnassignedSelected = selectedVtNos.includes('unassigned');

    // Get images for a specific visit
    const getImagesForVisit = (v: VisitItem) => {
        const vVtId = Number(v.VT_ID || 0);
        const vVtNo = Number(v.VT_NO || 0);

        return allImages.filter((img) => {
            const imgVtId = img.vt_id ? Number(img.vt_id) : null;
            const imgVtNo = img.vt_no ? Number(img.vt_no) : null;
            return (imgVtId && vVtId && imgVtId === vVtId) || (imgVtNo && vVtNo && imgVtNo === vVtNo);
        });
    };

    // Total displayed photos across all selected visits
    const allVisibleImages = useMemo(() => {
        const list: XrayImageItem[] = [];
        selectedVisitsList.forEach((v) => {
            list.push(...getImagesForVisit(v));
        });
        if (isUnassignedSelected) {
            list.push(...unassignedXrayImages);
        }
        return list;
    }, [selectedVisitsList, isUnassignedSelected, allImages, unassignedXrayImages]);

    // Automatically exit selection mode if all visible images are deleted or none available
    useEffect(() => {
        if (allVisibleImages.length === 0 && isSelectionMode) {
            setIsSelectionMode(false);
            setSelectedImageFilenames([]);
            try {
                sessionStorage.removeItem(`xray_selection_mode_${hn}`);
                sessionStorage.removeItem(`xray_selected_imgs_${hn}`);
            } catch (e) { }
        }
    }, [allVisibleImages.length, isSelectionMode, hn]);

    // Filter out any stale selected filenames that no longer exist
    useEffect(() => {
        if (selectedImageFilenames.length > 0) {
            const existing = new Set(allImages.map((img) => img.filename));
            setSelectedImageFilenames((prev) => {
                const filtered = prev.filter((f) => existing.has(f));
                return filtered.length !== prev.length ? filtered : prev;
            });
        }
    }, [allImages]);

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;
        const validFiles: File[] = [];
        Array.from(files).forEach((file) => {
            if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)) {
                validFiles.push(file);
            }
        });

        if (validFiles.length > 0) {
            setSelectedFiles((prev) => [...prev, ...validFiles]);
        }
    };

    const handleRemoveSelectedFile = (idx: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    // Submit Upload via Axios without full page reload
    const handleSubmitUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);
        setUploadError('');

        // Find target visit object
        const targetVisit = visits.find((v) => Number(v.VT_NO) === Number(uploadTargetVtNo));
        const targetVtId = targetVisit ? targetVisit.VT_ID : '';

        const formData = new FormData();
        selectedFiles.forEach((file) => {
            formData.append('images[]', file);
        });
        if (targetVtId) formData.append('vt_id', String(targetVtId));
        if (uploadTargetVtNo) formData.append('vt_no', String(uploadTargetVtNo));

        try {
            await axios.post(
                route('patient.ultrasound.upload.store', {
                    hn: patient?.op_hn || hn,
                    vt: uploadTargetVtNo || '',
                }),
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            setUploadProgress(percent);
                        }
                    },
                }
            );

            setIsUploading(false);
            setSelectedFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsUploadModalOpen(false);
            if (uploadTargetVtNo && !selectedVtNos.includes(Number(uploadTargetVtNo))) {
                setSelectedVtNos((prev) => [...prev, Number(uploadTargetVtNo)]);
            }

            // Refresh data in background without triggering full-page navigation or skeleton
            router.reload({
                only: ['allImages', 'unassignedXrayImages', 'visits'],
            });

            triggerToast('อัปโหลดรูปภาพสำเร็จ', 'อัปโหลดรูปภาพ X-Ray / Ultrasound เรียบร้อยแล้ว');
        } catch (err: any) {
            setIsUploading(false);
            const msg = err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองใหม่อีกครั้ง';
            setUploadError(msg);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingImage) return;
        const targetFilename = deletingImage.filename;
        try {
            await axios.post(
                route('patient.ultrasound.image.delete', { hn: patient?.op_hn || hn }),
                { filename: targetFilename }
            );
            setDeletingImage(null);
            setSelectedImageFilenames((prev) => prev.filter((f) => f !== targetFilename));
            router.reload({
                only: ['allImages', 'unassignedXrayImages', 'visits'],
            });
            triggerToast('ลบรูปภาพสำเร็จ', 'ลบรูปภาพ X-Ray / Ultrasound เรียบร้อยแล้ว');
        } catch (e) {
            setDeletingImage(null);
        }
    };

    const handleDeleteSelectedConfirm = async () => {
        if (selectedImageFilenames.length === 0) return;
        const count = selectedImageFilenames.length;
        try {
            await axios.post(
                route('patient.ultrasound.image.delete', { hn: patient?.op_hn || hn }),
                { filenames: selectedImageFilenames }
            );
            setDeletingSelected(false);
            setSelectedImageFilenames([]);
            setIsSelectionMode(false);
            try {
                sessionStorage.removeItem(`xray_selection_mode_${hn}`);
                sessionStorage.removeItem(`xray_selected_imgs_${hn}`);
            } catch (e) { }
            router.reload({
                only: ['allImages', 'unassignedXrayImages', 'visits'],
            });
            triggerToast('ลบรูปภาพสำเร็จ', `ลบรูปภาพทั้งหมด ${count} รูป เรียบร้อยแล้ว`);
        } catch (e) {
            setDeletingSelected(false);
        }
    };

    const handleOpenLightbox = (img: XrayImageItem) => {
        setActiveImage(img);
        setZoomLevel(1);
        setRotation(0);
        setPanPosition({ x: 0, y: 0 });
        setIsNoTransition(true);
        requestAnimationFrame(() => {
            setIsNoTransition(false);
        });
    };

    const handleRotate = () => {
        setIsNoTransition(false);
        setRotation((prev) => prev + 90);
    };

    const handleResetImage = () => {
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });

        if (rotation % 360 === 0) {
            // Already upright (0°, 360°, 720°...) -> do not animate spin, stay still
            setIsNoTransition(true);
            setRotation(0);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsNoTransition(false);
                });
            });
        } else {
            // Tilted (e.g. 90°, 180°, 270°) -> smoothly rotate back to 0°
            const normalized = ((rotation % 360) + 360) % 360;
            if (normalized !== rotation) {
                setIsNoTransition(true);
                setRotation(normalized);
                requestAnimationFrame(() => {
                    setIsNoTransition(false);
                    requestAnimationFrame(() => {
                        setRotation(0);
                    });
                });
            } else {
                setIsNoTransition(false);
                setRotation(0);
            }
        }
    };

    const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY < 0) {
            setZoomLevel((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 8));
        } else {
            setZoomLevel((prev) => {
                const next = Math.max(Number((prev - 0.15).toFixed(2)), 0.1);
                if (next <= 1) setPanPosition({ x: 0, y: 0 });
                return next;
            });
        }
    };

    const handleImageMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if (zoomLevel <= 1) return;
        e.preventDefault();
        setIsDraggingImage(true);
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startPanX: panPosition.x,
            startPanY: panPosition.y,
        };
    };

    const handleDoubleTap = () => {
        if (zoomLevel > 1) {
            setZoomLevel(1);
            setPanPosition({ x: 0, y: 0 });
        } else {
            setZoomLevel(2.5);
        }
    };

    const handleImageTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Two-finger pinch-to-zoom
            isPinchingRef.current = true;
            setIsDraggingImage(false);
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            pinchStartDistRef.current = dist > 0 ? dist : 1;
            pinchStartZoomRef.current = zoomLevel;
        } else if (e.touches.length === 1) {
            isPinchingRef.current = false;
            const touch = e.touches[0];
            const now = Date.now();

            // Double tap detection (< 300ms)
            if (now - lastTapTimeRef.current < 300) {
                handleDoubleTap();
                lastTapTimeRef.current = 0;
                return;
            }
            lastTapTimeRef.current = now;

            setIsDraggingImage(true);
            dragStartRef.current = {
                startX: touch.clientX,
                startY: touch.clientY,
                startPanX: panPosition.x,
                startPanY: panPosition.y,
            };
        }
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDraggingImage) return;
            const dx = e.clientX - dragStartRef.current.startX;
            const dy = e.clientY - dragStartRef.current.startY;
            setPanPosition({
                x: dragStartRef.current.startPanX + dx,
                y: dragStartRef.current.startPanY + dy,
            });
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && isPinchingRef.current) {
                if (e.cancelable) e.preventDefault();
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const scale = dist / pinchStartDistRef.current;
                const nextZoom = Math.min(Math.max(Number((pinchStartZoomRef.current * scale).toFixed(2)), 0.1), 8);
                setZoomLevel(nextZoom);
                if (nextZoom <= 1) setPanPosition({ x: 0, y: 0 });
            } else if (e.touches.length === 1 && isDraggingImage) {
                if (zoomLevel > 1) {
                    if (e.cancelable) e.preventDefault();
                    const touch = e.touches[0];
                    const dx = touch.clientX - dragStartRef.current.startX;
                    const dy = touch.clientY - dragStartRef.current.startY;
                    setPanPosition({
                        x: dragStartRef.current.startPanX + dx,
                        y: dragStartRef.current.startPanY + dy,
                    });
                }
            }
        };

        const onEnd = () => {
            setIsDraggingImage(false);
            isPinchingRef.current = false;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onEnd);
            window.removeEventListener('touchcancel', onEnd);
        };
    }, [isDraggingImage, zoomLevel]);

    // Selection toggle handlers
    const allVisibleFilenames = allVisibleImages.map((img) => img.filename);

    const handleToggleSelectImage = (filename: string) => {
        setSelectedImageFilenames((prev) =>
            prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename]
        );
    };

    const handleSelectAllVisibleImages = () => {
        if (selectedImageFilenames.length === allVisibleFilenames.length) {
            setSelectedImageFilenames([]);
        } else {
            setSelectedImageFilenames(allVisibleFilenames);
        }
    };

    const handleToggleSelectionMode = () => {
        if (isSelectionMode) {
            setIsSelectionMode(false);
            setSelectedImageFilenames([]);
            try {
                sessionStorage.removeItem(`xray_selection_mode_${hn}`);
                sessionStorage.removeItem(`xray_selected_imgs_${hn}`);
            } catch (e) { }
        } else {
            setIsSelectionMode(true);
        }
    };

    const roundKb = (bytes: number) => (bytes / 1024).toFixed(0) + ' KB';

    // Render individual image thumbnail card (Apple iOS Photos Grid style)
    const renderImageCard = (img: XrayImageItem, visitVtNo?: number) => {
        const isSelected = selectedImageFilenames.includes(img.filename);
        return (
            <div
                key={img.id}
                onClick={() => {
                    // If long-press triggered the context menu, ignore the click to avoid opening lightbox
                    if (isLongPressTriggeredRef.current) {
                        isLongPressTriggeredRef.current = false;
                        return;
                    }
                    if (isSelectionMode) {
                        handleToggleSelectImage(img.filename);
                    } else {
                        handleOpenLightbox(img);
                    }
                }}
                onTouchStart={(e) => handleTouchStart(e, img, visitVtNo)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onContextMenu={(e) => handleContextMenu(e, img, visitVtNo)}
                style={{ WebkitTouchCallout: 'none' }}
                className={`group relative aspect-square rounded-none overflow-hidden border transition-all duration-200 cursor-pointer select-none bg-slate-950 shadow-xs hover:shadow-md touch-manipulation ${isSelected
                    ? 'border-[#00875A] ring-3 ring-[#00875A] scale-[0.98]'
                    : 'border-slate-800/40 hover:border-slate-600'
                    }`}
            >
                {/* Image Thumbnail */}
                <img
                    src={img.url}
                    alt={img.filename}
                    className={`w-full h-full object-cover transition-transform duration-300 pointer-events-none select-none ${isSelected ? 'scale-105 opacity-90' : 'group-hover:scale-105'
                        }`}
                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                    loading="lazy"
                />

                {/* Selection Checkbox Overlay (iOS Photos Style) */}
                {isSelectionMode && (
                    <div className="absolute top-2.5 right-2.5 z-20 pointer-events-auto">
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${isSelected
                                ? 'bg-[#00875A] text-white scale-110 ring-2 ring-white shadow-[0_2px_8px_rgba(0,135,90,0.5)]'
                                : 'bg-black/40 backdrop-blur-md text-white border-2 border-white/90 group-hover:bg-white/30'
                                }`}
                        >
                            {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3.5]" />}
                        </div>
                    </div>
                )}

            </div>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title={`คลังรูปภาพ X-Ray - ${patient?.fullname || hn}`} />

            <div className="min-h-[calc(100vh-65px)] lg:h-[calc(100vh-65px)] overflow-y-auto lg:overflow-hidden flex flex-col p-3.5 sm:p-5 w-full max-w-full animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">

                {/* Top Navigation & Patient Summary Header Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 liquid-glass-card p-3.5 sm:p-4 rounded-2xl shrink-0 w-full shadow-sm border border-slate-200/80">
                    <div className="flex items-center gap-3.5 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 text-xs sm:text-sm font-semibold rounded-full touch-manipulation hover:bg-slate-100"
                            onClick={handleBack}
                        >
                            <ArrowLeft className="h-4.5 w-4.5 mr-1.5" />
                            ย้อนกลับหน้าเวชระเบียน
                        </Button>

                        <div className="h-6 w-px bg-slate-300/60 hidden sm:block" />

                        {/* Patient Quick Chip */}
                        <div className="flex items-center gap-3 bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-full shadow-2xs">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                                {patient?.Image_PT ? (
                                    <img src={patient.Image_PT} alt={patient.fullname} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-4 h-4 text-slate-500 m-auto mt-2" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
                                <span className="font-bold text-slate-900">{patient?.fullname || 'ผู้ป่วย'}</span>
                                <Badge variant="secondary" className="font-mono text-[11px] bg-[#E8F8F2] text-[#007A4D] border border-[#A7F3D0] font-bold px-2">
                                    CN: {patient?.op_hn || hn}
                                </Badge>
                                {patient && (
                                    <span className="text-slate-500 text-xs font-medium">
                                        อายุ {formatPatientAge(patient)} {patient?.op_sex ? `/ ${patient.op_sex}` : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Total Photos Badge */}
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 font-semibold text-xs px-3 py-1 rounded-full border-slate-300">
                            <FileImage className="h-3.5 w-3.5 mr-1.5 text-[#00875A]" />
                            ภาพทั้งหมด {allImages.length} รูป ({visits.length} Visit)
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Open Upload Modal Button */}
                        <Button
                            onClick={() => handleOpenUploadForVisit()}
                            size="sm"
                            className="h-10 px-5 text-xs sm:text-sm liquid-glass-btn-primary text-white font-bold rounded-full flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer touch-manipulation"
                        >
                            <UploadCloud className="h-4.5 w-4.5" />
                            <span>อัปโหลดรูปภาพ</span>
                        </Button>
                    </div>
                </div>

                {/* Main 2-Column Studio Canvas: Left = Multi-Select Visit List, Right = Grouped Visit Galleries */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4.5 flex-1 min-h-0 w-full max-w-full">

                    {/* Left Column: Interactive Multi-Select Visit List (4 Columns) */}
                    <div className="lg:col-span-4 h-auto lg:h-full flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden">
                        <Card className="liquid-glass-card shadow-lg border border-slate-300/80 rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden max-h-none lg:max-h-[calc(100vh-140px)]">
                            <CardHeader className="p-3.5 sm:p-4 border-b border-slate-200/80 shrink-0 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-[#00875A]" />
                                        รายการรอบตรวจ (Visit List)
                                    </CardTitle>
                                    <Badge variant="secondary" className="bg-[#E8F8F2] text-[#007A4D] border border-[#A7F3D0] font-bold text-xs px-2.5 py-0.5 rounded-full">
                                        เลือก {selectedVtNos.length} / {visits.length}
                                    </Badge>
                                </div>

                                {/* Select All / Deselect All Bar */}
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllVisits}
                                        className="text-xs font-bold text-[#00875A] hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <CheckCheck className="h-3.5 w-3.5" />
                                        <span>
                                            {selectedVtNos.length === visits.length + (unassignedXrayImages.length > 0 ? 1 : 0)
                                                ? 'ยกเลิกการเลือกทั้งหมด'
                                                : 'เลือกทุก Visit (Select All)'}
                                        </span>
                                    </button>
                                </div>
                            </CardHeader>

                            <CardContent className="p-3 space-y-2.5 flex-1 min-h-0 overflow-y-auto">
                                {visits.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 text-xs">
                                        ไม่พบประวัติการตรวจ (Visit) ของผู้ป่วย
                                    </div>
                                ) : (
                                    visits.map((v) => {
                                        const isSelected = selectedVtNos.includes(Number(v.VT_NO));
                                        const count = Number(v.image_count || 0);

                                        return (
                                            <div
                                                key={v.VT_ID || v.VT_NO}
                                                onClick={() => handleToggleVisit(Number(v.VT_NO))}
                                                className={`group rounded-2xl transition-all duration-200 cursor-pointer p-4 sm:p-4.5 relative flex flex-col justify-between backdrop-blur-xl border ${isSelected
                                                    ? 'bg-[#E8F8F2]/75 border-[#00875A] ring-2 ring-[#00875A]/25 shadow-[0_8px_24px_rgba(0,135,90,0.12),inset_0_1.5px_2px_rgba(255,255,255,0.95)]'
                                                    : 'bg-white/80 border-white/90 border-t-white border-t-[1.5px] border-b-slate-200/60 shadow-[0_4px_16px_rgba(15,23,42,0.05),inset_0_1.5px_1.5px_rgba(255,255,255,1),inset_0_-1.5px_3px_rgba(15,23,42,0.03)] hover:bg-white/95 hover:border-slate-300/80 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08),inset_0_2px_3px_rgba(255,255,255,1)] hover:scale-[1.005]'
                                                    }`}
                                            >
                                                <div>
                                                    {/* Header: Visit # & Date / Image Count */}
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            {/* Checkbox Icon */}
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleToggleVisit(Number(v.VT_NO));
                                                                }}
                                                                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer ${isSelected
                                                                    ? 'bg-[#00875A] text-white shadow-[0_2px_8px_rgba(0,135,90,0.35)]'
                                                                    : 'border-2 border-slate-300/90 bg-white/90 group-hover:border-[#00875A] shadow-2xs'
                                                                    }`}
                                                            >
                                                                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-slate-900 text-sm leading-tight truncate">
                                                                    Visit #{v.VT_NO}
                                                                </p>
                                                                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                                                                    {v.formatted_date || v.pb_now1 || '-'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <span
                                                            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 flex items-center gap-1 font-semibold backdrop-blur-md border ${count > 0
                                                                ? 'bg-[#E8F8F2]/90 text-[#007A4D] border-[#A7F3D0]/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_6px_rgba(0,135,90,0.06)]'
                                                                : 'bg-slate-100/80 text-slate-500 border-slate-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]'
                                                                }`}
                                                        >
                                                            <Camera className={`h-3 w-3 shrink-0 ${count > 0 ? 'text-[#00875A]' : 'text-slate-400'}`} />
                                                            <span>{count > 0 ? `${count} รูป` : 'ไม่มีรูป'}</span>
                                                        </span>
                                                    </div>

                                                    {/* Doctor Name & Compact Right-Aligned Action Button */}
                                                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-0.5">
                                                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 font-medium min-w-0">
                                                            <Stethoscope className="h-3.5 w-3.5 text-[#00875A] shrink-0" />
                                                            <span className="truncate">{v.OP_SEND_DR_Name || 'ไม่ระบุแพทย์'}</span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenUploadForVisit(Number(v.VT_NO));
                                                            }}
                                                            className="h-7 px-3 liquid-glass-btn-primary active:scale-[0.98] text-white text-xs font-bold rounded-full transition-all text-center flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-xs"
                                                            title="อัปโหลดรูปภาพเข้า Visit นี้"
                                                        >
                                                            <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                                                            <span>อัปโหลดเข้า Visit นี้</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {/* Unassigned Images Section (If Any) */}
                                {unassignedXrayImages.length > 0 && (
                                    <div
                                        onClick={() => handleToggleVisit('unassigned')}
                                        className={`group rounded-2xl transition-all duration-200 cursor-pointer p-4 relative flex flex-col justify-between mt-3 backdrop-blur-xl border ${isUnassignedSelected
                                            ? 'bg-amber-50/75 border-amber-500 ring-2 ring-amber-400/25 shadow-[0_8px_24px_rgba(217,119,6,0.12),inset_0_1.5px_2px_rgba(255,255,255,0.95)]'
                                            : 'bg-white/80 border-white/90 border-t-white border-t-[1.5px] border-b-slate-200/60 shadow-[0_4px_16px_rgba(15,23,42,0.05),inset_0_1.5px_1.5px_rgba(255,255,255,1),inset_0_-1.5px_3px_rgba(15,23,42,0.03)] hover:bg-white/95 hover:border-slate-300/80 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08),inset_0_2px_3px_rgba(255,255,255,1)] hover:scale-[1.005]'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleVisit('unassigned');
                                                    }}
                                                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer ${isUnassignedSelected
                                                        ? 'bg-amber-600 text-white shadow-[0_2px_8px_rgba(217,119,6,0.35)]'
                                                        : 'border-2 border-slate-300/90 bg-white/90 group-hover:border-amber-500 shadow-2xs'
                                                        }`}
                                                >
                                                    {isUnassignedSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 text-sm leading-tight">
                                                        รูปภาพที่ยังไม่ได้ระบุ Visit
                                                    </p>
                                                    <p className="text-xs text-amber-700 mt-0.5">
                                                        รูปภาพส่วนกลางของผู้ป่วย
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 flex items-center gap-1 font-semibold bg-amber-100/90 text-amber-800 border border-amber-200/80 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                                                <Camera className="h-3 w-3 shrink-0 text-amber-700" />
                                                <span>{unassignedXrayImages.length} รูป</span>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Grouped Galleries for All Selected Visits (8 Columns) */}
                    <div className="lg:col-span-8 h-auto lg:h-full flex flex-col min-h-[500px] lg:min-h-0 overflow-hidden">
                        <Card className="liquid-glass-card shadow-lg border border-slate-300/80 rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">

                            {/* Top Gallery Global Toolbar */}
                            <CardHeader className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-white/70">
                                <div className="space-y-1 overflow-hidden">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Layers className="h-5 w-5 text-[#00875A]" />
                                            <span>คลังรูปภาพแยกตามรอบตรวจ (เลือกดู {selectedVtNos.length} Visit • รวม {allVisibleImages.length} รูป)</span>
                                        </CardTitle>

                                        {isSelectionMode && (
                                            <Badge variant="secondary" className="bg-[#E8F8F2] text-[#007A4D] border border-[#A7F3D0] font-bold text-xs px-2.5 py-0.5 rounded-full animate-in fade-in">
                                                เลือกอยู่ {selectedImageFilenames.length} / {allVisibleImages.length} รูป
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {!isSelectionMode && allVisibleImages.length > 0 && (
                                        <Button
                                            onClick={handleToggleSelectionMode}
                                            size="sm"
                                            variant="outline"
                                            className="h-8.5 px-3.5 text-xs font-semibold rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                        >
                                            <CheckSquare className="h-3.5 w-3.5 text-[#00875A]" />
                                            <span>เลือกรูปภาพ</span>
                                        </Button>
                                    )}

                                    {isSelectionMode && (
                                        <>
                                            {selectedImageFilenames.length > 0 && (
                                                <>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                className="group h-8.5 px-3.5 text-xs font-bold liquid-glass-btn-primary text-white rounded-full flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                                                            >
                                                                <Printer className="h-3.5 w-3.5" />
                                                                <span>Print ที่เลือกไว้ ({selectedImageFilenames.length} รูป)</span>
                                                                <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 text-white/80" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-52">
                                                            <DropdownMenuLabel className="text-xs font-bold text-slate-500">
                                                                เลือกรูปต่อหน้า
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {([1, 2, 4, 6] as const).map((layout) => (
                                                                <DropdownMenuItem
                                                                    key={layout}
                                                                    className="cursor-pointer text-sm"
                                                                    onClick={() =>
                                                                        window.open(
                                                                            route('patient.ultrasound.image.pdf', {
                                                                                hn: patient?.op_hn || hn,
                                                                                filenames: selectedImageFilenames.join(','),
                                                                                layout,
                                                                                vt: selectedVisitsList[0]?.VT_NO || defaultVtNo || '',
                                                                            }),
                                                                            '_blank'
                                                                        )
                                                                    }
                                                                >
                                                                    {layout} รูปต่อหน้า
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-8.5 px-3.5 text-xs font-bold rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                                                        onClick={() => setDeletingSelected(true)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        <span>ลบที่เลือก ({selectedImageFilenames.length} รูป)</span>
                                                    </Button>
                                                </>
                                            )}

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8.5 px-3 text-xs font-semibold rounded-full border-slate-300"
                                                onClick={handleSelectAllVisibleImages}
                                            >
                                                {selectedImageFilenames.length === allVisibleFilenames.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8.5 px-3 text-xs font-semibold rounded-full text-slate-500 hover:text-slate-800"
                                                onClick={handleToggleSelectionMode}
                                            >
                                                ยกเลิก
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardHeader>

                            {/* Grouped Galleries Body */}
                            <CardContent className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-6 bg-slate-50/40">
                                {selectedVtNos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-300 rounded-3xl min-h-[360px] bg-white/70">
                                        <div className="w-16 h-16 rounded-3xl bg-[#E8F8F2] border border-[#A7F3D0] flex items-center justify-center text-[#00875A] shadow-inner mb-3.5">
                                            <Filter className="h-8 w-8 text-[#00875A]" />
                                        </div>
                                        <h4 className="text-base font-bold text-slate-900 mb-1">
                                            ยังไม่ได้เลือก Visit สำหรับแสดงรูปภาพ
                                        </h4>
                                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-5 leading-relaxed">
                                            กรุณาติ๊กเลือกรายการรอบตรวจ (Visit) ทางด้านซ้าย หรือคลิกปุ่มด้านล่างเพื่อเลือกดูทุกรอบตรวจ
                                        </p>
                                        <Button
                                            onClick={handleSelectAllVisits}
                                            size="sm"
                                            className="h-10 px-6 text-xs sm:text-sm font-bold liquid-glass-btn-primary text-white rounded-full shadow-md cursor-pointer"
                                        >
                                            <CheckCheck className="h-4 w-4 mr-2" />
                                            <span>เลือกทุก Visit (Select All)</span>
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Render each selected Visit Section */}
                                        {selectedVisitsList.map((v) => {
                                            const vImages = getImagesForVisit(v);

                                            return (
                                                <div
                                                    key={v.VT_ID || v.VT_NO}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDropOnVisit(e, Number(v.VT_NO))}
                                                    className="bg-white/90 border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md"
                                                >
                                                    {/* Visit Section Header */}
                                                    <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#E8F8F2]/60 to-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5 flex-wrap">
                                                            <span className="font-bold text-slate-900 text-sm sm:text-base">
                                                                Visit #{v.VT_NO}
                                                            </span>
                                                            <span className="text-xs sm:text-sm text-slate-500 font-medium">
                                                                วันที่: {v.formatted_date || v.pb_now1 || '-'}
                                                            </span>
                                                            {v.OP_SEND_DR_Name && (
                                                                <span className="text-xs text-slate-600 bg-white/80 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium">
                                                                    แพทย์: <strong>{v.OP_SEND_DR_Name}</strong>
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Section Actions */}
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${vImages.length > 0
                                                                    ? 'bg-[#E8F8F2] border-[#A7F3D0] text-[#007A4D]'
                                                                    : 'bg-slate-100 border-slate-200 text-slate-500'
                                                                    }`}
                                                            >
                                                                {vImages.length} รูป
                                                            </Badge>

                                                            {!isSelectionMode && vImages.length > 0 && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="group h-8 px-3 text-xs font-bold text-slate-700 rounded-full border-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                                            title="เลือกจำนวนรูปต่อหน้าสำหรับพิมพ์ PDF ของรอบตรวจนี้"
                                                                        >
                                                                            <Printer className="h-3.5 w-3.5 text-[#00875A]" />
                                                                            <span>Print ({vImages.length} รูป)</span>
                                                                            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 text-slate-400" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-52">
                                                                        <DropdownMenuLabel className="text-xs font-bold text-slate-500">
                                                                            เลือกรูปต่อหน้า
                                                                        </DropdownMenuLabel>
                                                                        <DropdownMenuSeparator />
                                                                        {([1, 2, 4, 6] as const).map((layout) => (
                                                                            <DropdownMenuItem
                                                                                key={layout}
                                                                                className="cursor-pointer text-sm"
                                                                                onClick={() =>
                                                                                    window.open(
                                                                                        route('patient.ultrasound.image.pdf', {
                                                                                            hn: patient?.op_hn || hn,
                                                                                            filenames: vImages.map((img) => img.filename).join(','),
                                                                                            layout,
                                                                                            vt: v.VT_NO,
                                                                                        }),
                                                                                        '_blank'
                                                                                    )
                                                                                }
                                                                            >
                                                                                {layout} รูปต่อหน้า
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Visit Section Body (Image Grid or Empty Box) */}
                                                    <div className="p-2.5 sm:p-3.5">
                                                        {vImages.length === 0 ? (
                                                            <div
                                                                onDragOver={handleDragOver}
                                                                onDragLeave={handleDragLeave}
                                                                onDrop={(e) => handleDropOnVisit(e, Number(v.VT_NO))}
                                                                className="flex items-center justify-between p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-[#E8F8F2]/40 hover:border-[#00875A] transition-all cursor-pointer"
                                                                onClick={() => handleOpenUploadForVisit(Number(v.VT_NO))}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-[#E8F8F2] text-[#00875A] flex items-center justify-center">
                                                                        <UploadCloud className="h-5 w-5" />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <p className="text-xs font-bold text-slate-800">
                                                                            ยังไม่มีรูปภาพใน Visit #{v.VT_NO}
                                                                        </p>
                                                                        <p className="text-[11px] text-slate-500">
                                                                            ลากไฟล์มาวางที่นี่ หรือคลิกเพื่ออัปโหลดรูปภาพเข้าสู่รอบตรวจนี้
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1 sm:gap-1.5">
                                                                {vImages.map((img) => renderImageCard(img, Number(v.VT_NO)))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Unassigned Section (If Selected) */}
                                        {isUnassignedSelected && (
                                            <div className="bg-white/90 border border-amber-200 rounded-2xl shadow-xs overflow-hidden">
                                                <div className="p-3.5 sm:p-4 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <FolderOpen className="h-5 w-5 text-amber-600" />
                                                        <span className="font-bold text-sm sm:text-base text-amber-950">
                                                            รูปภาพที่ยังไม่ได้ระบุ Visit
                                                        </span>
                                                        <Badge className="bg-amber-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                                                            {unassignedXrayImages.length} รูป
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="p-2.5 sm:p-3.5">
                                                    {unassignedXrayImages.length === 0 ? (
                                                        <p className="text-center py-6 text-xs text-slate-400">
                                                            ไม่มีรูปภาพส่วนกลาง
                                                        </p>
                                                    ) : (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1 sm:gap-1.5">
                                                            {unassignedXrayImages.map((img) => renderImageCard(img))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Dedicated Upload Modal Dialog */}
            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <DialogContent className="sm:max-w-xl rounded-3xl p-6 liquid-glass-card shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                            <UploadCloud className="h-5.5 w-5.5 text-[#00875A]" />
                            อัปโหลดรูปภาพ X-Ray / อัลตราซาวด์
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmitUpload} className="space-y-4 py-2">

                        {/* Target Visit Selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                <span>รอบการตรวจ (Target Visit):</span>
                                <span className="text-[11px] text-slate-500 font-normal">ระบุ Visit ที่ต้องการบันทึกภาพ</span>
                            </label>
                            <select
                                value={uploadTargetVtNo}
                                onChange={(e) => setUploadTargetVtNo(e.target.value ? Number(e.target.value) : '')}
                                className="w-full h-10 px-3.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A]/30 font-semibold text-slate-800"
                            >
                                {visits.map((v) => (
                                    <option key={v.VT_ID || v.VT_NO} value={v.VT_NO}>
                                        Visit #{v.VT_NO} - {v.formatted_date || v.pb_now1 || ''} {v.OP_SEND_DR_Name ? `(${v.OP_SEND_DR_Name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Drag & Drop File Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-6 sm:p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-200 ${isDragging
                                ? 'border-[#00875A] bg-[#E8F8F2] scale-[1.01]'
                                : 'border-slate-300 hover:border-[#00875A] hover:bg-slate-50/80 bg-white/70'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />
                            <div className="flex flex-col items-center justify-center space-y-2">
                                <div className="w-12 h-12 rounded-2xl bg-[#E8F8F2] text-[#00875A] flex items-center justify-center shadow-inner">
                                    <UploadCloud className="h-6 w-6 animate-bounce" />
                                </div>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                                    ลากไฟล์มาวางที่นี่ หรือ <span className="text-[#00875A] underline">เลือกไฟล์ในเครื่อง</span>
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                    รองรับไฟล์รูปภาพ JPEG, PNG, WEBP, BMP (ขนาดสูงสุด 50 MB ต่อไฟล์)
                                </p>
                            </div>
                        </div>

                        {/* Selected Files Queue */}
                        {selectedFiles.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                    <span>คิวไฟล์รออัปโหลด ({selectedFiles.length} ไฟล์)</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFiles([])}
                                        className="text-rose-600 hover:underline cursor-pointer"
                                    >
                                        ล้างทั้งหมด
                                    </button>
                                </div>

                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                    {selectedFiles.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileImage className="h-4 w-4 text-[#00875A] shrink-0" />
                                                <span className="font-semibold text-slate-800 truncate">
                                                    {file.name}
                                                </span>
                                                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                                                    ({roundKb(file.size)})
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSelectedFile(idx)}
                                                className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload Progress Bar */}
                        {isUploading && (
                            <div className="space-y-1.5 rounded-2xl border border-[#A7F3D0] bg-[#E8F8F2]/60 p-3">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                    <span className="flex items-center gap-1.5">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00875A]" />
                                        กำลังอัปโหลดรูปภาพ...
                                    </span>
                                    <span className="font-mono text-[#00875A]">{uploadProgress}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-white rounded-full overflow-hidden border border-slate-200">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#00B377] to-[#00875A] rounded-full transition-all duration-200 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {uploadError && (
                            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                {uploadError}
                            </div>
                        )}

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsUploadModalOpen(false)}
                                disabled={isUploading}
                                className="rounded-full px-5 h-9 text-xs"
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                type="submit"
                                disabled={isUploading || selectedFiles.length === 0}
                                className="liquid-glass-btn-primary text-white font-bold h-9 px-6 rounded-full shadow-md transition-all cursor-pointer text-xs"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                        กำลังอัปโหลด... {uploadProgress}%
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="h-4 w-4 mr-1.5" />
                                        บันทึกและอัปโหลด ({selectedFiles.length} ไฟล์)
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Lightbox Interactive Preview Modal */}
            <Dialog open={Boolean(activeImage)} onOpenChange={() => setActiveImage(null)}>
                <DialogContent className="sm:max-w-6xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-0 rounded-3xl overflow-hidden pacs-viewer-modal !bg-black !text-white shadow-2xl">
                    <DialogHeader className="p-3.5 sm:p-4 !bg-black border-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                        <div className="overflow-hidden sm:pr-8">
                            <DialogTitle className="text-sm sm:text-base font-bold !text-white truncate flex items-center gap-2">
                                <span className="truncate">{activeImage?.filename.split('/').pop()}</span>
                                <Badge variant="secondary" className="!bg-slate-800 !text-slate-300 !border-slate-700 font-mono text-[10px] px-2">
                                    {activeImage?.size}
                                </Badge>
                            </DialogTitle>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                                อัปโหลดเมื่อ: {activeImage?.uploaded_at}
                            </p>
                        </div>
                    </DialogHeader>

                    {/* Viewport Canvas Frame */}
                    <div
                        onWheel={handleWheelZoom}
                        onMouseDown={handleImageMouseDown}
                        onTouchStart={handleImageTouchStart}
                        className={`flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center p-0 !bg-black relative select-none touch-none ${zoomLevel > 1
                            ? isDraggingImage
                                ? 'cursor-grabbing'
                                : 'cursor-grab'
                            : 'cursor-default'
                            }`}
                        title={
                            zoomLevel > 1
                                ? 'คลิกเมาส์ค้างเพื่อเลื่อนดูรูปภาพ (Pan) หรือเลื่อนลูกกลิ้งเมาส์เพื่อย่อ-ขยาย (บน iPad ใช้ 2 นิ้วบีบ/ขยาย หรือแตะสองครั้ง)'
                                : 'เลื่อนลูกกลิ้งเมาส์ หรือใช้ 2 นิ้วขยายรูปภาพ'
                        }
                    >
                        {activeImage && (
                            <div
                                className="relative h-full w-full flex items-center justify-center will-change-transform select-none touch-none"
                                style={{
                                    transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0) scale(${zoomLevel}) rotate(${rotation}deg)`,
                                    transition: isDraggingImage || isPinchingRef.current || isNoTransition ? 'none' : 'transform 0.15s ease-out',
                                }}
                                onTransitionEnd={(e) => {
                                    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
                                    if (rotation >= 360 || rotation <= -360) {
                                        setIsNoTransition(true);
                                        setRotation((prev) => ((prev % 360) + 360) % 360);
                                        requestAnimationFrame(() => {
                                            requestAnimationFrame(() => {
                                                setIsNoTransition(false);
                                            });
                                        });
                                    }
                                }}
                            >
                                <img
                                    src={activeImage.url}
                                    alt={activeImage.filename}
                                    draggable={false}
                                    className="h-full max-h-full w-auto max-w-full object-contain rounded-none border-0 select-none pointer-events-none touch-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* Controls Footer */}
                    <div className="px-4 sm:px-5 py-2.5 !bg-black border-none flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 text-xs text-slate-300 shrink-0">
                        {/* Zoom Dropdown */}
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-3 text-xs font-bold font-mono pacs-btn-dark rounded-xl flex items-center gap-1.5 cursor-pointer touch-manipulation"
                                    >
                                        <span>{Math.round(zoomLevel * 100)}%</span>
                                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    side="top"
                                    className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] p-1 pacs-dropdown-dark rounded-2xl shadow-2xl z-[99999]"
                                >
                                    {[10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 600, 700, 800].map((percent) => {
                                        const isSelected = Math.round(zoomLevel * 100) === percent;
                                        return (
                                            <DropdownMenuItem
                                                key={percent}
                                                onClick={() => {
                                                    const next = percent / 100;
                                                    setZoomLevel(next);
                                                    if (next <= 1) setPanPosition({ x: 0, y: 0 });
                                                }}
                                                className={`flex items-center justify-center text-xs font-mono font-semibold py-2 rounded-xl cursor-pointer touch-manipulation ${isSelected ? 'pacs-dropdown-item-active' : 'pacs-dropdown-item'
                                                    }`}
                                            >
                                                <span>{percent}%</span>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Slider */}
                        <div className="flex items-center gap-2 sm:gap-2.5 !bg-slate-900 px-3 sm:px-3.5 py-1.5 rounded-full border !border-slate-800 shadow-2xs">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7.5 w-7.5 text-slate-300 hover:text-white rounded-full cursor-pointer touch-manipulation flex items-center justify-center"
                                onClick={() =>
                                    setZoomLevel((prev) => {
                                        const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.1);
                                        if (next <= 1) setPanPosition({ x: 0, y: 0 });
                                        return next;
                                    })
                                }
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>

                            <input
                                type="range"
                                min="0.1"
                                max="8"
                                step="0.05"
                                value={zoomLevel}
                                onChange={(e) => {
                                    const next = parseFloat(e.target.value);
                                    setZoomLevel(next);
                                    if (next <= 1) setPanPosition({ x: 0, y: 0 });
                                }}
                                className="w-28 sm:w-44 accent-[#00875A] h-2 !bg-slate-700 rounded-lg appearance-none cursor-pointer touch-manipulation"
                            />

                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7.5 w-7.5 text-slate-300 hover:text-white rounded-full cursor-pointer touch-manipulation flex items-center justify-center"
                                onClick={() =>
                                    setZoomLevel((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 8))
                                }
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>

                            <span className="font-mono font-bold text-[#00B377] text-xs min-w-[42px] text-center ml-0.5">
                                {Math.round(zoomLevel * 100)}%
                            </span>
                        </div>

                        {/* Rotation & Reset */}
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 px-3.5 text-xs !text-white font-bold pacs-btn-dark rounded-xl cursor-pointer flex items-center gap-1.5 touch-manipulation"
                                onClick={handleRotate}
                            >
                                <RotateCw className="h-3.5 w-3.5 text-white" />
                                <span>หมุน ({((rotation % 360) + 360) % 360}°)</span>
                            </Button>

                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 px-3.5 text-xs !text-white font-bold pacs-btn-dark rounded-xl cursor-pointer flex items-center gap-1.5 touch-manipulation"
                                onClick={handleResetImage}
                            >
                                <RefreshCw className="h-3.5 w-3.5 text-white" />
                                <span>รีเซ็ต</span>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Single Image Confirmation Modal */}
            <Dialog open={Boolean(deletingImage)} onOpenChange={() => setDeletingImage(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-rose-600" />
                            ยืนยันการลบรูปภาพ X-Ray
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-sm text-slate-600">
                        คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ <strong className="text-slate-900">{deletingImage?.filename}</strong>? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDeletingImage(null)}>
                            ยกเลิก
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>
                            ลบรูปภาพ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Selected Images Confirmation Modal */}
            <Dialog open={deletingSelected} onOpenChange={() => setDeletingSelected(false)}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-rose-600" />
                            ยืนยันการลบรูปภาพที่เลือก
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-sm text-slate-600">
                        คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพ <strong className="text-slate-900">{selectedImageFilenames.length} รูป</strong> ที่เลือกไว้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDeletingSelected(false)}>
                            ยกเลิก
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDeleteSelectedConfirm}>
                            ลบ {selectedImageFilenames.length} รูป
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Custom Right-Click Context Menu (Liquid Glass) */}
            {contextMenu.isOpen && contextMenu.image && (
                <div
                    className="fixed z-[99999] min-w-[200px] rounded-2xl liquid-glass-context-menu p-1.5 text-slate-800 animate-in fade-in-50 zoom-in-95 duration-150 select-none"
                    style={{
                        left: contextMenu.x,
                        top: contextMenu.y,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Menu Actions */}
                    <div className="space-y-0.5">
                        <a
                            href={route('patient.ultrasound.image.pdf', {
                                hn: patient?.op_hn || hn,
                                filename: contextMenu.image.filename,
                                vt: contextMenu.visitVtNo || contextMenu.image.vt_no || defaultVtNo || '',
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-slate-800 hover:bg-black/6 active:bg-black/10 transition-colors cursor-pointer text-left"
                            onClick={() => handleCloseContextMenu()}
                        >
                            <Printer className="h-4 w-4 text-slate-900 shrink-0" />
                            <span>พิมพ์ PDF รูปภาพนี้</span>
                        </a>

                        <a
                            href={contextMenu.image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-slate-800 hover:bg-black/6 active:bg-black/10 transition-colors cursor-pointer text-left"
                            onClick={() => handleCloseContextMenu()}
                        >
                            <ExternalLink className="h-4 w-4 text-slate-900 shrink-0" />
                            <span>เปิดในแท็บใหม่</span>
                        </a>

                        <a
                            href={contextMenu.image.url}
                            download={contextMenu.image.filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-slate-800 hover:bg-black/6 active:bg-black/10 transition-colors cursor-pointer text-left"
                            onClick={() => handleCloseContextMenu()}
                        >
                            <Download className="h-4 w-4 text-slate-900 shrink-0" />
                            <span>ดาวน์โหลดรูปภาพ</span>
                        </a>

                        <div className="h-px bg-slate-200/50 my-1 mx-1" />

                        <button
                            type="button"
                            className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-500/10 active:bg-rose-500/15 transition-colors cursor-pointer text-left"
                            onClick={() => {
                                const img = contextMenu.image;
                                handleCloseContextMenu();
                                if (img) setDeletingImage(img);
                            }}
                        >
                            <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
                            <span>ลบรูปภาพนี้</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom-Right Sliding 3D Liquid Glass Toast Notification */}
            {toastVisible && (
                <div
                    className={`fixed bottom-7 right-7 z-50 pointer-events-none transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${toastActive
                        ? 'translate-y-0 opacity-100 scale-100'
                        : 'translate-y-12 opacity-0 scale-95'
                        }`}
                >
                    <div className="flex flex-col liquid-glass-toast text-slate-800 px-6 py-3.5 rounded-2xl sm:rounded-3xl shadow-2xl pointer-events-auto min-w-[260px] sm:min-w-[300px]">
                        <span className="text-[15px] sm:text-base font-extrabold text-slate-900 tracking-tight">
                            {toastMessage.title}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                            {toastMessage.desc}
                        </span>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
