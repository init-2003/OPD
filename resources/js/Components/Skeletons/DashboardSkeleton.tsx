import React from 'react';
import { Skeleton } from '@/Components/ui/skeleton';
import { Card, CardHeader, CardContent, CardTitle } from '@/Components/ui/card';
import {
    Users,
    AlertTriangle,
    Calendar,
    Search,
    UserCheck,
    Thermometer,
    Weight,
    Ruler,
    Activity,
    HeartPulse,
    Wind,
    FileText,
    Stethoscope,
    ChevronDown,
    ShieldCheck,
    Pill,
    Edit3
} from 'lucide-react';

export default function DashboardSkeleton() {
    return (
        <div className="p-3.5 sm:p-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col select-none pointer-events-none animate-in fade-in duration-200">
            <div className="w-full max-w-full space-y-4 flex flex-col min-h-0 flex-1 lg:overflow-hidden">
                {/* 12-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch flex-1 min-h-0">

                    {/* Left Column (7 cols): KPI Stats + Table */}
                    <div className="lg:col-span-7 flex flex-col space-y-3.5 sm:space-y-4 min-h-[560px] lg:min-h-0 overflow-hidden">

                        {/* KPI Stat Cards (2 Cards matching Dashboard UI) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 shrink-0">
                            {/* Card 1: Total Patients */}
                            <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl relative overflow-hidden">
                                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#00875A]/5 rounded-full blur-xl pointer-events-none" />
                                <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500">
                                            <Users className="h-4 w-4 text-[#00875A]" />
                                            <Skeleton className="h-4 w-32 rounded-md" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <Skeleton className="h-7 sm:h-8 w-16 rounded-md" />
                                            <span className="text-xs text-slate-400 font-medium">คน</span>
                                        </div>
                                    </div>
                                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-[#E8F8F2] border border-[#A7F3D0]/60 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Users className="h-6 w-6 text-[#00875A]" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 2: Allergic Patients */}
                            <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl relative overflow-hidden">
                                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
                                <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500">
                                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                                            <Skeleton className="h-4 w-32 rounded-md" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <Skeleton className="h-7 sm:h-8 w-12 rounded-md" />
                                            <span className="text-xs text-slate-400 font-medium">คน</span>
                                        </div>
                                    </div>
                                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Pill className="h-6 w-6 text-rose-600" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Patient Table Card */}
                        <Card className="border-slate-200/80 shadow-sm bg-white relative z-10 flex-1 min-h-0 flex flex-col justify-between overflow-hidden rounded-2xl">
                            {/* Table Header Controls */}
                            <CardHeader className="p-3 sm:p-3.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-col gap-3 shrink-0">
                                {/* Top Row: Title + Stats Badge */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                                            <Users className="h-5 w-5 text-[#00875A]" />
                                            <span>รายการส่งตัวผู้ป่วย</span>
                                        </CardTitle>
                                        <Skeleton className="h-5 w-16 rounded-full bg-[#E8F8F2]" />
                                    </div>
                                </div>

                                {/* Filter Controls Row */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Date Filter Segment */}
                                    <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-full border border-slate-300/50 shadow-2xs">
                                        <Skeleton className="h-7 w-28 rounded-full bg-white shadow-xs" />
                                        <Skeleton className="h-7 w-16 rounded-full" />
                                        <Skeleton className="h-7 w-7 rounded-full" />
                                    </div>

                                    {/* Status Filter Dropdown */}
                                    <div className="h-9 px-3.5 bg-slate-100/90 border border-slate-200/90 rounded-full flex items-center gap-2 min-w-[130px] justify-between">
                                        <Skeleton className="h-3.5 w-16" />
                                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    </div>

                                    {/* Search Input */}
                                    <div className="relative flex-1 min-w-[180px]">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                        <div className="pl-9 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center">
                                            <Skeleton className="h-3.5 w-32" />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Table Body */}
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
                                        {Array.from({ length: 10 }).map((_, idx) => (
                                            <tr
                                                key={idx}
                                                className={`h-11 ${idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}
                                            >
                                                <td className="py-2 px-3 border-r border-slate-200 text-center">
                                                    <Skeleton className="h-4 w-6 mx-auto rounded-md" />
                                                </td>
                                                <td className="py-2 px-3 border-r border-slate-200 text-center">
                                                    <Skeleton className="h-4 w-20 mx-auto rounded-md" />
                                                </td>
                                                <td className="py-2 px-3.5 border-r border-slate-200">
                                                    <Skeleton className={`h-4 ${idx % 3 === 0 ? 'w-44' : idx % 2 === 0 ? 'w-36' : 'w-48'} rounded-md`} />
                                                </td>
                                                <td className="py-2 px-3.5 border-r border-slate-200">
                                                    <Skeleton className="h-4 w-28 rounded-md" />
                                                </td>
                                                <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                                                    <Skeleton className="h-5 w-16 rounded-full mx-auto" />
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    <div className="flex justify-center items-center">
                                                        <Skeleton className="h-5 w-5 rounded-full" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>

                            {/* Pagination Footer */}
                            <div className="min-h-[52px] py-2.5 px-3 sm:px-4 liquid-glass-header border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs sm:text-sm rounded-b-2xl shrink-0 mt-auto">
                                <Skeleton className="h-4 w-56 rounded-md" />
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <Skeleton className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-xl" />
                                    <Skeleton className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-xl" />
                                    <Skeleton className="h-8 w-24 sm:w-28 rounded-xl" />
                                    <Skeleton className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-xl" />
                                    <Skeleton className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-xl" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column (5 cols): Patient Profile Card */}
                    <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden h-full">
                        <Card className="border-slate-200/80 shadow-sm bg-white flex-1 min-h-0 flex flex-col overflow-hidden h-full rounded-2xl">
                            {/* Card Header */}
                            <CardHeader className="p-3 sm:p-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <UserCheck className="h-4.5 w-4.5 text-[#00875A]" />
                                        <span>ข้อมูลรายละเอียดผู้ป่วย (Patient Profile)</span>
                                    </CardTitle>
                                </div>
                            </CardHeader>

                            {/* Card Body */}
                            <CardContent className="p-3 space-y-2.5 text-sm flex-1 min-h-0 overflow-y-auto flex flex-col">
                                {/* Avatar Box + 5-Row Basic Info */}
                                <div className="flex items-center gap-3.5 p-3 liquid-glass-box rounded-xl">
                                    <div className="w-24 sm:w-26 h-30 sm:h-32 bg-slate-100 border-2 border-slate-900 shrink-0 flex items-center justify-center rounded-none shadow-xs">
                                        <UserCheck className="h-8 w-8 text-slate-400 stroke-[1.5]" />
                                    </div>
                                    <div className="space-y-1 flex-1 overflow-hidden">
                                        {/* Row 1: ชื่อ */}
                                        <Skeleton className="h-5 w-40 sm:w-48 rounded-md" />
                                        {/* Row 2: CN */}
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-slate-400 font-mono">CN:</span>
                                            <Skeleton className="h-4 w-24 rounded-md" />
                                        </div>
                                        {/* Row 3: อายุ */}
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-slate-400 font-medium">อายุ:</span>
                                            <Skeleton className="h-3.5 w-24 rounded-md" />
                                        </div>
                                        {/* Row 4: เพศ */}
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-slate-400 font-medium">เพศ:</span>
                                            <Skeleton className="h-3.5 w-16 rounded-md" />
                                        </div>
                                        {/* Row 5: Visit No */}
                                        <div className="pt-0.5">
                                            <Skeleton className="h-5 w-20 rounded-md" />
                                        </div>
                                    </div>
                                </div>

                                {/* Doctor & Time Details (3 rows) */}
                                <div className="space-y-2 text-xs sm:text-sm">
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">แพทย์ผู้ตรวจ:</span>
                                        <Skeleton className="h-3.5 w-32 rounded-md" />
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">เวลาส่งตัว:</span>
                                        <Skeleton className="h-3.5 w-28 rounded-md" />
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">สถานะแพ้ยา (STS):</span>
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck className="h-4 w-4 text-[#00875A]" />
                                            <Skeleton className="h-3.5 w-24 rounded-md" />
                                        </div>
                                    </div>
                                </div>

                                {/* Vital Signs Grid (8 boxes) */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-slate-800 text-xs sm:text-sm">สัญญาณชีพและข้อมูลซักประวัติ (Vital Signs)</p>
                                        <div className="h-6 px-2.5 bg-slate-200/80 rounded-full flex items-center gap-1">
                                            <Edit3 className="h-3 w-3 text-slate-400" />
                                            <Skeleton className="h-3 w-12 rounded-md" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* BT: อุณหภูมิ */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                <Thermometer className="h-3.5 w-3.5 text-[#00875A]" /> อุณหภูมิ (BT)
                                            </span>
                                            <Skeleton className="h-4 w-16 rounded-md" />
                                        </div>
                                        {/* BW: น้ำหนัก */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                <Weight className="h-3.5 w-3.5 text-[#00875A]" /> น้ำหนัก (BW)
                                            </span>
                                            <Skeleton className="h-4 w-16 rounded-md" />
                                        </div>
                                        {/* HT: ส่วนสูง */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                <Ruler className="h-3.5 w-3.5 text-[#00875A]" /> ส่วนสูง (HT)
                                            </span>
                                            <Skeleton className="h-4 w-16 rounded-md" />
                                        </div>
                                        {/* P: ชีพจร */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                <Activity className="h-3.5 w-3.5 text-[#00875A]" /> ชีพจร (P)
                                            </span>
                                            <Skeleton className="h-4 w-16 rounded-md" />
                                        </div>
                                        {/* BP: ความดัน */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                <HeartPulse className="h-3.5 w-3.5 text-[#00875A]" /> ความดัน (BP)
                                            </span>
                                            <Skeleton className="h-4 w-20 rounded-md" />
                                        </div>
                                        {/* R: หายใจ */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                <Wind className="h-3.5 w-3.5 text-[#00875A]" /> หายใจ (R)
                                            </span>
                                            <Skeleton className="h-4 w-16 rounded-md" />
                                        </div>
                                        {/* O2 Sat */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5">
                                                <Activity className="h-3.5 w-3.5 text-[#00875A]" /> O₂ Sat
                                            </span>
                                            <Skeleton className="h-4 w-14 rounded-md" />
                                        </div>
                                        {/* อาการเบื้องต้น (Chief Complaint) */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block flex items-center gap-1 mb-0.5 truncate">
                                                <FileText className="h-3.5 w-3.5 text-[#00875A] shrink-0" /> อาการเบื้องต้น (Chief Complaint)
                                            </span>
                                            <Skeleton className="h-4 w-28 rounded-md" />
                                        </div>
                                    </div>
                                </div>

                                {/* ผลการวินิจฉัย (Diagnosis) */}
                                <div className="p-2.5 liquid-glass-box rounded-xl space-y-1.5">
                                    <p className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                                        <Stethoscope className="h-3.5 w-3.5 text-[#00875A]" /> ผลการวินิจฉัย (Diagnosis)
                                    </p>
                                    <Skeleton className="h-4 w-full rounded-md" />
                                    <Skeleton className="h-4 w-3/4 rounded-md" />
                                </div>
                            </CardContent>

                            {/* Fixed Pinned Card Footer */}
                            <div className="h-16 px-4 bg-slate-50/80 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2.5">
                                <div className="flex-1 h-10 bg-slate-200/90 rounded-full flex items-center justify-center gap-1.5">
                                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                    <Skeleton className="h-4 w-24 rounded-md" />
                                </div>
                                <div className="flex-1 h-10 bg-[#00875A]/20 rounded-full flex items-center justify-center gap-1.5">
                                    <Edit3 className="h-4 w-4 text-[#00875A]/60 shrink-0" />
                                    <Skeleton className="h-4 w-24 rounded-md" />
                                </div>
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
