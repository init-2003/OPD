import React, { useState, useEffect, useRef, Fragment } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { PatientVisit } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { Textarea } from '@/Components/ui/textarea';
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
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { formatDateGregorian, formatVitalValue, cleanDecimals, cleanProcValue, formatPatientAge } from '@/lib/utils';
import PatientVitalsModal from '@/Components/PatientVitalsModal';

// ---------- Page geometry (matches A4 paper 210mm & mPDF findings area & Editor) ----------
const PAPER_WIDTH = 794; // px standard A4 width (210mm @ 96 DPI)
const PAGE_WIDTH = 714; // px outer width of the page card content area (794px - 80px padding)
const LINE_H = 32.9; // px per line (16pt, matches mPDF line pitch)
const DEFAULT_CAP_LINES = 23; // 23 lines per page (matches mPDF findings lines)
const CARD_PADDING_Y = 40; // px top/bottom padding of paper card
const CARD_HEIGHT = Math.round(LINE_H * DEFAULT_CAP_LINES) + (CARD_PADDING_Y * 2); // 837px

interface PatientDetailProps {
    patient: PatientVisit | null;
    hn: string;
    xrayImageCount?: number;
}

export default function PatientDetail({ patient, hn, xrayImageCount = 0 }: PatientDetailProps) {
    const [showAllergyDetails, setShowAllergyDetails] = useState(false);
    const [isProcModalOpen, setIsProcModalOpen] = useState(false);
    const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);

    // Zoom & responsive scale for paper canvas
    const [zoomMode, setZoomMode] = useState<'fit' | '100' | '90' | '75'>('100');
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && patient) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('image', file);

            setIsUploadingImage(true);
            try {
                await axios.post(route('patient.image.upload', { hn: patient.op_hn || hn }), formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setIsUploadingImage(false);
                router.reload({
                    only: ['patient'],
                });
                triggerToast('อัปโหลดรูปภาพสำเร็จ', 'อัปโหลดรูปภาพประจำตัวผู้ป่วยเรียบร้อยแล้ว');
            } catch (err) {
                setIsUploadingImage(false);
            }
        }
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

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild disabled={xrayImageCount === 0}>
                                    <Button
                                        size="sm"
                                        disabled={xrayImageCount === 0}
                                        className="group h-10 w-36 sm:w-40 px-4 text-xs sm:text-sm liquid-glass-btn-primary text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none touch-manipulation"
                                        title={xrayImageCount === 0 ? 'ไม่มีรูปภาพ X-Ray ของการตรวจครั้งนี้' : 'พิมพ์ PDF เฉพาะรูปภาพ X-Ray / อัลตราซาวด์ของผู้ป่วย'}
                                    >
                                        <Printer className="h-4 w-4 shrink-0" />
                                        <span>Print รูปภาพ</span>
                                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuLabel className="text-xs font-bold text-slate-500">
                                        เลือกรูปแบบหน้า
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {([1, 2, 4, 6] as const).map((layout) => (
                                        <DropdownMenuItem
                                            key={layout}
                                            className="cursor-pointer text-sm"
                                            onClick={() => openXrayImagePdf(layout)}
                                        >
                                            {layout} รูปต่อหน้า
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                onClick={handleOpenBackendPdf}
                                size="sm"
                                className="h-10 w-36 sm:w-40 px-4 text-xs sm:text-sm liquid-glass-btn-primary text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer touch-manipulation"
                                title="พิมพ์ PDF รายงานข้อความผลตรวจ X-Ray / อัลตราซาวด์"
                            >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span>Print ผลตรวจ</span>
                            </Button>
                        </div>
                    </div>

                    {patient ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">

                            {/* Column 1 (Leftmost): Patient Profile & Vital Signs */}
                            <div className="lg:col-span-4 xl:col-span-3 h-auto lg:h-full flex flex-col min-h-[420px] lg:min-h-0 overflow-hidden">
                                <Card className="flex-1 min-h-0 flex flex-col overflow-hidden max-h-none lg:max-h-[calc(100vh-140px)]">
                                    <CardHeader className="p-4 shrink-0">
                                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-[#00875A]" />
                                            ข้อมูลรายละเอียดผู้ป่วย (Patient Profile)
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="p-3.5 space-y-3 text-sm flex-1 min-h-0 overflow-y-auto">
                                        {/* Avatar & Basic Info */}
                                        <div className="flex items-center gap-3.5 p-3 liquid-glass-box rounded-xl">
                                            <div className="relative group border-2 border-slate-900 shadow-sm shrink-0 bg-slate-100 overflow-hidden inline-block w-fit h-fit rounded-none">
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

                                                {/* Hover Overlay Button */}
                                                <label
                                                    htmlFor="patient-image-upload"
                                                    className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer p-1 text-center"
                                                    title="คลิกเพื่อเลือกไฟล์รูปภาพอัปโหลด"
                                                >
                                                    {isUploadingImage ? (
                                                        <Loader2 className="h-6 w-6 animate-spin text-white mb-1" />
                                                    ) : (
                                                        <Camera className="h-6 w-6 mb-1 text-white animate-pulse" />
                                                    )}
                                                    <span className="text-[11px] font-bold">อัปโหลดรูปภาพ</span>
                                                </label>
                                                <input
                                                    id="patient-image-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                    disabled={isUploadingImage}
                                                />
                                            </div>
                                            <div className="space-y-1.5 overflow-hidden">
                                                <h4 className="font-bold text-base truncate text-slate-900">
                                                    {patient.fullname}
                                                </h4>
                                                <p className="text-slate-600 font-mono text-xs sm:text-sm">
                                                    CN: <span className="font-bold text-sm text-[#00875A]">{patient.op_hn || '-'}</span>
                                                </p>
                                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                                    <Badge variant="outline" className="bg-white text-slate-700 text-xs px-2 py-0.5 font-medium">
                                                        Visit No: {patient.VT_NO || '-'}
                                                    </Badge>
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        {formatPatientAge(patient)} {patient.op_sex ? `/ ${patient.op_sex}` : ''}
                                                    </span>
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
                                                        <FileText className="h-3.5 w-3.5 text-[#00875A]" /> อาการเบื้องต้น
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

                            {/* Column 2: X-Ray / Ultrasound Report (1:1 Paper Canvas) */}
                            <div className="lg:col-span-8 xl:col-span-9 h-auto lg:h-full flex flex-col min-h-0 overflow-hidden">
                                <Card className="overflow-hidden flex-1 min-h-[360px] lg:min-h-0 flex flex-col border-slate-300/60 shadow-sm bg-slate-200/40">
                                    <CardHeader className="p-4 flex flex-row items-center justify-between shrink-0 border-b border-slate-100 bg-white">
                                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <FileCheck className="h-5 w-5 text-[#00875A]" />
                                            รายงานผลการตรวจ X-Ray / Ultrasound{findingsPages.length > 0 ? ` (${findingsPages.length} หน้า)` : ''}
                                        </CardTitle>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Zoom & Auto-Fit Controls */}
                                            {findingsPages.length > 0 && (
                                                <div className="flex items-center gap-0.5 bg-slate-100/90 border border-slate-200/80 rounded-xl p-0.5 shadow-2xs shrink-0">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 rounded-lg text-slate-600 hover:bg-white hover:shadow-2xs touch-manipulation cursor-pointer"
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
                                                        className="h-7 w-7 p-0 rounded-lg text-slate-600 hover:bg-white hover:shadow-2xs touch-manipulation cursor-pointer"
                                                        title="ขยายขนาดกระดาษ (100%)"
                                                        onClick={() => setZoomMode('100')}
                                                    >
                                                        <ZoomIn className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-7 px-1.5 text-[10px] font-bold rounded-lg transition-colors touch-manipulation cursor-pointer ${zoomMode === 'fit' ? 'bg-[#00875A] text-white shadow-2xs' : 'text-slate-600 hover:bg-white'}`}
                                                        title="ปรับพอดีหน้าจออัตโนมัติ"
                                                        onClick={() => setZoomMode(zoomMode === 'fit' ? '100' : 'fit')}
                                                    >
                                                        Fit
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Upload Ultrasound Image Page */}
                                            <Link href={route('patient.ultrasound.upload', { hn: patient.op_hn, vt: patient.VT_NO || '', ...(cameFromHistory ? { from: 'history' } : {}) })}>
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-3.5 text-xs liquid-glass-btn-primary text-white font-bold rounded-full flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                                                    title="ไปยังหน้าอัปโหลดและจัดการรูปภาพฟิล์ม X-Ray / อัลตราซาวด์"
                                                >
                                                    <Upload className="h-3.5 w-3.5" />
                                                    <span>อัปโหลดรูปภาพ</span>
                                                </Button>
                                            </Link>

                                            {/* Edit Text Findings (Tiptap) */}
                                            <Link href={route('patient.ultrasound.edit', { hn: patient.op_hn, vt: patient.VT_NO || '', ...(cameFromHistory ? { from: 'history' } : {}) })}>
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-3.5 text-xs liquid-glass-btn-primary text-white font-bold rounded-full flex items-center gap-1.5 cursor-pointer shadow-sm"
                                                    title="พิมพ์ หรือแก้ไขข้อความผลตรวจ X-Ray"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                    <span>พิมพ์ผล Ultrasound</span>
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardHeader>

                                    <CardContent
                                        ref={containerRef}
                                        className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-300/30 border-0 rounded-b-xl flex flex-col items-center ${zoomMode === 'fit' ? 'overflow-x-hidden' : 'overflow-x-auto'}`}
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
                                                                <span className="text-slate-800 font-bold">ผลตรวจ X-Ray — หน้า {idx + 1}</span>
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
                                            <div className="p-8 text-center liquid-glass-box rounded-xl border border-dashed border-slate-300/80 space-y-3 bg-white w-full max-w-md my-auto">
                                                <p className="text-sm text-slate-500">ยังไม่มีข้อมูลรายงานผลการ Ultrasound </p>
                                                <Link href={route('patient.ultrasound.edit', { hn: patient.op_hn, vt: patient.VT_NO || '', ...(cameFromHistory ? { from: 'history' } : {}) })}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 px-4 font-bold rounded-full"
                                                    >
                                                        <Edit3 className="h-4 w-4 mr-1.5" />
                                                        พิมพ์ผล Ultrasound
                                                    </Button>
                                                </Link>
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
                    // Inertia will reload page props automatically on post
                }}
            />

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
