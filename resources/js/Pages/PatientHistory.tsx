import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { PatientVisit } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/Components/ui/dialog';
import {
    ArrowLeft,
    History,
    Search,
    FileText,
    Edit3,
    Pill,
    ShieldCheck,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Stethoscope,
    Activity,
    Thermometer,
    Weight,
    Ruler,
    HeartPulse,
    Wind,
    Loader2
} from 'lucide-react';
import { formatDateGregorian, formatVitalValue, cleanDecimals } from '@/lib/utils';

interface PatientHistoryProps {
    patient: {
        op_hn?: string;
        fullname?: string;
        formatted_date?: string;
        Image_PT?: string | null;
    } | null;
    visits: PatientVisit[];
    hn: string;
}

export default function PatientHistory({ patient, visits = [], hn }: PatientHistoryProps) {
    const [itemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Select first visit by default if available
    const [selectedRow, setSelectedRow] = useState<PatientVisit | null>(
        visits.length > 0 ? visits[0] : null
    );

    const [showAllergyDetails, setShowAllergyDetails] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [isChiefModalOpen, setIsChiefModalOpen] = useState(false);
    const [isDiagModalOpen, setIsDiagModalOpen] = useState(false);

    const chiefForm = useForm({
        vt_no: selectedRow?.VT_NO || '',
        op_chief: selectedRow?.OP_CHIEF || '',
    });

    const diagForm = useForm({
        vt_no: selectedRow?.VT_NO || '',
        op_diag: selectedRow?.OP_DIAG || '',
    });

    const chiefTextareaRef = useRef<HTMLTextAreaElement>(null);
    const diagTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isChiefModalOpen) {
            setTimeout(() => {
                if (chiefTextareaRef.current) {
                    const el = chiefTextareaRef.current;
                    el.focus();
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                }
            }, 80);
        }
    }, [isChiefModalOpen]);

    useEffect(() => {
        if (isDiagModalOpen) {
            setTimeout(() => {
                if (diagTextareaRef.current) {
                    const el = diagTextareaRef.current;
                    el.focus();
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                }
            }, 80);
        }
    }, [isDiagModalOpen]);

    useEffect(() => {
        if (selectedRow) {
            chiefForm.setData({
                vt_no: selectedRow.VT_NO || '',
                op_chief: selectedRow.OP_CHIEF || '',
            });
            diagForm.setData({
                vt_no: selectedRow.VT_NO || '',
                op_diag: selectedRow.OP_DIAG || '',
            });
        }
    }, [selectedRow]);

    const handleOpenChiefModal = () => {
        if (!selectedRow) return;
        chiefForm.setData({
            vt_no: selectedRow.VT_NO || '',
            op_chief: selectedRow.OP_CHIEF || '',
        });
        setIsChiefModalOpen(true);
    };

    const handleOpenDiagModal = () => {
        if (!selectedRow) return;
        diagForm.setData({
            vt_no: selectedRow.VT_NO || '',
            op_diag: selectedRow.OP_DIAG || '',
        });
        setIsDiagModalOpen(true);
    };

    const handleSaveChief = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRow) return;
        chiefForm.post(route('patient.medical_info.update', { hn: selectedRow.op_hn }), {
            onSuccess: () => setIsChiefModalOpen(false),
        });
    };

    const handleSaveDiag = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRow) return;
        diagForm.post(route('patient.medical_info.update', { hn: selectedRow.op_hn }), {
            onSuccess: () => setIsDiagModalOpen(false),
        });
    };

    useEffect(() => {
        setShowAllergyDetails(false);
    }, [selectedRow]);

    const filteredVisits = visits.filter((v) => {
        const rawQuery = searchTerm.trim().toLowerCase();
        if (!rawQuery) return true;

        const hn = (v.op_hn || '').toLowerCase();
        const vt = String(v.VT_NO || '').toLowerCase();
        const fullname = (v.fullname || '').toLowerCase();
        const cleanFullname = fullname.replace(/\s+/g, ' ');
        const noSpaceFullname = fullname.replace(/\s+/g, '');
        const noSpaceQuery = rawQuery.replace(/\s+/g, '');
        const queryTokens = rawQuery.split(/\s+/).filter(Boolean);
        const chief = (v.OP_CHIEF || '').toLowerCase();
        const diag = (v.OP_DIAG || '').toLowerCase();
        const date = (v.formatted_date || '').toLowerCase();

        if (
            hn.includes(rawQuery) ||
            vt.includes(rawQuery) ||
            cleanFullname.includes(rawQuery) ||
            noSpaceFullname.includes(noSpaceQuery) ||
            chief.includes(rawQuery) ||
            diag.includes(rawQuery) ||
            date.includes(rawQuery)
        ) {
            return true;
        }

        return queryTokens.every(
            (token) =>
                cleanFullname.includes(token) ||
                hn.includes(token) ||
                vt.includes(token) ||
                chief.includes(token) ||
                diag.includes(token) ||
                date.includes(token)
        );
    });

    const totalPages = Math.ceil(filteredVisits.length / itemsPerPage) || 1;
    const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedVisits = filteredVisits.slice(
        (validCurrentPage - 1) * itemsPerPage,
        validCurrentPage * itemsPerPage
    );

    const getRowKey = (v: PatientVisit | null | undefined): string => {
        if (!v) return '';
        return String(v.VT_ID ?? v.vt_id ?? v.VT_NO ?? '');
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    useEffect(() => {
        if (paginatedVisits.length > 0) {
            const selectedKey = getRowKey(selectedRow);
            const existsInPage = paginatedVisits.some(
                v => selectedKey !== '' && getRowKey(v) === selectedKey
            );
            if (!existsInPage) {
                setSelectedRow(paginatedVisits[0]);
            }
        }
    }, [validCurrentPage, searchTerm, itemsPerPage]);

    return (
        <AuthenticatedLayout>
            <Head title={`ประวัติการรักษา - ${patient?.fullname || hn}`} />

            <div className="min-h-[calc(100vh-65px)] lg:h-[calc(100vh-65px)] overflow-y-auto lg:overflow-hidden flex flex-col p-3.5 sm:p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-full max-w-full space-y-4 flex flex-col min-h-0 flex-1 lg:overflow-hidden">
                    {/* Navigation Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 liquid-glass-card p-3.5 sm:p-4 rounded-2xl shrink-0">
                        <div className="flex items-center gap-3">
                            <Link href={route('dashboard')}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-10 px-4 text-sm font-semibold rounded-full cursor-pointer touch-manipulation"
                                >
                                    <ArrowLeft className="h-4.5 w-4.5 mr-1.5" />
                                    ย้อนกลับหน้าแดชบอร์ด
                                </Button>
                            </Link>
                            <div className="h-6 w-px bg-slate-300/60 hidden sm:block" />
                            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                                <History className="h-5.5 w-5.5 text-[#00875A]" />
                                ประวัติการรักษา (Treatment History)
                            </h2>
                        </div>
                    </div>

                    {/* Main Content Area: 12-Column Responsive Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch flex-1 min-h-0">

                        {/* Left Section: Patient Summary + Table (7 Columns) */}
                        <div className="lg:col-span-7 flex flex-col space-y-4 min-h-[500px] lg:min-h-0 overflow-hidden">
                            {/* Patient Summary Bar */}
                            <Card className="bg-white border-slate-200 shadow-xs shrink-0">
                                <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-[#E8F8F2] border border-[#A7F3D0] flex items-center justify-center shrink-0 overflow-hidden">
                                            {patient?.Image_PT ? (
                                                <img
                                                    src={patient.Image_PT}
                                                    alt={patient.fullname}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <UserCheck className="h-6 w-6 text-[#00875A]" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-base leading-tight">{patient?.fullname || '-'}</p>
                                            <p className="text-xs text-slate-500 font-medium">
                                                CN: <span className="font-mono font-bold text-[#00875A]">{patient?.op_hn || hn}</span>
                                                {' · '}
                                                จำนวนทั้งหมด <span className="font-bold text-slate-800">{visits.length}</span> รายการ
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative w-full sm:w-72">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="text"
                                            placeholder="ค้นหา Visit No., อาการ, วินิจฉัย..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-8 h-9 text-sm bg-slate-50"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* History Table */}
                            <Card className="border-slate-200 shadow-sm bg-white relative z-10 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                                <CardHeader className="p-2.5 sm:p-3 bg-slate-50/80 border-b border-slate-200 shrink-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <Stethoscope className="h-4.5 w-4.5 text-[#00875A]" />
                                            รายการประวัติการรักษาทั้งหมด
                                        </CardTitle>
                                        <Badge variant="outline" className="bg-white text-slate-600 text-xs font-semibold px-2.5 py-0.5 shrink-0">
                                            {filteredVisits.length} รายการ
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0 overflow-x-auto flex-1 min-h-0 flex flex-col" style={{ WebkitOverflowScrolling: 'touch' }}>
                                    <table className="w-full min-w-[540px] lg:min-w-full text-left border-collapse h-full">
                                        <thead className="shrink-0">
                                            <tr className="border-b border-slate-300 bg-slate-100/90 text-slate-700 font-bold text-xs uppercase tracking-wider h-10">
                                                <th className="py-2 px-3.5 text-center whitespace-nowrap w-24 border-r border-slate-200">Visit No.</th>
                                                <th className="py-2 px-3.5 whitespace-nowrap w-44 border-r border-slate-200">วันที่ส่งตัว</th>
                                                <th className="py-2 px-3.5 text-center whitespace-nowrap w-20 border-r border-slate-200 text-rose-600 font-bold">แพ้ยา</th>
                                                <th className="py-2 px-3.5 whitespace-nowrap border-r border-slate-200 max-w-[200px]">อาการเบื้องต้น</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 text-sm h-full">
                                            {paginatedVisits.length > 0 ? (
                                                (() => {
                                                    const rows = [...paginatedVisits];
                                                    while (rows.length < 10) {
                                                        rows.push(null as any);
                                                    }
                                                    return rows.map((visit, index) => {
                                                        if (!visit) {
                                                            return (
                                                                <tr key={`empty-${index}`} className="h-[10%] bg-slate-50/20 select-none">
                                                                    <td className="py-2 px-3.5 border-r border-slate-200/50 text-center text-slate-300">-</td>
                                                                    <td className="py-2 px-3.5 border-r border-slate-200/50 text-slate-300">-</td>
                                                                    <td className="py-2 px-3.5 border-r border-slate-200/50 text-center text-slate-300">-</td>
                                                                    <td className="py-2 px-3.5 border-r border-slate-200/50 text-slate-300">-</td>
                                                                </tr>
                                                            );
                                                        }

                                                        const hasAllergy = (visit.STS && visit.STS.toUpperCase() === 'Y') || Boolean(visit.OP_ALLERGIC);
                                                        const isSelected = Boolean(selectedRow && getRowKey(selectedRow) !== '' && getRowKey(selectedRow) === getRowKey(visit));
                                                        const isEven = index % 2 === 0;

                                                        return (
                                                            <tr
                                                                key={`${visit.op_hn}-${getRowKey(visit)}-${index}`}
                                                                onClick={() => setSelectedRow(visit)}
                                                                onDoubleClick={() => {
                                                                    setSelectedRow(visit);
                                                                    router.visit(route('patient.show', { hn: visit.op_hn, vt: visit.VT_NO || '', from: 'history' }));
                                                                }}
                                                                className={`h-[10%] cursor-pointer transition-colors duration-150 ${isSelected
                                                                    ? 'bg-[#E8F8F2] text-[#007A4D] font-bold border-l-4 border-l-[#00875A]'
                                                                    : isEven
                                                                        ? 'bg-slate-50/60 hover:bg-[#E8F8F2]/60 text-slate-800'
                                                                        : 'bg-white hover:bg-[#E8F8F2]/60 text-slate-800'
                                                                    }`}
                                                            >
                                                                <td className={`py-2 px-3.5 text-center whitespace-nowrap font-bold text-sm border-r ${isSelected ? 'border-[#A7F3D0] text-[#007A4D]' : 'border-slate-200'}`}>
                                                                    {visit.VT_NO || '-'}
                                                                </td>
                                                                <td className={`py-2 px-3.5 border-r text-sm font-medium whitespace-nowrap ${isSelected ? 'border-[#A7F3D0] text-[#007A4D]' : 'border-slate-200'}`}>
                                                                    {formatDateGregorian(visit.formatted_date || visit.pb_now1)}
                                                                </td>
                                                                <td className="py-2 px-3.5 border-r border-slate-200 text-center whitespace-nowrap">
                                                                    <div className="flex justify-center items-center">
                                                                        {hasAllergy ? (
                                                                            <span title="มีประวัติแพ้ยา"><Pill className="h-5 w-5 text-rose-600 fill-rose-100 animate-pulse" /></span>
                                                                        ) : (
                                                                            <span title="ไม่มีประวัติแพ้ยา"><ShieldCheck className="h-5.5 w-5.5 text-[#00875A] fill-[#E8F8F2]" /></span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className={`py-2 px-3.5 border-r text-sm max-w-[200px] truncate ${isSelected ? 'border-[#A7F3D0] text-[#007A4D]' : 'border-slate-200 text-slate-700'}`}>
                                                                    {visit.OP_CHIEF || '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()
                                            ) : (
                                                <tr className="h-full">
                                                    <td
                                                        colSpan={4}
                                                        className="text-center text-slate-400 text-sm align-middle py-12"
                                                    >
                                                        <div className="flex flex-col items-center justify-center space-y-2 py-6">
                                                            <UserCheck className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                                                            <p className="font-semibold text-slate-600">ไม่พบข้อมูลประวัติการรักษาของผู้ป่วยรายนี้</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </CardContent>

                                {/* Pagination */}
                                {filteredVisits.length > 0 && (
                                    <div className="h-14 px-4 liquid-glass-header border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm rounded-b-2xl shrink-0 mt-auto">
                                        <div className="text-slate-600 font-medium text-xs sm:text-sm">
                                            แสดง <span className="font-bold text-slate-900">{filteredVisits.length > 0 ? (validCurrentPage - 1) * itemsPerPage + 1 : 0}</span> ถึง <span className="font-bold text-slate-900">{Math.min(validCurrentPage * itemsPerPage, filteredVisits.length)}</span> จาก <span className="font-bold text-[#00875A]">{filteredVisits.length}</span> รายการ
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-xl liquid-glass-box text-slate-700 hover:text-[#00875A] hover:border-[#A7F3D0] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-200"
                                                onClick={() => setCurrentPage(1)}
                                                disabled={validCurrentPage === 1}
                                                title="หน้าแรก (<<)"
                                            >
                                                <ChevronsLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-xl liquid-glass-box text-slate-700 hover:text-[#00875A] hover:border-[#A7F3D0] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-200"
                                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                                disabled={validCurrentPage === 1}
                                                title="ก่อนหน้า (<)"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <div className="px-4 py-1.5 liquid-glass-box rounded-xl font-bold text-slate-900 text-xs sm:text-sm">
                                                หน้า {validCurrentPage} / {totalPages}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-xl liquid-glass-box text-slate-700 hover:text-[#00875A] hover:border-[#A7F3D0] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-200"
                                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                                disabled={validCurrentPage === totalPages}
                                                title="ถัดไป (>)"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-xl liquid-glass-box text-slate-700 hover:text-[#00875A] hover:border-[#A7F3D0] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-200"
                                                onClick={() => setCurrentPage(totalPages)}
                                                disabled={validCurrentPage === totalPages}
                                                title="หน้าสุดท้าย (>>)"
                                            >
                                                <ChevronsRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Right Section: Selected Visit Detail Panel (5 Columns) */}
                        <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden h-full">
                            <Card className="border-slate-200 shadow-sm bg-white flex-1 min-h-0 flex flex-col overflow-hidden h-full">
                                <CardHeader className="p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50 shrink-0">
                                    <CardTitle className="text-base font-bold text-slate-800">
                                        ข้อมูลรายละเอียดการตรวจ (Visit Profile)
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-3 space-y-2.5 text-sm flex-1 min-h-0 overflow-y-auto flex flex-col">
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
                                            <h4 className={`font-bold text-base truncate ${selectedRow ? 'text-slate-900' : 'text-slate-400 font-normal italic'}`}>
                                                {selectedRow ? patient?.fullname : 'ยังไม่ได้เลือกรายการ'}
                                            </h4>
                                            <p className="text-slate-600 font-mono text-xs sm:text-sm">
                                                CN: <span className="font-bold text-sm text-[#00875A]">{selectedRow?.op_hn || patient?.op_hn || hn}</span>
                                            </p>
                                            <Badge variant="outline" className="bg-white text-slate-700 text-xs px-2 py-0.5 font-medium mt-1">
                                                Visit No: {selectedRow?.VT_NO || '-'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Doctor & Time */}
                                    <div className="space-y-2 text-xs sm:text-sm">
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">แพทย์ผู้ตรวจ:</span>
                                            <span className="font-bold text-slate-800 text-xs sm:text-sm">{selectedRow?.OP_SEND_DR_Name || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">เวลาส่งตัว:</span>
                                            <span className="font-mono font-semibold text-slate-700 text-xs sm:text-sm">{formatDateGregorian(selectedRow?.formatted_date || selectedRow?.pb_now1)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">สถานะแพ้ยา (STS):</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-xs sm:text-sm ${selectedRow ? (selectedRow.STS === 'Y' ? 'text-rose-600 flex items-center gap-1.5' : 'text-[#007A4D] flex items-center gap-1.5') : 'text-slate-400'}`}>
                                                    {selectedRow ? (selectedRow.STS === 'Y' ? <><Pill className="h-4 w-4 text-rose-600 fill-rose-100" /> มีประวัติแพ้ยา (Y)</> : <><ShieldCheck className="h-4.5 w-4.5 text-[#00875A] fill-[#E8F8F2]" /> ไม่มีประวัติแพ้ยา (N)</>) : '-'}
                                                </span>
                                                {selectedRow?.OP_ALLERGIC && (
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
                                    {selectedRow?.OP_ALLERGIC && showAllergyDetails && (
                                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs sm:text-sm leading-relaxed font-semibold shadow-2xs animate-in fade-in-50 duration-200">
                                            <p className="font-bold flex items-center gap-1.5 text-rose-700 mb-1 text-xs shrink-0">
                                                <Pill className="h-3.5 w-3.5 text-rose-600 fill-rose-100 shrink-0" /> รายละเอียดการแพ้ยา:
                                            </p>
                                            <p className="whitespace-pre-wrap">{selectedRow.OP_ALLERGIC}</p>
                                        </div>
                                    )}

                                    {/* Vitals & Patient Details Summary */}
                                    <div className="space-y-2.5">
                                        <p className="font-bold text-slate-800 text-xs sm:text-sm">สัญญาณชีพและข้อมูลซักประวัติ (Vital Signs):</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Thermometer className="h-3.5 w-3.5 text-[#00875A]" /> อุณหภูมิ (BT)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_BT, '°C')}
                                                </span>
                                            </div>
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Weight className="h-3.5 w-3.5 text-[#00875A]" /> น้ำหนัก (BW)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_WEIGHT, 'Kg')}
                                                </span>
                                            </div>
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Ruler className="h-3.5 w-3.5 text-[#00875A]" /> ส่วนสูง (HT)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_HIGHT, 'cm')}
                                                </span>
                                            </div>
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Activity className="h-3.5 w-3.5 text-[#00875A]" /> ชีพจร (P)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_HR, 'bpm')}
                                                </span>
                                            </div>
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <HeartPulse className="h-3.5 w-3.5 text-[#00875A]" /> ความดัน (BP)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {selectedRow?.OP_BP_UP && selectedRow?.OP_BP_DW ? `${cleanDecimals(selectedRow.OP_BP_UP)} / ${cleanDecimals(selectedRow.OP_BP_DW)}` : '-'}
                                                </span>
                                            </div>
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Wind className="h-3.5 w-3.5 text-[#00875A]" /> หายใจ (R)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_RR || selectedRow?.OP_R, 'bpm')}
                                                </span>
                                            </div>
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Activity className="h-3.5 w-3.5 text-[#00875A]" /> O₂ Sat
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_O2SAT, '%')}
                                                </span>
                                            </div>
                                            {/* อาการเบื้องต้น (Chief Complaint) */}
                                            <div className="p-2 liquid-glass-box rounded-xl space-y-0.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5 truncate">
                                                        <FileText className="h-3.5 w-3.5 text-[#00875A]" /> อาการเบื้องต้น
                                                    </span>
                                                    {selectedRow && (
                                                        <Button
                                                            onClick={handleOpenChiefModal}
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-5 px-1.5 text-[10px] font-bold text-[#00875A] hover:bg-[#E8F8F2] rounded-full flex items-center gap-0.5 cursor-pointer -mt-1 -mr-1"
                                                        >
                                                            <Edit3 className="h-2.5 w-2.5" />
                                                            <span>{selectedRow?.OP_CHIEF ? 'แก้ไข' : 'เพิ่ม'}</span>
                                                        </Button>
                                                    )}
                                                </div>
                                                <span className="font-medium text-xs sm:text-sm text-slate-900 block truncate" title={selectedRow?.OP_CHIEF || selectedRow?.OP_DETAIL || '-'}>
                                                    {selectedRow?.OP_CHIEF || selectedRow?.OP_DETAIL || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ผลการวินิจฉัย (Diagnosis) */}
                                    <div className="p-2.5 liquid-glass-box rounded-xl space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                                                <Stethoscope className="h-3.5 w-3.5 text-[#00875A]" /> ผลการวินิจฉัย (Diagnosis)
                                            </p>
                                            {selectedRow && (
                                                <Button
                                                    onClick={handleOpenDiagModal}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-2 text-[11px] font-bold text-[#00875A] hover:bg-[#E8F8F2] rounded-full flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Edit3 className="h-3 w-3" />
                                                    <span>{selectedRow?.OP_DIAG ? 'แก้ไข' : 'เพิ่ม'}</span>
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                                            {selectedRow?.OP_DIAG || '-'}
                                        </p>
                                    </div>
                                </CardContent>

                                {/* Fixed Pinned Card Footer */}
                                <div className="h-16 px-4 bg-slate-50/80 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2.5">
                                    {selectedRow ? (
                                        <Link
                                            href={route('patient.show', { hn: selectedRow.op_hn, vt: selectedRow.VT_NO || '', from: 'history' })}
                                            className="w-full"
                                        >
                                            <Button
                                                type="button"
                                                className="w-full h-10 liquid-glass-btn-primary text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 rounded-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                                            >
                                                <FileText className="h-4 w-4 text-white shrink-0" />
                                                <span>ดูเวชระเบียน</span>
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            disabled
                                            className="w-full h-10 bg-slate-100 text-slate-400 text-xs sm:text-sm font-bold rounded-full disabled:opacity-50"
                                        >
                                            ดูเวชระเบียน
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Chief Complaint Modal Dialog */}
            <Dialog open={isChiefModalOpen} onOpenChange={setIsChiefModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl p-6 liquid-glass-card">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-[#00875A]" />
                            {selectedRow?.OP_CHIEF ? 'แก้ไขอาการเบื้องต้น (Chief Complaint)' : 'เพิ่มอาการเบื้องต้น (Chief Complaint)'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSaveChief} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="history_op_chief_input" className="text-xs font-bold text-slate-700">
                                อาการเบื้องต้น (Chief Complaint)
                            </Label>
                            <Textarea
                                ref={chiefTextareaRef}
                                id="history_op_chief_input"
                                rows={4}
                                placeholder="กรอกอาการเบื้องต้นของผู้ป่วย..."
                                value={chiefForm.data.op_chief}
                                onChange={(e) => chiefForm.setData('op_chief', e.target.value)}
                                onFocus={(e) => {
                                    const len = e.currentTarget.value.length;
                                    e.currentTarget.setSelectionRange(len, len);
                                }}
                                className="liquid-glass-box focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 focus-visible:ring-offset-0 focus-visible:outline-none rounded-xl text-sm font-medium transition-all"
                            />
                        </div>

                        <DialogFooter className="pt-3 flex sm:justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsChiefModalOpen(false)}
                                className="rounded-full px-5 h-9 text-xs font-semibold cursor-pointer"
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                type="submit"
                                disabled={chiefForm.processing}
                                className="rounded-full px-6 h-9 text-xs font-bold liquid-glass-btn-primary text-white flex items-center gap-1.5 cursor-pointer"
                            >
                                {chiefForm.processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                <span>{selectedRow?.OP_CHIEF ? 'บันทึกแก้ไข' : 'บันทึกอาการเบื้องต้น'}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Diagnosis Modal Dialog */}
            <Dialog open={isDiagModalOpen} onOpenChange={setIsDiagModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl p-6 liquid-glass-card">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-[#00875A]" />
                            {selectedRow?.OP_DIAG ? 'แก้ไขผลการวินิจฉัย (Diagnosis)' : 'เพิ่มผลการวินิจฉัย (Diagnosis)'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSaveDiag} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="history_op_diag_input" className="text-xs font-bold text-slate-700">
                                ผลการวินิจฉัย (Diagnosis)
                            </Label>
                            <Textarea
                                ref={diagTextareaRef}
                                id="history_op_diag_input"
                                rows={4}
                                placeholder="กรอกผลการวินิจฉัยโรคของผู้ป่วย..."
                                value={diagForm.data.op_diag}
                                onChange={(e) => diagForm.setData('op_diag', e.target.value)}
                                onFocus={(e) => {
                                    const len = e.currentTarget.value.length;
                                    e.currentTarget.setSelectionRange(len, len);
                                }}
                                className="liquid-glass-box focus:bg-white focus:border-[#00875A] focus-visible:ring-1 focus-visible:ring-[#00875A]/20 focus-visible:ring-offset-0 focus-visible:outline-none rounded-xl text-sm font-medium transition-all"
                            />
                        </div>

                        <DialogFooter className="pt-3 flex sm:justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDiagModalOpen(false)}
                                className="rounded-full px-5 h-9 text-xs font-semibold cursor-pointer"
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                type="submit"
                                disabled={diagForm.processing}
                                className="rounded-full px-6 h-9 text-xs font-bold liquid-glass-btn-primary text-white flex items-center gap-1.5 cursor-pointer"
                            >
                                {diagForm.processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                <span>{selectedRow?.OP_DIAG ? 'บันทึกแก้ไข' : 'บันทึกผลการวินิจฉัย'}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
