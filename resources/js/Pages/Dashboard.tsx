import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link, useForm } from '@inertiajs/react';
import { PatientVisit, PageProps } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { DatePicker } from '@/Components/ui/date-picker';
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
    Search,
    FileText,
    Activity,
    UserCheck,
    HeartPulse,
    Weight,
    Thermometer,
    ShieldCheck,
    Wind,
    Ruler,
    CreditCard,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    CalendarIcon,
    X,
    Pill,
    Printer,
    Loader2,
    Edit3,
    Stethoscope,
    Check,
} from 'lucide-react';
import { formatDateGregorian, formatVitalValue, cleanDecimals, cleanProcValue, formatPatientAge } from '@/lib/utils';
import PatientVitalsModal from '@/Components/PatientVitalsModal';

export default function Dashboard({
    patients = [],
    selectedDate = '',
    displayDate = '',
    stats = { total: 0, allergic: 0 }
}: PageProps) {
    const [itemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('dashboard_search') || '';
        }
        return '';
    });
    const [statusFilter, setStatusFilter] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('dashboard_status_filter') || 'D';
        }
        return 'D';
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRow, setSelectedRow] = useState<PatientVisit | null>(() => {
        if (typeof window !== 'undefined') {
            const savedHn = sessionStorage.getItem('dashboard_selected_hn');
            const savedVt = sessionStorage.getItem('dashboard_selected_vt');
            const savedStatus = sessionStorage.getItem('dashboard_status_filter') || 'D';
            if (savedHn) {
                const found = patients.find((p) => {
                    const matchesHn = (p.op_hn === savedHn || (p as any).OP_HN === savedHn) && (!savedVt || String(p.VT_NO || '') === savedVt);
                    if (!matchesHn) return false;
                    if (savedStatus !== 'all') {
                        const pStatus = (p.OP_Track_STS || (p as any).op_track_sts || 'D').toUpperCase();
                        return pStatus === savedStatus;
                    }
                    return true;
                });
                if (found) return found;
            }
        }
        return null;
    });

    const handleSelectRow = (patient: PatientVisit | null) => {
        setSelectedRow(patient);
        if (typeof window !== 'undefined') {
            if (patient) {
                sessionStorage.setItem('dashboard_selected_hn', patient.op_hn || (patient as any).OP_HN || '');
                sessionStorage.setItem('dashboard_selected_vt', String(patient.VT_NO || ''));
            } else {
                sessionStorage.removeItem('dashboard_selected_hn');
                sessionStorage.removeItem('dashboard_selected_vt');
            }
        }
    };
    const [filterDate, setFilterDate] = useState(selectedDate);
    const [isProcModalOpen, setIsProcModalOpen] = useState(false);
    const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
    const [showAllergyDetails, setShowAllergyDetails] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    const procForm = useForm({
        vt_no: selectedRow?.VT_NO || '',
        op_proc: cleanProcValue(selectedRow?.OP_PROC),
    });

    useEffect(() => {
        if (selectedRow) {
            procForm.setData({
                vt_no: selectedRow.VT_NO || '',
                op_proc: cleanProcValue(selectedRow.OP_PROC),
            });
        }
    }, [selectedRow]);

    const handleSaveProc = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRow) return;
        const targetHn = selectedRow.op_hn || (selectedRow as any).OP_HN;
        procForm.post(route('patient.medical_info.update', { hn: targetHn }), {
            preserveScroll: true,
            onSuccess: () => {
                setIsProcModalOpen(false);
                setSelectedRow((prev) => prev ? { ...prev, OP_PROC: procForm.data.op_proc } : null);
            },
        });
    };

    const handleNavigateToPatient = () => {
        if (!selectedRow) return;
        router.visit(route('patient.show', { hn: selectedRow.op_hn, vt: selectedRow.VT_NO || '' }));
    };

    useEffect(() => {
        setShowAllergyDetails(false);
    }, [selectedRow]);

    const filteredPatients = patients.filter((p) => {
        // Status filter: 'D' (รอตรวจ), 'W' (ส่งจัดยา), or 'all'
        if (statusFilter !== 'all') {
            const pStatus = (p.OP_Track_STS || (p as any).op_track_sts || 'D').toUpperCase();
            if (pStatus !== statusFilter) {
                return false;
            }
        }

        const rawQuery = searchTerm.trim().toLowerCase();
        if (!rawQuery) return true;

        const hn = (p.op_hn || '').toLowerCase();
        const vt = String(p.VT_NO || '');
        const fullname = (p.fullname || '').toLowerCase();
        const cleanFullname = fullname.replace(/\s+/g, ' ');
        const noSpaceFullname = fullname.replace(/\s+/g, '');
        const noSpaceQuery = rawQuery.replace(/\s+/g, '');
        const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

        // 1. Check direct match or space-insensitive match
        if (
            hn.includes(rawQuery) ||
            vt.includes(rawQuery) ||
            cleanFullname.includes(rawQuery) ||
            noSpaceFullname.includes(noSpaceQuery)
        ) {
            return true;
        }

        // 2. Multi-word search: every typed word matches anywhere in fullname, hn, or vt
        return queryTokens.every(
            (token) => cleanFullname.includes(token) || hn.includes(token) || vt.includes(token)
        );
    });

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;
    const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedPatients = filteredPatients.slice(
        (validCurrentPage - 1) * itemsPerPage,
        validCurrentPage * itemsPerPage
    );

    // Automatically keep selectedRow synchronized with filteredPatients
    useEffect(() => {
        if (selectedRow) {
            const currentHn = selectedRow.op_hn || (selectedRow as any).OP_HN;
            const currentVt = String(selectedRow.VT_NO || '');
            const matchingPatient = filteredPatients.find(
                (p) => (p.op_hn === currentHn || (p as any).OP_HN === currentHn) &&
                       (!currentVt || String(p.VT_NO || '') === currentVt)
            );

            if (matchingPatient) {
                // If patient data updated, keep state synced
                if (matchingPatient !== selectedRow) {
                    setSelectedRow(matchingPatient);
                }
            } else {
                // Patient no longer matches active status filter (e.g. moved from 'รอตรวจ D' to 'ส่งจัดยา W')
                // Immediately switch to the next patient or null so right card doesn't show stale patient
                handleSelectRow(filteredPatients.length > 0 ? filteredPatients[0] : null);
            }
        }
    }, [filteredPatients, statusFilter]);

    // Listen for new patient notifications and reload patient list smoothly in background
    useEffect(() => {
        const handleNewPatientArrived = () => {
            router.reload({
                only: ['patients', 'stats'],
            });
        };

        window.addEventListener('opd-new-patient-arrived', handleNewPatientArrived);
        return () => {
            window.removeEventListener('opd-new-patient-arrived', handleNewPatientArrived);
        };
    }, []);

    // When filters change, reset to page 1 unless we are keeping track of selectedRow's page
    useEffect(() => {
        if (selectedRow) {
            const currentHn = selectedRow.op_hn || (selectedRow as any).OP_HN;
            const currentVt = String(selectedRow.VT_NO || '');
            const foundIdx = filteredPatients.findIndex(
                (p) => (p.op_hn === currentHn || (p as any).OP_HN === currentHn) &&
                       (!currentVt || String(p.VT_NO || '') === currentVt)
            );
            if (foundIdx >= 0) {
                const targetPage = Math.floor(foundIdx / itemsPerPage) + 1;
                setCurrentPage(targetPage);
                return;
            }
        }
        setCurrentPage(1);
    }, [searchTerm, filterDate, statusFilter, itemsPerPage]);

    const onDateSelect = (newDate: string) => {
        handleSelectRow(null);
        setFilterDate(newDate);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboard_date', newDate);
        }
        if (newDate) {
            router.get(
                route('dashboard'),
                { date: newDate },
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['patients', 'stats', 'selectedDate', 'displayDate'],
                }
            );
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboard_search', value);
        }
    };

    const handleStatusFilterChange = (val: string) => {
        setStatusFilter(val);
        handleSelectRow(null);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('dashboard_status_filter', val);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="OPD Dashboard" />

            <div className="p-3.5 sm:p-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col">
                <div className="w-full max-w-full space-y-4 flex flex-col min-h-0 flex-1 lg:overflow-hidden">

                    {/* Main Content Area: 12-Column Responsive Grid (7 cols Table : 5 cols Patient Profile) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch flex-1 min-h-0">

                        {/* Left Section: KPI Cards + Patient Table (Takes 7 Columns on Desktop / Landscape, Full width on Mobile/Portrait) */}
                        <div className="lg:col-span-7 flex flex-col space-y-3.5 sm:space-y-4 min-h-[560px] lg:min-h-0 overflow-hidden">

                            {/* KPI Stat Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <Card className="bg-white border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow rounded-2xl">
                                    <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs sm:text-sm font-semibold text-slate-500">
                                                {filterDate === 'all' ? 'จำนวนผู้ป่วยส่งตัวทั้งหมด' : 'จำนวนผู้ป่วยส่งตัววันนี้'}
                                            </p>
                                            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">{stats.total} ราย</h3>
                                        </div>
                                        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-[#E8F8F2] text-[#00875A] flex items-center justify-center shrink-0 shadow-2xs">
                                            <UserCheck className="h-6 w-6 stroke-[2.2]" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow rounded-2xl">
                                    <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs sm:text-sm font-semibold text-slate-500">ผู้ป่วยที่มีประวัติแพ้ยา</p>
                                            <h3 className="text-2xl sm:text-3xl font-bold text-rose-600 mt-0.5">{stats.allergic} ราย</h3>
                                        </div>
                                        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                            <Pill className="h-6 w-6 fill-rose-100 stroke-[2.2]" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Patient Table Card */}
                            <Card className="border-slate-200/80 shadow-sm bg-white relative z-10 flex-1 min-h-0 flex flex-col justify-between overflow-hidden rounded-2xl">
                                <CardHeader className="p-3 sm:p-3.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-col gap-3 shrink-0">
                                    {/* Top Row: Title + Stats Badge */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <CardTitle className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                                                ตารางรายการส่งตัวผู้ป่วย (Visit List)
                                            </CardTitle>
                                            <Badge variant="outline" className="bg-[#E8F8F2] text-[#007A4D] border-[#A7F3D0] font-bold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                                                {filteredPatients.length} ราย
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Filter Controls Row: Date Filter Segment + Status Filter + Search Input */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Date Filter Segment with Pure CSS Smooth Sliding Pill */}
                                        <div className="relative inline-flex items-center p-1 bg-slate-200/70 rounded-full border border-slate-300/50 shadow-inner">
                                            {/* Sliding Pill Background Indicator */}
                                            <div
                                                className={`absolute top-1 bottom-1 rounded-full liquid-glass-btn-primary shadow-sm pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                                                    filterDate === 'all'
                                                        ? 'left-[150px] w-[76px]'
                                                        : 'left-1 w-[146px]'
                                                }`}
                                            />

                                            <DatePicker
                                                value={filterDate}
                                                onChange={onDateSelect}
                                                displayDate={displayDate}
                                            />

                                            <button
                                                type="button"
                                                className={`relative z-10 h-9 w-[76px] text-xs sm:text-sm font-bold rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer select-none bg-transparent ${
                                                    filterDate === 'all'
                                                        ? 'text-white'
                                                        : 'text-slate-700 hover:text-[#00875A]'
                                                }`}
                                                onClick={() => {
                                                    setSelectedRow(null);
                                                    setFilterDate('all');
                                                    if (typeof window !== 'undefined') {
                                                        sessionStorage.setItem('dashboard_date', 'all');
                                                    }
                                                    router.get(
                                                        route('dashboard'),
                                                        { date: 'all' },
                                                        {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                            only: ['patients', 'stats', 'selectedDate', 'displayDate'],
                                                        }
                                                    );
                                                }}
                                            >
                                                ทั้งหมด
                                            </button>
                                        </div>

                                        {/* Status Filter Dropdown */}
                                        <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className={`h-9 px-3.5 text-xs sm:text-sm font-bold rounded-full flex items-center gap-2 border transition-all duration-200 cursor-pointer shadow-2xs ${statusFilter === 'W'
                                                        ? 'bg-gradient-to-r from-purple-50 to-purple-100/60 text-purple-700 border-purple-300 hover:border-purple-400'
                                                        : statusFilter === 'D'
                                                            ? 'bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-800 border-amber-300 hover:border-amber-400'
                                                            : 'bg-white/90 text-slate-700 hover:text-[#00875A] hover:bg-white border-slate-200/80 shadow-2xs'
                                                        }`}
                                                >
                                                    <span
                                                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusFilter === 'W'
                                                            ? 'bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.5)]'
                                                            : statusFilter === 'D'
                                                                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                                                : 'bg-slate-400'
                                                            }`}
                                                    />
                                                    <span>
                                                        {statusFilter === 'D'
                                                            ? 'รอตรวจ'
                                                            : statusFilter === 'W'
                                                                ? 'ส่งจัดยา'
                                                                : 'สถานะทั้งหมด'}
                                                    </span>
                                                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-52 p-2 rounded-2xl liquid-glass-card shadow-2xl border border-white/80">
                                                <DropdownMenuLabel className="text-xs font-bold text-slate-500 px-2 py-1 flex items-center gap-1.5">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#00875A]" />
                                                    กรองตามสถานะ
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator className="my-1.5 bg-slate-200/70" />
                                                <DropdownMenuItem
                                                    onClick={() => handleStatusFilterChange('D')}
                                                    className={`cursor-pointer text-xs sm:text-sm font-bold flex items-center justify-between rounded-xl p-2.5 transition-all duration-150 ${statusFilter === 'D'
                                                        ? 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-amber-900 border border-amber-500/30 shadow-xs backdrop-blur-md'
                                                        : 'text-slate-700 hover:bg-white/80 hover:text-slate-900 border border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                                                        <span>รอตรวจ</span>
                                                    </div>
                                                    {statusFilter === 'D' && <Check className="h-4 w-4 text-amber-600 stroke-[2.5]" />}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleStatusFilterChange('W')}
                                                    className={`cursor-pointer text-xs sm:text-sm font-bold flex items-center justify-between rounded-xl p-2.5 transition-all duration-150 ${statusFilter === 'W'
                                                        ? 'bg-gradient-to-r from-purple-500/15 to-purple-500/5 text-purple-900 border border-purple-500/30 shadow-xs backdrop-blur-md'
                                                        : 'text-slate-700 hover:bg-white/80 hover:text-slate-900 border border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="h-2.5 w-2.5 rounded-full bg-purple-600 shrink-0 shadow-[0_0_6px_rgba(147,51,234,0.5)]" />
                                                        <span>ส่งจัดยา</span>
                                                    </div>
                                                    {statusFilter === 'W' && <Check className="h-4 w-4 text-purple-600 stroke-[2.5]" />}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleStatusFilterChange('all')}
                                                    className={`cursor-pointer text-xs sm:text-sm font-bold flex items-center justify-between rounded-xl p-2.5 transition-all duration-150 ${statusFilter === 'all'
                                                        ? 'bg-gradient-to-r from-[#00875A]/15 to-[#00875A]/5 text-[#007A4D] border border-[#00875A]/30 shadow-xs backdrop-blur-md'
                                                        : 'text-slate-700 hover:bg-white/80 hover:text-slate-900 border border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
                                                        <span>สถานะทั้งหมด</span>
                                                    </div>
                                                    {statusFilter === 'all' && <Check className="h-4 w-4 text-[#00875A] stroke-[2.5]" />}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {/* Search Input: Fills remaining width smoothly */}
                                        <div className="relative flex-1 min-w-[180px]">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                            <Input
                                                type="text"
                                                placeholder="ค้นหา CN หรือ ชื่อ..."
                                                value={searchTerm}
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                                className="pl-9 pr-8 h-9 text-xs sm:text-sm liquid-glass-input rounded-full transition-all"
                                            />
                                            {searchTerm && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSearchChange('')}
                                                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 rounded-full p-1 transition-colors cursor-pointer"
                                                    title="ล้างคำค้นหา"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0 overflow-x-auto flex-1 min-h-0 flex flex-col" style={{ WebkitOverflowScrolling: 'touch' }}>
                                    <table className="w-full min-w-[580px] lg:min-w-full text-left border-collapse h-full">
                                        <thead className="shrink-0">
                                            <tr className="border-b border-slate-300 bg-slate-100/90 text-slate-700 font-bold text-xs uppercase tracking-wider h-10">
                                                <th className="py-2 px-3 text-center whitespace-nowrap w-20 border-r border-slate-200">Visit No.</th>
                                                <th className="py-2 px-3 text-center whitespace-nowrap w-24 sm:w-28 border-r border-slate-200">CN</th>
                                                <th className="py-2 px-3.5 whitespace-nowrap border-r border-slate-200">ชื่อผู้ป่วย</th>
                                                <th className="py-2 px-3.5 whitespace-nowrap w-36 border-r border-slate-200">วันที่ส่งตัว</th>
                                                <th className="py-2 px-2.5 text-center whitespace-nowrap w-24 border-r border-slate-200">สถานะ</th>
                                                <th className="py-2 px-3 text-center whitespace-nowrap w-16 text-rose-600 font-bold">แพ้ยา</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 text-sm h-full">
                                            {paginatedPatients.length > 0 ? (
                                                (() => {
                                                    const rows = [...paginatedPatients];
                                                    while (rows.length < 10) {
                                                        rows.push(null as any);
                                                    }
                                                    return rows.map((patient, index) => {
                                                        if (!patient) {
                                                            return (
                                                                <tr key={`empty-${index}`} className="h-[10%] bg-slate-50/20 select-none">
                                                                    <td className="py-2 px-3 border-r border-slate-200/50 text-center text-slate-300">-</td>
                                                                    <td className="py-2 px-3 border-r border-slate-200/50 text-center text-slate-300">-</td>
                                                                    <td className="py-2 px-3.5 border-r border-slate-200/50 text-slate-300">-</td>
                                                                    <td className="py-2 px-3.5 border-r border-slate-200/50 text-slate-300">-</td>
                                                                    <td className="py-2 px-2.5 border-r border-slate-200/50 text-center text-slate-300">-</td>
                                                                    <td className="py-2 px-3 text-center text-slate-300">-</td>
                                                                </tr>
                                                            );
                                                        }

                                                        const isSelected = selectedRow?.op_hn === patient.op_hn && selectedRow?.VT_NO === patient.VT_NO;
                                                        const isEven = index % 2 === 0;
                                                        const hasAllergy = (patient.STS && patient.STS.toUpperCase() === 'Y') || Boolean(patient.OP_ALLERGIC);
                                                        const pStatus = (patient.OP_Track_STS || (patient as any).op_track_sts || 'D').toUpperCase();

                                                        return (
                                                            <tr
                                                                key={`${patient.op_hn}-${patient.VT_NO || index}`}
                                                                onClick={() => {
                                                                    handleSelectRow(patient);
                                                                }}
                                                                onDoubleClick={() => {
                                                                    handleSelectRow(patient);
                                                                    router.visit(route('patient.show', { hn: patient.op_hn, vt: patient.VT_NO || '' }));
                                                                }}
                                                                className={`h-[10%] cursor-pointer transition-colors duration-150 ${isSelected
                                                                    ? 'bg-[#E8F8F2] text-[#004D31] font-bold border-l-4 border-l-[#00875A]'
                                                                    : isEven
                                                                        ? 'bg-slate-50/60 hover:bg-[#E8F8F2]/60 text-slate-800'
                                                                        : 'bg-white hover:bg-[#E8F8F2]/60 text-slate-800'
                                                                    }`}
                                                            >
                                                                <td className={`py-2 px-3 text-center whitespace-nowrap font-bold text-sm border-r ${isSelected ? 'border-[#A7F3D0] text-[#004D31]' : 'border-slate-200'}`}>
                                                                    {patient.VT_NO || ((validCurrentPage - 1) * itemsPerPage + index + 1)}
                                                                </td>
                                                                <td className={`py-2 px-3 text-center whitespace-nowrap border-r font-mono text-sm font-bold ${isSelected ? 'border-[#A7F3D0] text-[#004D31]' : 'border-slate-200'}`}>
                                                                    {patient.op_hn}
                                                                </td>
                                                                <td className={`py-2 px-3.5 border-r whitespace-nowrap text-sm font-semibold ${isSelected ? 'border-[#A7F3D0] text-[#004D31]' : 'border-slate-200'}`}>
                                                                    {patient.fullname}
                                                                </td>
                                                                <td className={`py-2 px-3.5 border-r text-sm font-medium whitespace-nowrap ${isSelected ? 'border-[#A7F3D0] text-[#004D31]' : 'border-slate-200'}`}>
                                                                    {formatDateGregorian(patient.formatted_date || patient.pb_now1)}
                                                                </td>
                                                                <td className={`py-2 px-2.5 text-center whitespace-nowrap border-r ${isSelected ? 'border-[#A7F3D0]' : 'border-slate-200'}`}>
                                                                    {pStatus === 'W' ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                                            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                                                                            ส่งจัดยา
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                                            รอตรวจ
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                                    <div className="flex justify-center items-center">
                                                                        {hasAllergy ? (
                                                                            <span title="มีประวัติแพ้ยา"><Pill className="h-5 w-5 text-rose-600 fill-rose-100 animate-pulse" /></span>
                                                                        ) : (
                                                                            <span title="ไม่มีประวัติแพ้ยา"><ShieldCheck className="h-5.5 w-5.5 text-[#00875A] fill-[#E8F8F2]" /></span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()
                                            ) : (
                                                <tr className="h-full">
                                                    <td
                                                        colSpan={6}
                                                        className="text-center py-12 text-slate-400 font-medium"
                                                    >
                                                        <div className="flex flex-col items-center justify-center space-y-2 py-6">
                                                            <UserCheck className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                                                            <p className="font-semibold text-slate-600">
                                                                {searchTerm
                                                                    ? `ไม่พบข้อมูลผู้ป่วยที่ตรงกับ "${searchTerm}"`
                                                                    : statusFilter !== 'all'
                                                                        ? `ไม่พบผู้ป่วยที่มีสถานะ "${statusFilter === 'D' ? 'รอตรวจ' : 'ส่งจัดยา'}" ในวันที่เลือก`
                                                                        : 'ไม่พบรายการส่งตัวผู้ป่วยในวันที่เลือก'}
                                                            </p>
                                                            <p className="text-xs text-slate-400">กรุณาเลือกวันที่อื่น หรือกดปุ่ม "ทั้งหมด" เพื่อดูผู้ป่วยทุกรายการ</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </CardContent>

                                {/* Pagination Navigation Controls Footer */}
                                <div className="min-h-[52px] py-2.5 px-3 sm:px-4 liquid-glass-header border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs sm:text-sm rounded-b-2xl shrink-0 mt-auto">
                                    <div className="text-slate-600 font-medium text-xs sm:text-sm">
                                        แสดง <span className="font-bold text-slate-900">{filteredPatients.length > 0 ? (validCurrentPage - 1) * itemsPerPage + 1 : 0}</span> ถึง <span className="font-bold text-slate-900">{Math.min(validCurrentPage * itemsPerPage, filteredPatients.length)}</span> จากทั้งหมด <span className="font-bold text-[#00875A]">{filteredPatients.length}</span> รายการ ({itemsPerPage} รายการ/หน้า)
                                    </div>

                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        {/* First Page << */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 sm:h-8.5 sm:w-8.5 p-0 rounded-xl liquid-glass-box text-slate-700 hover:text-[#00875A] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-200"
                                            onClick={() => setCurrentPage(1)}
                                            disabled={validCurrentPage === 1}
                                            title="หน้าแรก (<<)"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>

                                        {/* Previous Page < */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 sm:h-8.5 sm:w-8.5 p-0 rounded-xl liquid-glass-box text-slate-700 hover:text-[#00875A] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-200"
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={validCurrentPage === 1}
                                            title="ก่อนหน้า (<)"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        {/* Current Page Display */}
                                        <div className="px-3 sm:px-4 py-1 liquid-glass-box rounded-xl font-bold text-slate-900 text-xs sm:text-sm">
                                            หน้า {validCurrentPage} / {totalPages}
                                        </div>

                                        {/* Next Page > */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 sm:h-8.5 sm:w-8.5 p-0 rounded-xl liquid-glass-box text-slate-700 hover:text-[#00875A] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-200"
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={validCurrentPage === totalPages}
                                            title="ถัดไป (>)"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>

                                        {/* Last Page >> */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 sm:h-8.5 sm:w-8.5 p-0 rounded-xl liquid-glass-box text-slate-700 hover:text-[#00875A] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-200"
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={validCurrentPage === totalPages}
                                            title="หน้าสุดท้าย (>>)"
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Selected Patient Detail Panel (Takes 5 Columns on Desktop / Landscape, Full width on Mobile/Portrait) */}
                        <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden h-full">
                            <Card className="border-slate-200/80 shadow-sm bg-white flex-1 min-h-0 flex flex-col overflow-hidden h-full rounded-2xl">
                                <CardHeader className="p-3 sm:p-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <UserCheck className="h-4.5 w-4.5 text-[#00875A]" />
                                            <span>ข้อมูลรายละเอียดผู้ป่วย (Patient Profile)</span>
                                        </CardTitle>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-3 space-y-2.5 text-sm flex-1 min-h-0 overflow-y-auto flex flex-col">
                                    {/* Avatar & Basic Info */}
                                    <div className="flex items-center gap-3.5 p-3 liquid-glass-box rounded-xl">
                                        <div className="border-2 border-slate-900 shadow-sm shrink-0 bg-slate-100 overflow-hidden inline-block w-fit h-fit rounded-none">
                                            {selectedRow?.Image_PT ? (
                                                <img
                                                    src={selectedRow.Image_PT}
                                                    alt={selectedRow.fullname}
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
                                                {selectedRow ? selectedRow.fullname : 'ยังไม่ได้เลือกรายการผู้ป่วย'}
                                            </h4>
                                            <p className="text-slate-600 font-mono text-xs sm:text-sm">
                                                CN: <span className="font-bold text-sm text-[#00875A]">{selectedRow?.op_hn || '-'}</span>
                                            </p>
                                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                                <Badge variant="outline" className="bg-white text-slate-700 text-xs px-2 py-0.5 font-medium">
                                                    Visit No: {selectedRow?.VT_NO || '-'}
                                                </Badge>
                                                {selectedRow && (
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        {formatPatientAge(selectedRow)} {selectedRow.op_sex ? `/ ${selectedRow.op_sex}` : ''}
                                                    </span>
                                                )}
                                            </div>
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
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-slate-800 text-xs sm:text-sm">สัญญาณชีพและข้อมูลซักประวัติ (Vital Signs)</p>
                                            {selectedRow && (
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
                                            {/* BT: อุณหภูมิ */}
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Thermometer className="h-3.5 w-3.5 text-[#00875A]" /> อุณหภูมิ (BT)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_BT, '°C')}
                                                </span>
                                            </div>

                                            {/* BW: น้ำหนัก */}
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Weight className="h-3.5 w-3.5 text-[#00875A]" /> น้ำหนัก (BW)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_WEIGHT, 'Kg')}
                                                </span>
                                            </div>

                                            {/* HT: ส่วนสูง */}
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Ruler className="h-3.5 w-3.5 text-[#00875A]" /> ส่วนสูง (HT)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_HIGHT, 'cm')}
                                                </span>
                                            </div>

                                            {/* P: ชีพจร */}
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Activity className="h-3.5 w-3.5 text-[#00875A]" /> ชีพจร (P)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_HR, 'bpm')}
                                                </span>
                                            </div>

                                            {/* BP: ความดัน */}
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <HeartPulse className="h-3.5 w-3.5 text-[#00875A]" /> ความดัน (BP)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {selectedRow?.OP_BP_UP && selectedRow?.OP_BP_DW ? `${cleanDecimals(selectedRow.OP_BP_UP)} / ${cleanDecimals(selectedRow.OP_BP_DW)}` : '-'}
                                                </span>
                                            </div>

                                            {/* R: หายใจ */}
                                            <div className="p-2 liquid-glass-box rounded-xl">
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                    <Wind className="h-3.5 w-3.5 text-[#00875A]" /> หายใจ (R)
                                                </span>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                    {formatVitalValue(selectedRow?.OP_RR || selectedRow?.OP_R, 'bpm')}
                                                </span>
                                            </div>

                                            {/* O2 Sat */}
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
                                                <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5 truncate">
                                                    <FileText className="h-3.5 w-3.5 text-[#00875A] shrink-0" /> อาการเบื้องต้น
                                                </span>
                                                <span className="font-medium text-xs sm:text-sm text-slate-800 block truncate" title={selectedRow?.OP_CHIEF || selectedRow?.OP_DETAIL || '-'}>
                                                    {selectedRow?.OP_CHIEF || selectedRow?.OP_DETAIL || '-'}
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
                                            {selectedRow?.OP_DIAG || '-'}
                                        </p>
                                    </div>
                                </CardContent>

                                {/* Fixed Pinned Card Footer (Does NOT scroll) */}
                                <div className="h-16 px-4 bg-slate-50/80 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2.5">
                                    {selectedRow ? (
                                        <>
                                            <Link
                                                href={route('patient.history', { hn: selectedRow.op_hn })}
                                                className="flex-1"
                                            >
                                                <Button
                                                    type="button"
                                                    className="w-full h-10 liquid-glass-btn-primary text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 rounded-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                                                >
                                                    <FileText className="h-4 w-4 text-white shrink-0" />
                                                    <span>ประวัติการรักษา</span>
                                                </Button>
                                            </Link>

                                            <Link
                                                href={route('patient.show', { hn: selectedRow.op_hn, vt: selectedRow.VT_NO || '' })}
                                                className="flex-1"
                                                onClick={() => {
                                                    if (typeof window !== 'undefined' && selectedRow) {
                                                        window.dispatchEvent(
                                                            new CustomEvent('opd-dismiss-patient-notification', {
                                                                detail: { hn: selectedRow.op_hn, vt: selectedRow.VT_NO },
                                                            })
                                                        );
                                                    }
                                                }}
                                            >
                                                <Button
                                                    type="button"
                                                    className="w-full h-10 liquid-glass-btn-primary text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 rounded-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                                                >
                                                    <Edit3 className="h-4 w-4 text-white shrink-0" />
                                                    <span>บันทึกผลการตรวจ</span>
                                                </Button>
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                disabled
                                                className="flex-1 h-10 liquid-glass-btn-primary text-white text-xs sm:text-sm font-bold rounded-full disabled:opacity-50"
                                            >
                                                ประวัติการรักษา
                                            </Button>
                                            <Button
                                                disabled
                                                className="flex-1 h-10 liquid-glass-btn-primary text-white text-xs sm:text-sm font-bold rounded-full disabled:opacity-50"
                                            >
                                                บันทึกผลการตรวจ
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Patient Vitals & Clinical Info Modal */}
            <PatientVitalsModal
                open={isVitalsModalOpen}
                onOpenChange={setIsVitalsModalOpen}
                patient={selectedRow}
                onSuccess={(updated) => {
                    setSelectedRow((prev) => (prev ? { ...prev, ...updated } : null));
                }}
            />
        </AuthenticatedLayout>
    );
}
