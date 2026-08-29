import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { PatientVisit } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { Textarea } from '@/Components/ui/textarea';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
    Stethoscope,
    FileText,
    Activity,
    HeartPulse,
    Weight,
    Thermometer,
    UserCheck,
    ShieldCheck,
    AlertTriangle,
    Clock,
    User,
    Edit3,
    FileCheck,
    Download,
    Wind,
    Ruler,
    CreditCard,
    Pill,
    Printer,
    Loader2,
    Plus,
    Camera,
    Upload,
    ChevronDown,
    Check,
    Save,
    ZoomIn,
    ZoomOut,
    Trash2,
    Eye,
    ExternalLink,
    Image as ImageIcon,
    X,
    RotateCw,
    RefreshCw,
    FileImage,
    UploadCloud,
    AlertCircle,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { formatDateGregorian, formatVitalValue, cleanDecimals, cleanProcValue, formatPatientAge, formatPatientSex } from '@/lib/utils';

import PatientVitalsModal from '@/Components/PatientVitalsModal';

// ---------- Page geometry (matches A4 paper 210mm & mPDF findings area & Editor) ----------
const PAPER_WIDTH = 794; // px standard A4 width (210mm @ 96 DPI)
const PAGE_WIDTH = 714; // px outer width of the page card content area (794px - 80px padding)
const LINE_H = 32.9; // px per line (16pt, matches mPDF line pitch)
const DEFAULT_CAP_LINES = 23; // 23 lines per page (matches mPDF findings lines)
const CARD_PADDING_Y = 40; // px top/bottom padding of paper card
const CARD_HEIGHT = Math.round(LINE_H * DEFAULT_CAP_LINES) + (CARD_PADDING_Y * 2); // 837px

interface DoctorOption {
    id: string;
    name: string;
    is_doctor: boolean;
}

export interface XrayImageItem {
    id: string;
    filename: string;
    url: string;
    size: string;
    category: string;
    uploaded_at: string;
    vt_id?: number | null;
    vt_no?: number | null;
}

interface PatientDetailProps {
    patient: PatientVisit | null;
    hn: string;
    visitImages?: XrayImageItem[];
    xrayImageCount?: number;
    doctors?: DoctorOption[];
}

export default function PatientDetail({ patient, hn, visitImages = [], xrayImageCount = 0, doctors = [] }: PatientDetailProps) {
    const [refDoc, setRefDoc] = useState<string>(patient?.OP_Ref_Doc || '');
    const [isRefDocModalOpen, setIsRefDocModalOpen] = useState(false);
    const [refDocInput, setRefDocInput] = useState<string>(patient?.OP_Ref_Doc || '');
    const [isSavingRefDoc, setIsSavingRefDoc] = useState(false);
    const refDocInputRef = useRef<HTMLInputElement>(null);

    // Visit Images State
    const [imagesList, setImagesList] = useState<XrayImageItem[]>(visitImages);
    const [isUploadingXray, setIsUploadingXray] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadStatusText, setUploadStatusText] = useState<string>('กำลังอัปโหลดรูปภาพ...');
    const [uploadDetailText, setUploadDetailText] = useState<string>('');
    const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
    const [deletingImage, setDeletingImage] = useState<XrayImageItem | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<{ file: File; preview: string }[]>([]);
    const [isDraggingUpload, setIsDraggingUpload] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Multi-select Image State - Restores from sessionStorage on refresh
    const [selectedImageFilenames, setSelectedImageFilenames] = useState<string[]>(() => {
        try {
            const saved = sessionStorage.getItem(`patient_detail_selected_imgs_${hn}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {
            // ignore
        }
        return [];
    });
    const [isSelectionMode, setIsSelectionMode] = useState<boolean>(() => {
        try {
            const saved = sessionStorage.getItem(`patient_detail_selection_mode_${hn}`);
            return saved === 'true';
        } catch {
            return false;
        }
    });
    const [deletingSelected, setDeletingSelected] = useState<boolean>(false);
    const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);
    const isDragSelectingRef = useRef(false);
    const dragSelectModeRef = useRef<'select' | 'deselect'>('select');
    const lastTouchedFilenameRef = useRef<string | null>(null);

    // Sync selected images and selection mode to sessionStorage so browser refresh preserves them
    useEffect(() => {
        try {
            if (isSelectionMode) {
                sessionStorage.setItem(`patient_detail_selection_mode_${hn}`, 'true');
            } else {
                sessionStorage.removeItem(`patient_detail_selection_mode_${hn}`);
            }
            if (selectedImageFilenames.length > 0) {
                sessionStorage.setItem(`patient_detail_selected_imgs_${hn}`, JSON.stringify(selectedImageFilenames));
            } else {
                sessionStorage.removeItem(`patient_detail_selected_imgs_${hn}`);
            }
        } catch {
            // ignore
        }
    }, [isSelectionMode, selectedImageFilenames, hn]);


    // Lightbox & Image Preview State (Matches UltrasoundImage.tsx)
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

    // Right-Click Context Menu State (Matches UltrasoundImage.tsx)
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        image: XrayImageItem | null;
    }>({
        isOpen: false,
        x: 0,
        y: 0,
        image: null,
    });

    const handleContextMenu = (e: React.MouseEvent, img: XrayImageItem) => {
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
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };

    // Long Press Handler for iPad & Touch Devices
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const isLongPressTriggeredRef = useRef<boolean>(false);

    const handleTouchStart = (e: React.TouchEvent, img: XrayImageItem) => {
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
            });
        }, 480);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!longPressTimerRef.current) return;
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
            const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
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

    useEffect(() => {
        if (visitImages) {
            setImagesList(visitImages);
        }
    }, [visitImages]);

    useEffect(() => {
        const previews = selectedFiles.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
        }));
        setFilePreviews(previews);

        return () => {
            previews.forEach((p) => URL.revokeObjectURL(p.preview));
        };
    }, [selectedFiles]);

    useEffect(() => {
        setRefDoc(patient?.OP_Ref_Doc || '');
    }, [patient?.OP_Ref_Doc]);

    useEffect(() => {
        if (isRefDocModalOpen) {
            setRefDocInput(refDoc || patient?.OP_Ref_Doc || '');
            const timer = setTimeout(() => {
                if (refDocInputRef.current) {
                    refDocInputRef.current.focus();
                    const len = refDocInputRef.current.value.length;
                    refDocInputRef.current.setSelectionRange(len, len);
                }
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [isRefDocModalOpen, refDoc, patient]);

    const handleSaveRefDoc = async (selectedName?: string) => {
        const finalName = (selectedName !== undefined ? selectedName : refDocInput).trim();
        setIsSavingRefDoc(true);
        try {
            await axios.post(route('patient.medical_info.update', { hn: patient?.op_hn || hn }), {
                ref_doc: finalName,
                op_ref_doc: finalName,
                vt_no: patient?.VT_NO || '',
            }, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            });

            setRefDoc(finalName);
            if (patient) {
                patient.OP_Ref_Doc = finalName;
            }
            setIsRefDocModalOpen(false);
        } catch (error) {
            console.error('Error saving ref doc:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกแพทย์ผู้ส่งตรวจ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsSavingRefDoc(false);
        }
    };

    const [showAllergyDetails, setShowAllergyDetails] = useState(false);
    const [isProcModalOpen, setIsProcModalOpen] = useState(false);
    const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);

    // Zoom & responsive scale for paper canvas (defaults to 'fit' for 3-column layout)
    const [zoomMode, setZoomMode] = useState<'fit' | '100' | '90' | '75'>('fit');
    const [scale, setScale] = useState(1.0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.clientWidth;
            const paperWidth = PAGE_WIDTH + 80; // 804px
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
        return () => {
            window.removeEventListener('resize', updateScale);
        };
    }, [zoomMode]);

    const initialStatus = (patient?.OP_Track_STS || patient?.op_track_sts || 'D').toUpperCase();
    const [currentStatus, setCurrentStatus] = useState<string>(initialStatus === 'W' ? 'W' : 'D');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    React.useEffect(() => {
        const rawStatus = (patient?.OP_Track_STS || patient?.op_track_sts || 'D').toUpperCase();
        setCurrentStatus(rawStatus === 'W' ? 'W' : 'D');
    }, [patient?.OP_Track_STS, patient?.op_track_sts]);

    const handleUpdateStatus = (newStatus: 'D' | 'W') => {
        if (newStatus === currentStatus || !patient) return;
        setIsUpdatingStatus(true);
        setCurrentStatus(newStatus);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('opd-dismiss-patient-notification', {
                    detail: { hn: patient.op_hn || hn, vt: patient.VT_NO },
                })
            );
        }

        router.post(
            route('patient.medical_info.update', { hn: patient.op_hn || hn }),
            {
                vt_no: patient.VT_NO || '',
                op_track_sts: newStatus,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsUpdatingStatus(false);
                },
            }
        );
    };

    const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files).filter(
            (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name)
        );
        setSelectedFiles((prev) => [...prev, ...newFiles]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;
        const validFiles = Array.from(files).filter(
            (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name)
        );
        setSelectedFiles((prev) => [...prev, ...validFiles]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleModalDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingUpload(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleRemoveSelectedFile = (idx: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const formatBytes = (bytes: number, decimals = 1) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const handleUploadSelectedFiles = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploadingXray(true);
        setUploadProgress(0);
        setUploadStatusText(`กำลังเตรียมส่งรูปภาพ (${selectedFiles.length} รูป)...`);
        setUploadDetailText('');

        const formData = new FormData();
        selectedFiles.forEach((file) => {
            formData.append('images[]', file);
        });
        formData.append('category', 'X-Ray / Scan');
        if (patient?.VT_ID) {
            formData.append('vt_id', String(patient.VT_ID));
        }
        if (patient?.VT_NO) {
            formData.append('vt_no', String(patient.VT_NO));
        }

        let processingInterval: any = null;

        try {
            await axios.post(route('patient.ultrasound.upload.store', { hn: patient?.op_hn || hn }), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const loaded = progressEvent.loaded;
                        const total = progressEvent.total;
                        // Map upload transfer 0..total to 0..85%
                        const percent = Math.min(85, Math.round((loaded * 85) / total));
                        setUploadProgress(percent);
                        const loadedStr = formatBytes(loaded);
                        const totalStr = formatBytes(total);
                        setUploadStatusText(`กำลังส่งข้อมูลรูปภาพ (${selectedFiles.length} รูป)...`);
                        setUploadDetailText(`${loadedStr} / ${totalStr}`);

                        if (loaded >= total) {
                            setUploadStatusText('กำลังประมวลผลและบันทึกรูปภาพ...');
                            let cur = 86;
                            setUploadProgress(cur);
                            if (!processingInterval) {
                                processingInterval = setInterval(() => {
                                    cur = Math.min(96, cur + 2);
                                    setUploadProgress(cur);
                                }, 150);
                            }
                        }
                    }
                },
            });

            if (processingInterval) clearInterval(processingInterval);
            setUploadStatusText('กำลังอัปเดตรายการรูปภาพ...');
            setUploadProgress(98);

            await new Promise<void>((resolve) => {
                router.reload({
                    only: ['visitImages', 'xrayImageCount'],
                    onFinish: () => {
                        setUploadProgress(100);
                        resolve();
                    },
                });
            });

            triggerToast('อัปโหลดสำเร็จ', `อัปโหลดรูปภาพ ${selectedFiles.length} รูป เรียบร้อยแล้ว`);
            setSelectedFiles([]);
            setIsUploadModalOpen(false);
        } catch (err: any) {
            if (processingInterval) clearInterval(processingInterval);
            console.error('Failed to upload image:', err);
            alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + (err.response?.data?.message || err.message));
        } finally {
            if (processingInterval) clearInterval(processingInterval);
            setIsUploadingXray(false);
            setUploadProgress(null);
            setUploadStatusText('');
            setUploadDetailText('');
        }
    };

    const handleDeleteImage = (img: XrayImageItem) => {
        setDeletingImage(img);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingImage) return;
        const img = deletingImage;
        setIsDeletingImage(img.id);
        try {
            await axios.post(route('patient.ultrasound.image.delete', { hn: patient?.op_hn || hn }), {
                filename: img.filename,
            });
            setImagesList((prev) => prev.filter((item) => item.id !== img.id));
            if (activeImage?.id === img.id) {
                setActiveImage(null);
            }
            triggerToast('ลบสำเร็จ', 'ลบรูปภาพเรียบร้อยแล้ว');
            setDeletingImage(null);
            router.reload({ only: ['visitImages', 'xrayImageCount'] });
        } catch (err: any) {
            console.error('Failed to delete image:', err);
            alert('เกิดข้อผิดพลาดในการลบรูปภาพ: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsDeletingImage(null);
        }
    };

    const handleToggleSelectionMode = () => {
        if (isSelectionMode) {
            setIsSelectionMode(false);
            setSelectedImageFilenames([]);
        } else {
            setIsSelectionMode(true);
            setSelectedImageFilenames([]);
        }
    };

    const handleToggleSelectImage = (filename: string) => {
        setSelectedImageFilenames((prev) =>
            prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename]
        );
    };

    const handleCardPointerDown = (e: React.PointerEvent, img: XrayImageItem) => {
        if (!isSelectionMode || e.button !== 0) return;
        const isCurrentlySelected = selectedImageFilenames.includes(img.filename);
        dragSelectModeRef.current = isCurrentlySelected ? 'deselect' : 'select';
        isDragSelectingRef.current = true;
        lastTouchedFilenameRef.current = img.filename;
        setSelectedImageFilenames((prev) =>
            isCurrentlySelected ? prev.filter((f) => f !== img.filename) : [...prev, img.filename]
        );
    };

    const handleCardPointerEnter = (e: React.PointerEvent, img: XrayImageItem) => {
        if (!isSelectionMode || !isDragSelectingRef.current) return;
        if (lastTouchedFilenameRef.current === img.filename) return;
        lastTouchedFilenameRef.current = img.filename;

        if (dragSelectModeRef.current === 'select') {
            setSelectedImageFilenames((prev) =>
                prev.includes(img.filename) ? prev : [...prev, img.filename]
            );
        } else {
            setSelectedImageFilenames((prev) => prev.filter((f) => f !== img.filename));
        }
    };

    useEffect(() => {
        if (!isSelectionMode) return;

        const handleGlobalPointerUp = () => {
            isDragSelectingRef.current = false;
            lastTouchedFilenameRef.current = null;
        };

        const handleGlobalTouchMove = (e: TouchEvent) => {
            if (!isDragSelectingRef.current || !isSelectionMode) return;
            if (e.touches.length === 0) return;
            if (e.cancelable) e.preventDefault(); // Prevent scrolling while swiping across photos

            const touch = e.touches[0];
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const card = el?.closest('[data-img-filename]') as HTMLElement | null;
            if (card) {
                const filename = card.getAttribute('data-img-filename');
                if (filename && filename !== lastTouchedFilenameRef.current) {
                    lastTouchedFilenameRef.current = filename;
                    if (dragSelectModeRef.current === 'select') {
                        setSelectedImageFilenames((prev) =>
                            prev.includes(filename) ? prev : [...prev, filename]
                        );
                    } else {
                        setSelectedImageFilenames((prev) => prev.filter((f) => f !== filename));
                    }
                }
            }
        };

        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);
        window.addEventListener('mouseup', handleGlobalPointerUp);
        window.addEventListener('touchend', handleGlobalPointerUp);
        window.addEventListener('touchcancel', handleGlobalPointerUp);
        window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });

        return () => {
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
            window.removeEventListener('mouseup', handleGlobalPointerUp);
            window.removeEventListener('touchend', handleGlobalPointerUp);
            window.removeEventListener('touchcancel', handleGlobalPointerUp);
            window.removeEventListener('touchmove', handleGlobalTouchMove);
        };
    }, [isSelectionMode]);

    const handleSelectAllImages = () => {
        const allFilenames = imagesList.map((img) => img.filename);
        if (selectedImageFilenames.length === allFilenames.length) {
            setSelectedImageFilenames([]);
        } else {
            setSelectedImageFilenames(allFilenames);
        }
    };

    const openBatchXrayImagePdf = (layout: 1 | 2 | 4 | 6 = 1) => {
        if (selectedImageFilenames.length === 0) return;
        const vtId = patient?.VT_ID || '';
        const vtNo = patient?.VT_NO || '';
        const url = route('patient.ultrasound.image.pdf', {
            hn: patient?.op_hn || hn,
            filenames: selectedImageFilenames.join(','),
            layout: layout,
            vt: vtNo,
            vt_id: vtId,
        });
        window.open(url, '_blank');
    };

    const handleConfirmBatchDelete = async () => {
        if (selectedImageFilenames.length === 0) return;
        setIsBatchDeleting(true);
        try {
            await axios.post(route('patient.ultrasound.image.delete', { hn: patient?.op_hn || hn }), {
                filenames: selectedImageFilenames,
            });
            const deletedSet = new Set(selectedImageFilenames);
            setImagesList((prev) => prev.filter((item) => !deletedSet.has(item.filename)));
            if (activeImage && deletedSet.has(activeImage.filename)) {
                setActiveImage(null);
            }
            const count = deletedSet.size;
            setSelectedImageFilenames([]);
            setIsSelectionMode(false);
            setDeletingSelected(false);
            triggerToast('ลบสำเร็จ', `ลบรูปภาพจำนวน ${count} รูปเรียบร้อยแล้ว`);
            router.reload({ only: ['visitImages', 'xrayImageCount'] });
        } catch (err: any) {
            console.error('Failed to delete selected images:', err);
            alert('เกิดข้อผิดพลาดในการลบรูปภาพ: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsBatchDeleting(false);
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

    const activeImageIndex = useMemo(() => {
        if (!activeImage) return -1;
        return imagesList.findIndex((img) => img.filename === activeImage.filename);
    }, [activeImage, imagesList]);

    const handlePrevImage = () => {
        if (activeImageIndex > 0) {
            const prevImg = imagesList[activeImageIndex - 1];
            handleOpenLightbox(prevImg);
        }
    };

    const handleNextImage = () => {
        if (activeImageIndex >= 0 && activeImageIndex < imagesList.length - 1) {
            const nextImg = imagesList[activeImageIndex + 1];
            handleOpenLightbox(nextImg);
        }
    };

    // Keyboard navigation for Lightbox
    useEffect(() => {
        if (!activeImage) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevImage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNextImage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeImage, activeImageIndex, imagesList]);

    const handleRotate = () => {
        setIsNoTransition(false);
        setRotation((prev) => prev + 90);
    };

    const handleResetImage = () => {
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });

        if (rotation % 360 === 0) {
            setIsNoTransition(true);
            setRotation(0);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsNoTransition(false);
                });
            });
        } else {
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

    const [isUploadingImage, setIsUploadingImage] = useState(false);

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



    const procForm = useForm({
        vt_no: patient?.VT_NO || '',
        op_proc: cleanProcValue(patient?.OP_PROC),
    });

    const handleOpenProcModal = () => {
        procForm.setData({
            vt_no: patient?.VT_NO || '',
            op_proc: cleanProcValue(patient?.OP_PROC),
        });
        setIsProcModalOpen(true);
    };

    const handleSaveProc = (e: React.FormEvent) => {
        e.preventDefault();
        if (!patient) return;
        procForm.post(route('patient.medical_info.update', { hn: patient.op_hn }), {
            onSuccess: () => setIsProcModalOpen(false),
        });
    };

    const hasAllergy = patient ? ((patient.STS && patient.STS.toUpperCase() === 'Y') || Boolean(patient.OP_ALLERGIC)) : false;

    const pdfUrl = patient
        ? route('patient.ultrasound.pdf', { hn: patient.op_hn, vt: patient.VT_NO || '' })
        : '';

    const handleOpenBackendPdf = () => {
        if (!patient) return;
        window.open(pdfUrl, '_blank');
    };

    const cameFromHistory = new URLSearchParams(window.location.search).get('from') === 'history';

    const handleBack = () => {
        if (cameFromHistory) {
            router.visit(route('patient.history', { hn }));
        } else {
            router.visit(route('dashboard'));
        }
    };

    const openXrayImagePdf = (layout: 1 | 2 | 4 | 6) => {
        window.open(route('patient.ultrasound.image.pdf', {
            hn: patient?.op_hn || hn,
            vt: patient?.VT_NO || '',
            vt_id: patient?.VT_ID || '',
            layout,
        }), '_blank');
    };

    // Parse multi-page findings and filter out empty pages
    const parsePages = (raw: string | undefined): string[] => {
        if (!raw) return [];
        let pages: string[] = [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                pages = parsed;
            }
        } catch (e) {
            // Not JSON
        }
        if (pages.length === 0) {
            if (raw.includes('<!-- PAGE_BREAK -->')) {
                pages = raw.split('<!-- PAGE_BREAK -->');
            } else {
                pages = [raw];
            }
        }
        return pages.filter((p) => {
            if (!p) return false;
            const doc = new DOMParser().parseFromString(p, 'text/html');
            const text = (doc.body.textContent || '').replace(/\u00A0/g, ' ').trim();
            const hasImg = doc.body.querySelector('img') !== null;
            return text !== '' || hasImg;
        });
    };

    const findingsPages = parsePages(patient?.OP_Ultrasound_Result || patient?.OP_Xray_Result);

    const renderFindingsContent = (text: string) => {
        if (!text) return null;
        const html = text.trim().startsWith('<') ? text : text.split('\n').map((line) => `<p>${line || '<br>'}</p>`).join('');
        return (
            <div
                className="xray-findings-viewer"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title={`ข้อมูลเวชระเบียนผู้ป่วย - ${patient?.fullname || hn}`} />

            <div className="min-h-[calc(100vh-65px)] lg:h-[calc(100vh-65px)] overflow-y-auto lg:overflow-hidden flex flex-col p-3.5 sm:p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-full max-w-full space-y-4 flex flex-col min-h-0 flex-1 lg:overflow-hidden">
                    {/* Navigation Bar & Main Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 liquid-glass-card p-3.5 sm:p-4 rounded-2xl shrink-0">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10 px-4 text-sm font-semibold rounded-full touch-manipulation cursor-pointer"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="h-4.5 w-4.5 mr-1.5" />
                                {cameFromHistory ? 'ย้อนกลับหน้าประวัติ' : 'ย้อนกลับหน้าหลัก'}
                            </Button>
                            <div className="h-6 w-px bg-slate-300/60 hidden sm:block" />
                            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Stethoscope className="h-5.5 w-5.5 text-[#00875A]" />
                                ข้อมูลเวชระเบียนผู้ป่วย (Patient Medical Record)
                            </h2>
                        </div>

                        {/* Top Right Action Buttons: สถานะผู้ป่วย + พิมพ์ภาพ X-Ray & พิมพ์ใบรายงาน */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Ref Doc Button */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10 px-3.5 text-xs sm:text-sm font-bold rounded-full border-emerald-300 text-emerald-800 bg-emerald-50/90 hover:bg-emerald-100 shadow-xs cursor-pointer touch-manipulation flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
                                title="ระบุ / แก้ไขแพทย์ผู้ส่งตรวจ (Ref Doc)"
                                onClick={() => {
                                    setRefDocInput(refDoc || patient?.OP_Ref_Doc || '');
                                    setIsRefDocModalOpen(true);
                                }}
                            >
                                <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span className="shrink-0">Ref Doc</span>
                                {(refDoc || patient?.OP_Ref_Doc) && (
                                    <span className="inline-block whitespace-nowrap text-xs font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                                        {refDoc || patient?.OP_Ref_Doc}
                                    </span>
                                )}
                            </Button>

                            {/* Status Selector Dropdown */}
                            <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
                                <DropdownMenuTrigger asChild disabled={isUpdatingStatus}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isUpdatingStatus}
                                        className={`h-10 px-4 text-xs sm:text-sm font-bold rounded-full flex items-center gap-2 border shadow-xs transition-all cursor-pointer touch-manipulation ${currentStatus === 'W'
                                            ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 hover:text-purple-800'
                                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900'
                                            }`}
                                        title="คลิกเพื่อเปลี่ยนสถานะ: รอตรวจ หรือ ส่งจัดยา"
                                    >
                                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${currentStatus === 'W' ? 'bg-purple-600 animate-pulse' : 'bg-amber-500'}`} />
                                        <span>สถานะ: {currentStatus === 'W' ? 'ส่งจัดยา' : 'รอตรวจ'}</span>
                                        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 p-2 rounded-2xl liquid-glass-card shadow-2xl border border-white/80">
                                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 px-2 py-1 flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#00875A]" />
                                        เลือกสถานะการรักษา
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="my-1.5 bg-slate-200/70" />
                                    <DropdownMenuItem
                                        onClick={() => handleUpdateStatus('D')}
                                        className={`cursor-pointer text-xs sm:text-sm font-bold flex items-center justify-between rounded-xl p-2.5 transition-all duration-150 ${currentStatus === 'D'
                                            ? 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-amber-900 border border-amber-500/30 shadow-xs backdrop-blur-md'
                                            : 'text-slate-700 hover:bg-white/80 hover:text-slate-900 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                                            <span>รอตรวจ</span>
                                        </div>
                                        {currentStatus === 'D' && <Check className="h-4 w-4 text-amber-600 stroke-[2.5]" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => handleUpdateStatus('W')}
                                        className={`cursor-pointer text-xs sm:text-sm font-bold flex items-center justify-between rounded-xl p-2.5 transition-all duration-150 ${currentStatus === 'W'
                                            ? 'bg-gradient-to-r from-purple-500/15 to-purple-500/5 text-purple-900 border border-purple-500/30 shadow-xs backdrop-blur-md'
                                            : 'text-slate-700 hover:bg-white/80 hover:text-slate-900 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="h-2.5 w-2.5 rounded-full bg-purple-600 shrink-0 shadow-[0_0_6px_rgba(147,51,234,0.5)]" />
                                            <span>ส่งจัดยา</span>
                                        </div>
                                        {currentStatus === 'W' && <Check className="h-4 w-4 text-purple-600 stroke-[2.5]" />}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {patient ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0">

                            {/* Column 1 (Leftmost): Patient Profile & Vital Signs */}
                            <div className="lg:col-span-3 xl:col-span-3 h-auto lg:h-full flex flex-col min-h-[420px] lg:min-h-0 overflow-hidden">
                                <Card className="flex-1 min-h-0 flex flex-col overflow-hidden max-h-none lg:max-h-[calc(100vh-140px)]">
                                    <CardHeader className="p-3 sm:p-3.5 shrink-0 border-b border-slate-100 bg-white">
                                        <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 truncate">
                                            <UserCheck className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#00875A] shrink-0" />
                                            <span className="truncate">ข้อมูลรายละเอียดผู้ป่วย (Patient Profile)</span>
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="p-3.5 space-y-3 text-sm flex-1 min-h-0 overflow-y-auto">
                                        {/* Avatar & Basic Info */}
                                        <div className="flex items-center gap-3.5 p-3 liquid-glass-box rounded-xl">
                                            <div className="border-2 border-slate-900 shadow-sm shrink-0 bg-slate-100 overflow-hidden inline-block w-fit h-fit rounded-none">
                                                {patient.Image_PT ? (
                                                    <img
                                                        src={patient.Image_PT}
                                                        alt={patient.fullname}
                                                        className="max-h-32 sm:max-h-36 w-auto max-w-[120px] sm:max-w-[140px] block rounded-none object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-24 sm:w-26 h-30 sm:h-32 bg-slate-100 text-slate-900 flex items-center justify-center">
                                                        <UserCheck className="h-8 w-8 text-slate-900 stroke-[2]" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-0.5 overflow-hidden">
                                                <h4 className="font-bold text-base truncate text-slate-900">
                                                    {patient.fullname}
                                                </h4>
                                                <p className="text-slate-600 font-mono text-xs sm:text-sm">
                                                    CN: <span className="font-bold text-sm text-[#00875A]">{patient.op_hn || '-'}</span>
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    อายุ: <span className="text-slate-700 font-medium">{formatPatientAge(patient)}</span>
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    เพศ: <span className="text-slate-700 font-semibold">{formatPatientSex(patient.op_sex || patient.OP_SEX)}</span>
                                                </p>
                                                <div className="pt-0.5">
                                                    <Badge variant="outline" className="bg-white text-slate-700 text-xs px-2 py-0.5 font-medium">
                                                        Visit No: {patient.VT_NO || '-'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>


                                        {/* Doctor & Time & Allergy Status */}
                                        <div className="space-y-1.5 text-xs sm:text-sm">
                                            <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                <span className="text-slate-500 font-medium">แพทย์ผู้ตรวจ:</span>
                                                <span className="font-bold text-slate-800 text-xs sm:text-sm">{patient.OP_SEND_DR_Name || '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                <span className="text-slate-500 font-medium">เวลาส่งตัว:</span>
                                                <span className="font-mono font-semibold text-slate-700 text-xs sm:text-sm">{formatDateGregorian(patient.formatted_date || patient.pb_now1)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                <span className="text-slate-500 font-medium">สถานะแพ้ยา (STS):</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold text-xs sm:text-sm ${hasAllergy ? 'text-rose-600 flex items-center gap-1.5' : 'text-[#007A4D] flex items-center gap-1.5'}`}>
                                                        {hasAllergy ? <><Pill className="h-4 w-4 text-rose-600 fill-rose-100" /> มีประวัติแพ้ยา (Y)</> : <><ShieldCheck className="h-4.5 w-4.5 text-[#00875A] fill-[#E8F8F2]" /> ไม่มีประวัติแพ้ยา (N)</>}
                                                    </span>
                                                    {patient.OP_ALLERGIC && (
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

                                        {/* Allergy Details Dropdown/Expansion */}
                                        {patient.OP_ALLERGIC && showAllergyDetails && (
                                            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs sm:text-sm leading-relaxed font-semibold shadow-2xs animate-in fade-in-50 duration-200">
                                                <p className="font-bold flex items-center gap-1.5 text-rose-700 mb-0.5 text-xs shrink-0">
                                                    <Pill className="h-3.5 w-3.5 text-rose-600 fill-rose-100 shrink-0" /> รายละเอียดการแพ้ยา:
                                                </p>
                                                <p className="whitespace-pre-wrap">{patient.OP_ALLERGIC}</p>
                                            </div>
                                        )}

                                        {/* Vital Signs Grid */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-slate-800 text-xs sm:text-sm">
                                                    สัญญาณชีพและข้อมูลซักประวัติ (Vital Signs)
                                                </p>
                                                {patient && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => setIsVitalsModalOpen(true)}
                                                        size="sm"
                                                        className="h-6 px-2.5 text-[11px] font-bold liquid-glass-btn-primary text-white rounded-full flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                                                    >
                                                        <Edit3 className="h-3 w-3 shrink-0" />
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
                                                        {formatVitalValue(patient.OP_BT, '°C')}
                                                    </span>
                                                </div>
                                                <div className="p-2 liquid-glass-box rounded-xl">
                                                    <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                        <Weight className="h-3.5 w-3.5 text-[#00875A]" /> น้ำหนัก (BW)
                                                    </span>
                                                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                        {formatVitalValue(patient.OP_WEIGHT, 'Kg')}
                                                    </span>
                                                </div>
                                                <div className="p-2 liquid-glass-box rounded-xl">
                                                    <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                        <Ruler className="h-3.5 w-3.5 text-[#00875A]" /> ส่วนสูง (HT)
                                                    </span>
                                                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                        {formatVitalValue(patient.OP_HIGHT, 'cm')}
                                                    </span>
                                                </div>
                                                <div className="p-2 liquid-glass-box rounded-xl">
                                                    <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                        <Activity className="h-3.5 w-3.5 text-[#00875A]" /> ชีพจร (P)
                                                    </span>
                                                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                        {formatVitalValue(patient.OP_HR, 'bpm')}
                                                    </span>
                                                </div>
                                                <div className="p-2 liquid-glass-box rounded-xl">
                                                    <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                        <HeartPulse className="h-3.5 w-3.5 text-[#00875A]" /> ความดัน (BP)
                                                    </span>
                                                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                        {patient.OP_BP_UP && patient.OP_BP_DW
                                                            ? `${cleanDecimals(patient.OP_BP_UP)} / ${cleanDecimals(patient.OP_BP_DW)}`
                                                            : '-'}
                                                    </span>
                                                </div>
                                                <div className="p-2 liquid-glass-box rounded-xl">
                                                    <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                        <Wind className="h-3.5 w-3.5 text-[#00875A]" /> หายใจ (R)
                                                    </span>
                                                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                        {formatVitalValue(patient.OP_RR || patient.OP_R, 'bpm')}
                                                    </span>
                                                </div>
                                                <div className="p-2 liquid-glass-box rounded-xl">
                                                    <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                        <Activity className="h-3.5 w-3.5 text-[#00875A]" /> O₂ Sat
                                                    </span>
                                                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                        {formatVitalValue(patient.OP_O2SAT, '%')}
                                                    </span>
                                                </div>
                                                {/* อาการเบื้องต้น (Chief Complaint) */}
                                                <div className="p-2 liquid-glass-box rounded-xl space-y-0.5">
                                                    <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5 truncate">
                                                        <FileText className="h-3.5 w-3.5 text-[#00875A]" /> อาการเบื้องต้น (Chief Complaint)
                                                    </span>
                                                    <span className="font-medium text-xs sm:text-sm text-slate-800 block truncate" title={patient.OP_CHIEF || patient.OP_DETAIL || '-'}>
                                                        {patient.OP_CHIEF || patient.OP_DETAIL || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ผลการวินิจฉัย (Diagnosis) */}
                                        <div className="p-2.5 liquid-glass-box rounded-xl space-y-1">
                                            <p className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                                                <Stethoscope className="h-3.5 w-3.5 text-[#00875A]" /> ผลการวินิจฉัย (Diagnosis)
                                            </p>
                                            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                                                {patient.OP_DIAG || '-'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Column 2 (Middle): X-Ray / Ultrasound Report Canvas */}
                            <div className="lg:col-span-5 xl:col-span-5 h-auto lg:h-full flex flex-col min-h-0 overflow-hidden">
                                <Card className="overflow-hidden flex-1 min-h-[360px] lg:min-h-0 flex flex-col border-slate-300/60 shadow-sm bg-slate-200/40">
                                    <CardHeader className="p-3 sm:p-3.5 flex flex-row items-center justify-between shrink-0 border-b border-slate-100 bg-white">
                                        <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5 truncate">
                                            <FileCheck className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#00875A] shrink-0" />
                                            <span className="truncate">ผลตรวจ</span>
                                            {findingsPages.length > 0 && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 font-bold">
                                                    {findingsPages.length} หน้า
                                                </Badge>
                                            )}
                                        </CardTitle>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {/* Zoom Controls */}
                                            {findingsPages.length > 0 && (
                                                <div className="flex items-center gap-0.5 bg-slate-100/90 border border-slate-200/80 rounded-xl p-0.5 shadow-2xs">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 rounded-md text-slate-600 hover:bg-white touch-manipulation cursor-pointer"
                                                        title="ย่อขนาดกระดาษ (75%)"
                                                        onClick={() => setZoomMode('75')}
                                                    >
                                                        <ZoomOut className="h-3 w-3" />
                                                    </Button>
                                                    <span className="text-[10px] font-bold px-1 min-w-[2.2rem] text-center text-slate-700 select-none">
                                                        {Math.round(scale * 100)}%
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 rounded-md text-slate-600 hover:bg-white touch-manipulation cursor-pointer"
                                                        title="ขยายขนาดกระดาษ (100%)"
                                                        onClick={() => setZoomMode('100')}
                                                    >
                                                        <ZoomIn className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-6 px-1.5 text-[9px] font-bold rounded-md transition-colors touch-manipulation cursor-pointer ${zoomMode === 'fit' ? 'bg-[#00875A] text-white shadow-2xs' : 'text-slate-600 hover:bg-white'}`}
                                                        title="ปรับพอดีหน้าจออัตโนมัติ"
                                                        onClick={() => setZoomMode(zoomMode === 'fit' ? '100' : 'fit')}
                                                    >
                                                        Fit
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Edit Text Findings */}
                                            <Link href={route('patient.ultrasound.edit', { hn: patient.op_hn, vt: patient.VT_NO || '', ...(cameFromHistory ? { from: 'history' } : {}) })}>
                                                <Button
                                                    size="sm"
                                                    className="h-7 min-w-[82px] px-2.5 text-xs liquid-glass-btn-primary text-white font-bold rounded-full flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                                    title="พิมพ์ หรือแก้ไขข้อความผลตรวจ X-Ray"
                                                >
                                                    <Edit3 className="h-3 w-3 shrink-0" />
                                                    <span>พิมพ์</span>
                                                </Button>
                                            </Link>

                                            {/* Print PDF Button (Black Theme) */}
                                            <Button
                                                variant="dark"
                                                onClick={handleOpenBackendPdf}
                                                size="sm"
                                                disabled={findingsPages.length === 0}
                                                className="h-7 min-w-[82px] px-2.5 text-xs text-white font-bold rounded-full flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                                                title={findingsPages.length === 0 ? 'ยังไม่มีข้อมูลรายงานผลการตรวจ' : 'พิมพ์ PDF รายงานข้อความผลตรวจ X-Ray / อัลตราซาวด์'}
                                            >
                                                <Printer className="h-3 w-3 shrink-0" />
                                                <span>Print</span>
                                            </Button>
                                        </div>
                                    </CardHeader>

                                    <CardContent
                                        ref={containerRef}
                                        className={`flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 bg-slate-50/50 border-0 rounded-b-xl flex flex-col items-center ${findingsPages.length === 0 ? 'justify-center' : ''} ${zoomMode === 'fit' ? 'overflow-x-hidden' : 'overflow-x-auto'}`}
                                        style={{ WebkitOverflowScrolling: 'touch' }}
                                    >
                                        {findingsPages.length > 0 ? (
                                            <div
                                                style={{
                                                    width: scale !== 1 ? `${Math.round((PAGE_WIDTH + 80) * scale)}px` : `${PAGE_WIDTH + 80}px`,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <div
                                                    className="flex flex-col items-center gap-8 origin-top py-2"
                                                    style={{
                                                        transform: scale !== 1 ? `scale(${scale})` : undefined,
                                                        transformOrigin: 'top center',
                                                        width: PAGE_WIDTH + 80,
                                                        marginBottom: scale < 1 ? `-${Math.round((1 - scale) * (findingsPages.length * (CARD_HEIGHT + 60)))}px` : undefined,
                                                    }}
                                                >
                                                    {findingsPages.map((pageText, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex flex-col items-center group shrink-0"
                                                        >
                                                            {/* Page Header Bar */}
                                                            <div className="w-full flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1.5 px-1">
                                                                <span className="text-slate-800 font-bold">ผลตรวจ - หน้า {idx + 1}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="liquid-glass-box text-slate-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                                                        หน้า {idx + 1} / {findingsPages.length}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Google Docs Paper Card */}
                                                            <div
                                                                className="bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-300/80 rounded-md relative transition-shadow group-hover:shadow-[0_12px_36px_rgba(0,0,0,0.16)] shrink-0"
                                                                style={{
                                                                    width: PAGE_WIDTH + 80,
                                                                    height: CARD_HEIGHT,
                                                                    maxHeight: CARD_HEIGHT,
                                                                    minHeight: CARD_HEIGHT,
                                                                    padding: `${CARD_PADDING_Y}px 40px`,
                                                                    overflow: 'hidden',
                                                                    boxSizing: 'border-box',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <div className="w-full h-full overflow-hidden">
                                                                    {renderFindingsContent(pageText)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-6 text-center liquid-glass-box rounded-xl border border-dashed border-slate-300/80 space-y-3 bg-white w-full max-w-sm shadow-2xs">
                                                <FileText className="h-8 w-8 text-slate-300 mx-auto stroke-[1.5]" />
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-600">ยังไม่มีข้อมูลรายงานผลการ Ultrasound</p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">คลิกปุ่มด้านล่างเพื่อพิมพ์บันทึกผลตรวจ</p>
                                                </div>
                                                <Link href={route('patient.ultrasound.edit', { hn: patient.op_hn, vt: patient.VT_NO || '', ...(cameFromHistory ? { from: 'history' } : {}) })}>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-4 text-xs liquid-glass-btn-primary text-white font-bold rounded-full inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5 mr-1" />
                                                        <span>พิมพ์ผล Ultrasound</span>
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Column 3 (Rightmost): Visit Images Upload & Gallery Card */}
                            <div className="lg:col-span-4 xl:col-span-4 h-auto lg:h-full flex flex-col min-h-0 overflow-hidden">
                                <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border-slate-300/60 shadow-sm bg-white">
                                    <CardHeader className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 border-b border-slate-100 bg-white">
                                        <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5 truncate">
                                            <Camera className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#00875A] shrink-0" />
                                            <span className="truncate">{isSelectionMode ? 'เลือกรูปภาพ' : 'รูปภาพ'}</span>
                                            {isSelectionMode ? (
                                                <Badge variant="secondary" className="bg-[#E8F8F2] text-[#007A4D] border border-[#A7F3D0] font-bold text-[10px] px-2 py-0 rounded-full animate-in fade-in shrink-0">
                                                    เลือกอยู่ {selectedImageFilenames.length} / {imagesList.length} รูป
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 font-bold">
                                                    {imagesList.length} รูป
                                                </Badge>
                                            )}
                                        </CardTitle>

                                        {/* Toolbar Buttons */}
                                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                            {!isSelectionMode ? (
                                                <>
                                                    {/* Upload Button that opens Modal */}
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setIsUploadModalOpen(true)}
                                                        className="h-7 min-w-[76px] px-2.5 text-xs liquid-glass-btn-primary text-white font-bold rounded-full flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                                                        title="เปิดหน้าต่างอัปโหลดรูปภาพ"
                                                    >
                                                        <Upload className="h-3 w-3 shrink-0" />
                                                        <span>อัปโหลด</span>
                                                    </Button>

                                                    {/* Print Images Dropdown (Black Theme) */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild disabled={imagesList.length === 0}>
                                                            <Button
                                                                variant="dark"
                                                                size="sm"
                                                                disabled={imagesList.length === 0}
                                                                className="h-7 min-w-[76px] px-2.5 text-xs text-white font-bold rounded-full flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                                                                title={imagesList.length === 0 ? 'ไม่มีรูปภาพ X-Ray ของการตรวจครั้งนี้' : 'พิมพ์ PDF เฉพาะรูปภาพ X-Ray / อัลตราซาวด์'}
                                                            >
                                                                <Printer className="h-3 w-3 shrink-0" />
                                                                <span>Print</span>
                                                                <ChevronDown className="h-3 w-3 shrink-0" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuLabel className="text-xs font-bold text-slate-500">
                                                                เลือกรูปแบบหน้า (PDF)
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {([1, 2, 4, 6] as const).map((layout) => (
                                                                <DropdownMenuItem
                                                                    key={layout}
                                                                    className="cursor-pointer text-xs font-medium"
                                                                    onClick={() => openXrayImagePdf(layout)}
                                                                >
                                                                    {layout} รูปต่อหน้า
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    {/* Button: เลือกรูปภาพ (shown when imagesList.length > 0) */}
                                                    {imagesList.length > 0 && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={handleToggleSelectionMode}
                                                            className="h-7 px-2.5 text-xs font-bold rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
                                                            title="เข้าสู่โหมดเลือกรูปภาพ"
                                                        >
                                                            <CheckSquare className="h-3 w-3 text-slate-900" />
                                                            <span>เลือกรูปภาพ</span>
                                                        </Button>
                                                    )}

                                                    {/* Full Management Link */}
                                                    <Link href={route('patient.ultrasound.upload', { hn: patient?.op_hn || hn, vt: patient?.VT_NO || '', ...(cameFromHistory ? { from: 'history' } : {}) })}>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 min-w-[76px] px-2 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-full flex items-center justify-center gap-1 cursor-pointer"
                                                            title="ไปยังหน้าจัดการรูปภาพเต็มรูปแบบ"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            <span>ดูภาพทุก Visit</span>
                                                        </Button>
                                                    </Link>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Print Selected Dropdown (shown when selectedImageFilenames.length > 0) */}
                                                    {selectedImageFilenames.length > 0 && (
                                                        <>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-7 px-2.5 text-xs font-bold liquid-glass-btn-primary text-white rounded-full flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                                                                        title="พิมพ์ PDF เฉพาะรูปที่เลือก"
                                                                    >
                                                                        <Printer className="h-3 w-3 shrink-0" />
                                                                        <span>Print ({selectedImageFilenames.length})</span>
                                                                        <ChevronDown className="h-3 w-3 shrink-0" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <DropdownMenuLabel className="text-xs font-bold text-slate-500">
                                                                        เลือกรูปแบบหน้า (PDF)
                                                                    </DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    {([1, 2, 4, 6] as const).map((layout) => (
                                                                        <DropdownMenuItem
                                                                            key={layout}
                                                                            className="cursor-pointer text-xs font-medium"
                                                                            onClick={() => openBatchXrayImagePdf(layout)}
                                                                        >
                                                                            {layout} รูปต่อหน้า
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>

                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => setDeletingSelected(true)}
                                                                className="h-7 px-2.5 text-xs font-bold rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                                                title="ลบรูปภาพที่เลือก"
                                                            >
                                                                <Trash2 className="h-3 w-3 shrink-0" />
                                                                <span>ลบ ({selectedImageFilenames.length})</span>
                                                            </Button>
                                                        </>
                                                    )}

                                                    {/* Select All / Deselect All Button */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleSelectAllImages}
                                                        className="h-7 px-2.5 text-xs font-bold rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                                                    >
                                                        {selectedImageFilenames.length === imagesList.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                                                    </Button>

                                                    {/* Cancel Button */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={handleToggleSelectionMode}
                                                        className="h-7 px-2.5 text-xs font-bold rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                                                    >
                                                        ยกเลิก
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className={`p-3 space-y-3 flex-1 min-h-0 overflow-y-auto bg-slate-50/50 flex flex-col ${imagesList.length === 0 ? 'items-center justify-center' : ''}`}>
                                        {/* Image Grid (Clean Studio / PACS Style) */}
                                        {imagesList.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1 sm:gap-1.5">
                                                {imagesList.map((img) => {
                                                    const isSelected = selectedImageFilenames.includes(img.filename);
                                                    return (
                                                        <div
                                                            key={img.id}
                                                            data-img-filename={img.filename}
                                                            onPointerDown={(e) => handleCardPointerDown(e, img)}
                                                            onPointerEnter={(e) => handleCardPointerEnter(e, img)}
                                                            className={`group relative aspect-square rounded-none overflow-hidden transition-all duration-200 select-none touch-manipulation cursor-pointer ${
                                                                isSelectionMode
                                                                    ? isSelected
                                                                        ? 'border-2 border-[#00875A] ring-2 ring-[#00875A]/40 shadow-md scale-[0.98]'
                                                                        : 'border border-slate-800/40 hover:border-slate-400 opacity-85 hover:opacity-100 bg-slate-950'
                                                                    : 'border border-slate-800/40 hover:border-[#00875A] bg-slate-950 shadow-2xs hover:shadow-md'
                                                            }`}
                                                            onClick={() => {
                                                                if (isSelectionMode) {
                                                                    return;
                                                                } else {
                                                                    if (isLongPressTriggeredRef.current) {
                                                                        isLongPressTriggeredRef.current = false;
                                                                        return;
                                                                    }
                                                                    handleOpenLightbox(img);
                                                                }
                                                            }}
                                                            onTouchStart={(e) => {
                                                                if (!isSelectionMode) handleTouchStart(e, img);
                                                            }}
                                                            onTouchMove={handleTouchMove}
                                                            onTouchEnd={handleTouchEnd}
                                                            onTouchCancel={handleTouchEnd}
                                                            onContextMenu={(e) => {
                                                                if (!isSelectionMode) handleContextMenu(e, img);
                                                            }}
                                                            style={{ WebkitTouchCallout: 'none', touchAction: isSelectionMode ? 'none' : 'auto' }}
                                                        >
                                                            <img
                                                                src={img.url}
                                                                alt={img.filename}
                                                                className={`w-full h-full object-cover pointer-events-none select-none transition-transform duration-300 ${
                                                                    !isSelectionMode ? 'group-hover:scale-105' : isSelected ? 'scale-105' : ''
                                                                }`}
                                                                loading="lazy"
                                                            />

                                                            {/* Selection Mode Checkbox Badge Overlay */}
                                                            {isSelectionMode && (
                                                                <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none transition-all duration-150">
                                                                    {isSelected ? (
                                                                        <div className="h-5 w-5 rounded-full bg-[#00875A] text-white flex items-center justify-center shadow-md border-2 border-white ring-1 ring-black/20">
                                                                            <Check className="h-3 w-3 stroke-[3]" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="h-5 w-5 rounded-full bg-black/40 border-2 border-white/80 shadow-sm backdrop-blur-xs group-hover:border-white transition-colors" />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-6 text-center liquid-glass-box rounded-xl border border-dashed border-slate-300/80 space-y-3 bg-white w-full max-w-sm shadow-2xs">
                                                <Camera className="h-8 w-8 text-slate-300 mx-auto stroke-[1.5]" />
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-600">ยังไม่มีรูปภาพสำหรับการตรวจครั้งนี้</p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">คลิกปุ่มด้านล่างเพื่ออัปโหลดรูปภาพเข้าสู่ Visit {patient.VT_NO || '-'}</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setIsUploadModalOpen(true)}
                                                    className="h-8 px-4 text-xs liquid-glass-btn-primary text-white font-bold rounded-full inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                                                >
                                                    <Upload className="h-3.5 w-3.5 mr-1" />
                                                    <span>อัปโหลดรูปภาพ</span>
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <Card className="border-slate-200 shadow-sm bg-white p-12 text-center">
                            <CardContent className="space-y-4">
                                <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
                                <h3 className="text-lg font-bold text-slate-800">ไม่พบข้อมูลผู้ป่วย CN: {hn}</h3>
                                <p className="text-sm text-slate-500">กรุณาตรวจสอบ CN อีกครั้งหรือกลับไปที่รายการผู้ป่วยเพื่อค้นหาอีกครั้ง</p>
                                <Link href={route('dashboard')}>
                                    <Button className="bg-[#00875A] hover:bg-[#006e49] text-white font-bold rounded-full px-6">
                                        กลับสู่หน้าหลัก
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>



            {/* Patient Vitals & Clinical Info Modal */}
            <PatientVitalsModal
                open={isVitalsModalOpen}
                onOpenChange={setIsVitalsModalOpen}
                patient={patient}
                onSuccess={() => {
                    triggerToast('บันทึกสำเร็จ', 'บันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว');
                }}
            />


            {/* Ref Doc Edit / Select Modal */}
            <Dialog open={isRefDocModalOpen} onOpenChange={setIsRefDocModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-slate-900 shrink-0" />
                            <span>แพทย์ผู้ส่งตรวจ (Ref. Doctor)</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Patient context badge (3 lines) */}
                        <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 text-xs sm:text-[13px] space-y-1.5 leading-relaxed">
                            <div className="flex items-baseline">
                                <span className="w-16 sm:w-18 text-slate-500 font-medium shrink-0">ผู้ป่วย :</span>
                                <span className="font-bold text-slate-900 truncate">{patient?.fullname || '-'}</span>
                            </div>
                            <div className="flex items-baseline">
                                <span className="w-16 sm:w-18 text-slate-500 font-medium shrink-0">CN :</span>
                                <span className="font-bold text-[#00875A] font-mono">{patient?.op_hn || hn}</span>
                            </div>
                            <div className="flex items-baseline">
                                <span className="w-16 sm:w-18 text-slate-500 font-medium shrink-0">Visit No :</span>
                                <span className="font-semibold text-slate-800 font-mono">
                                    <span className="font-bold text-slate-900">{patient?.VT_NO || '-'}</span>
                                    {(patient?.formatted_date || patient?.pb_now1) && (
                                        <span className="text-slate-600 font-medium ml-1.5">
                                            - {formatDateGregorian(patient?.formatted_date || patient?.pb_now1)}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Text Input with Clear X Button */}
                        <div className="space-y-1.5">
                            <Label htmlFor="ref-doc-input-detail" className="text-xs font-semibold text-slate-700">
                                ชื่อแพทย์ผู้ส่งตรวจ (Ref Doc Name)
                            </Label>
                            <div className="relative">
                                <Input
                                    id="ref-doc-input-detail"
                                    ref={refDocInputRef}
                                    value={refDocInput}
                                    onChange={(e) => setRefDocInput(e.target.value)}
                                    placeholder="ระบุชื่อแพทย์ผู้ส่งตรวจ..."
                                    className="h-10 text-sm font-medium focus-visible:ring-emerald-500 rounded-xl pr-9"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSaveRefDoc();
                                        }
                                    }}
                                />
                                {refDocInput && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRefDocInput('');
                                            if (refDocInputRef.current) {
                                                refDocInputRef.current.focus();
                                            }
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                                        title="ล้างข้อมูล / ยกเลิกการเลือก"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Pick Doctors from System */}
                        {doctors && doctors.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                                    <span>เลือกจากรายชื่อแพทย์ในระบบ:</span>
                                    <span className="text-[11px] text-slate-400 font-normal">คลิกเพื่อเลือกรายชื่อ</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                    {doctors.map((d) => {
                                        const isSelected = (refDocInput || '').trim() === d.name.trim();
                                        return (
                                            <button
                                                key={d.id || d.name}
                                                type="button"
                                                onClick={() => {
                                                    setRefDocInput(d.name);
                                                    if (refDocInputRef.current) {
                                                        refDocInputRef.current.focus();
                                                    }
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border text-left transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                                                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {d.is_doctor ? 'DR' : 'MD'}
                                                    </div>
                                                    <span className="truncate">{d.name}</span>
                                                </div>
                                                {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full px-4 text-xs font-semibold cursor-pointer transition-all active:scale-95"
                            onClick={() => setIsRefDocModalOpen(false)}
                            disabled={isSavingRefDoc}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="liquid-glass-btn-primary text-white font-bold rounded-full px-4 text-xs cursor-pointer transition-all active:scale-95 shadow-xs"
                            onClick={() => handleSaveRefDoc()}
                            disabled={isSavingRefDoc}
                        >
                            {isSavingRefDoc ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                    <span>กำลังบันทึก...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-1.5" />
                                    <span>บันทึก</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
            {/* Dedicated Upload Modal Dialog (Matches UltrasoundImage.tsx Studio Style) */}
            <Dialog
                open={isUploadModalOpen}
                onOpenChange={(open) => {
                    if (!isUploadingXray) {
                        setIsUploadModalOpen(open);
                        if (!open) {
                            setSelectedFiles([]);
                        }
                    }
                }}
            >
                <DialogContent className="sm:max-w-xl rounded-3xl p-6 liquid-glass-card shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                            <UploadCloud className="h-5.5 w-5.5 text-[#00875A]" />
                            <span>อัปโหลดรูปภาพ X-Ray / อัลตราซาวด์</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Target Visit Display (Fixed to Current Visit) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                <span>รอบการตรวจ (Target Visit):</span>
                                <span className="text-[11px] text-slate-500 font-normal">ระบุ Visit ที่ต้องการบันทึกภาพ</span>
                            </label>
                            <div className="w-full h-11 px-3.5 bg-white/95 border border-slate-300 rounded-2xl font-semibold text-slate-800 text-xs sm:text-sm flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#E8F8F2] text-[#00875A] border border-[#00875A]/20 shrink-0">
                                        Visit No: {patient?.VT_NO || '-'}
                                    </span>
                                    <span className="truncate">
                                        {patient?.formatted_date || patient?.pb_now1 || ''}
                                    </span>

                                    {patient?.OP_SEND_DR_Name && (
                                        <span className="text-xs text-slate-500 font-medium truncate hidden sm:inline">
                                            ({patient.OP_SEND_DR_Name})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Drag & Drop File Zone */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDraggingUpload(true);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDraggingUpload(false);
                            }}
                            onDrop={handleModalDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-6 sm:p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-200 ${
                                isDraggingUpload
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
                                disabled={isUploadingXray}
                            />
                            <div className="flex flex-col items-center justify-center space-y-2">
                                <div className="w-12 h-12 rounded-2xl bg-[#E8F8F2] text-[#00875A] flex items-center justify-center shadow-inner">
                                    <UploadCloud className="h-6 w-6 animate-bounce" />
                                </div>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                                    ลากไฟล์มาวางที่นี่ หรือ <span className="text-[#00875A] underline font-bold">เลือกไฟล์ในเครื่อง</span>
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

                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {filePreviews.map((p, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 bg-white border border-slate-200/90 rounded-xl text-xs shadow-2xs gap-2"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <img
                                                    src={p.preview}
                                                    alt={p.file.name}
                                                    className="h-10 w-10 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100"
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 truncate text-xs">
                                                        {p.file.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-mono">
                                                        {(p.file.size / 1024).toFixed(0)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSelectedFile(idx)}
                                                className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer rounded-lg hover:bg-rose-50 shrink-0"
                                                title="ลบไฟล์นี้"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload Progress Bar */}
                        {isUploadingXray && (
                            <div className="space-y-2 rounded-2xl border border-[#A7F3D0] bg-[#E8F8F2]/70 p-3.5 shadow-xs animate-in fade-in">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                                    <span className="flex items-center gap-1.5 truncate">
                                        <Loader2 className="h-4 w-4 animate-spin text-[#00875A] shrink-0" />
                                        <span className="truncate">{uploadStatusText || 'กำลังอัปโหลดรูปภาพ...'}</span>
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {uploadDetailText && (
                                            <span className="font-mono text-[11px] font-medium text-slate-500">{uploadDetailText}</span>
                                        )}
                                        <span className="font-mono font-bold text-[#00875A]">{uploadProgress || 0}%</span>
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner p-0.5">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#00B377] via-[#00875A] to-[#006B44] rounded-full transition-all duration-300 ease-out shadow-xs"
                                        style={{ width: `${uploadProgress || 0}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsUploadModalOpen(false);
                                setSelectedFiles([]);
                            }}
                            disabled={isUploadingXray}
                            className="rounded-full px-5 h-9 text-xs"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            onClick={handleUploadSelectedFiles}
                            disabled={isUploadingXray || selectedFiles.length === 0}
                            className="liquid-glass-btn-primary text-white font-bold h-9 px-6 rounded-full shadow-md transition-all cursor-pointer text-xs flex items-center gap-1.5"
                        >
                            {isUploadingXray ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                    <span>กำลังอัปโหลด... {uploadProgress}%</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="h-4 w-4 mr-1.5" />
                                    <span>บันทึกและอัปโหลด ({selectedFiles.length} ไฟล์)</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lightbox Interactive Preview Modal (Matches UltrasoundImage.tsx) */}
            <Dialog open={Boolean(activeImage)} onOpenChange={() => setActiveImage(null)}>
                <DialogContent className="sm:max-w-6xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-0 rounded-3xl overflow-hidden pacs-viewer-modal !bg-black !text-white shadow-2xl">
                    <DialogHeader className="p-3.5 sm:p-4 !bg-black border-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                        <div className="overflow-hidden sm:pr-8">
                            <DialogTitle className="text-sm sm:text-base font-bold !text-white truncate flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <span className="truncate">{activeImage?.filename.split('/').pop()}</span>
                                <Badge variant="secondary" className="!bg-slate-800 !text-slate-300 !border-slate-700 font-mono text-[10px] px-2 whitespace-nowrap shrink-0">
                                    {activeImage?.size}
                                </Badge>
                                {activeImageIndex >= 0 && (
                                    <Badge className="!bg-[#00875A] !text-white font-mono text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs whitespace-nowrap shrink-0">
                                        รูปที่ {activeImageIndex + 1} / {imagesList.length}
                                    </Badge>
                                )}
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
                        {/* Floating Previous (<) Button */}
                        {imagesList.length > 1 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrevImage();
                                }}
                                disabled={activeImageIndex <= 0}
                                className={`absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 h-11 w-11 sm:h-13 sm:w-13 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer select-none touch-manipulation group shadow-2xl ${
                                    activeImageIndex <= 0
                                        ? 'opacity-20 !bg-slate-900/40 text-slate-500 border border-white/5 cursor-not-allowed pointer-events-none'
                                        : 'opacity-85 hover:opacity-100 bg-slate-900/80 hover:bg-slate-800/95 text-white backdrop-blur-md border border-white/20 hover:border-white/40 hover:scale-110 active:scale-95'
                                }`}
                                title="รูปภาพก่อนหน้า (หรือกดลูกศรซ้าย ←)"
                                aria-label="Previous image"
                            >
                                <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7 group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        )}

                        {/* Floating Next (>) Button */}
                        {imagesList.length > 1 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNextImage();
                                }}
                                disabled={activeImageIndex >= imagesList.length - 1}
                                className={`absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 h-11 w-11 sm:h-13 sm:w-13 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer select-none touch-manipulation group shadow-2xl ${
                                    activeImageIndex >= imagesList.length - 1
                                        ? 'opacity-20 !bg-slate-900/40 text-slate-500 border border-white/5 cursor-not-allowed pointer-events-none'
                                        : 'opacity-85 hover:opacity-100 bg-slate-900/80 hover:bg-slate-800/95 text-white backdrop-blur-md border border-white/20 hover:border-white/40 hover:scale-110 active:scale-95'
                                }`}
                                title="รูปภาพถัดไป (หรือกดลูกศรขวา →)"
                                aria-label="Next image"
                            >
                                <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        )}

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

            {/* Delete Single Image Confirmation Modal (Matches UltrasoundImage.tsx Style) */}
            <Dialog open={Boolean(deletingImage)} onOpenChange={() => setDeletingImage(null)}>
                <DialogContent className="sm:max-w-md rounded-3xl p-6 liquid-glass-card shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-rose-600" />
                            <span>ยืนยันการลบรูปภาพ</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-sm text-slate-600">
                        คุณแน่ใจหรือไม่ว่าต้องการลบรูปนี้?
                    </div>
                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingImage(null)}
                            disabled={Boolean(isDeletingImage)}
                            className="rounded-full px-5 h-9 text-xs"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteConfirm}
                            disabled={Boolean(isDeletingImage)}
                            className="rounded-full px-5 h-9 text-xs font-bold shadow-md cursor-pointer"
                        >
                            {isDeletingImage ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                    <span>กำลังลบ...</span>
                                </>
                            ) : (
                                <span>ลบรูปภาพ</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Delete Confirmation Dialog */}
            <Dialog open={deletingSelected} onOpenChange={setDeletingSelected}>
                <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                            <span>ยืนยันการลบรูปภาพที่เลือก ({selectedImageFilenames.length} รูป)</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm text-slate-600 pt-2 leading-relaxed">
                            คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพที่เลือกจำนวน <strong className="text-rose-600 font-bold">{selectedImageFilenames.length} รูป</strong> ออกจากระบบอย่างถาวร? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 rounded-full font-bold border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                            onClick={() => setDeletingSelected(false)}
                            disabled={isBatchDeleting}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-9 px-4 rounded-full font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                            onClick={handleConfirmBatchDelete}
                            disabled={isBatchDeleting}
                        >
                            {isBatchDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>กำลังลบ...</span>
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" />
                                    <span>ยืนยันการลบ ({selectedImageFilenames.length} รูป)</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Custom Right-Click Context Menu (Liquid Glass) */}
            {contextMenu.isOpen && contextMenu.image && (
                <div
                    className="fixed z-[99999] min-w-[200px] rounded-2xl liquid-glass-context-menu p-1.5 text-slate-800 animate-in fade-in-50 zoom-in-95 duration-150 select-none shadow-2xl"
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
                                vt: patient?.VT_NO || contextMenu.image.vt_no || '',
                                vt_id: patient?.VT_ID || contextMenu.image.vt_id || '',
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
                            download={contextMenu.image.filename.split('/').pop()}
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
                                if (img) handleDeleteImage(img);
                            }}
                        >
                            <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
                            <span>ลบรูปภาพนี้</span>
                        </button>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
