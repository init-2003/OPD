import React from 'react';
import { Skeleton } from '@/Components/ui/skeleton';
import { Card, CardHeader, CardContent, CardTitle } from '@/Components/ui/card';

export default function DashboardSkeleton() {
    return (
        <div className="p-3.5 sm:p-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col select-none pointer-events-none">
            <div className="w-full max-w-full space-y-4 flex flex-col min-h-0 flex-1 lg:overflow-hidden">
                {/* 12-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch flex-1 min-h-0">

                    {/* Left Column (7 cols): KPI Stats + Table */}
                    <div className="lg:col-span-7 flex flex-col space-y-3.5 sm:space-y-4 min-h-[560px] lg:min-h-0 overflow-hidden">

                        {/* KPI Stat Cards (2 Cards matching Dashboard UI) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 shrink-0">
                            {/* Card 1: Total Patients */}
                            <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl">
                                <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton className="h-3.5 w-36" />
                                        <Skeleton className="h-7 w-20" />
                                    </div>
                                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-[#E8F8F2] flex items-center justify-center shrink-0 shadow-2xs">
                                        <Skeleton className="h-6 w-6 rounded-md bg-[#00875A]/20" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 2: Allergic Patients */}
                            <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl">
                                <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton className="h-3.5 w-32" />
                                        <Skeleton className="h-7 w-16" />
                                    </div>
                                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                                        <Skeleton className="h-6 w-6 rounded-md bg-rose-200/80" />
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
                                        <Skeleton className="h-6 w-56 sm:w-64 rounded-lg" />
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </div>
                                </div>

                                {/* Filter Controls Row */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Date Filter Segment */}
                                    <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-full border border-slate-300/50">
                                        <Skeleton className="h-7 w-28 rounded-full" />
                                        <Skeleton className="h-7 w-14 rounded-full" />
                                    </div>

                                    {/* Status Filter Dropdown */}
                                    <Skeleton className="h-9 w-28 sm:w-32 rounded-full" />

                                    {/* Search Input */}
                                    <Skeleton className="h-9 flex-1 min-w-[180px] rounded-full" />
                                </div>
                            </CardHeader>

                            {/* Table Body */}
                            <CardContent className="p-0 overflow-x-auto flex-1 min-h-0 flex flex-col">
                                <table className="w-full min-w-[580px] lg:min-w-full text-left border-collapse h-full">
                                    <thead className="shrink-0">
                                        <tr className="border-b border-slate-300 bg-slate-100/90 text-slate-700 font-bold text-xs uppercase tracking-wider h-10">
                                            <th className="py-2 px-3 text-center whitespace-nowrap w-20 border-r border-slate-200">
                                                <Skeleton className="h-3.5 w-12 mx-auto" />
                                            </th>
                                            <th className="py-2 px-3 text-center whitespace-nowrap w-24 sm:w-28 border-r border-slate-200">
                                                <Skeleton className="h-3.5 w-10 mx-auto" />
                                            </th>
                                            <th className="py-2 px-3.5 whitespace-nowrap border-r border-slate-200">
                                                <Skeleton className="h-3.5 w-20" />
                                            </th>
                                            <th className="py-2 px-3.5 whitespace-nowrap w-36 border-r border-slate-200">
                                                <Skeleton className="h-3.5 w-20" />
                                            </th>
                                            <th className="py-2 px-2.5 text-center whitespace-nowrap w-24 border-r border-slate-200">
                                                <Skeleton className="h-3.5 w-12 mx-auto" />
                                            </th>
                                            <th className="py-2 px-3 text-center whitespace-nowrap w-16">
                                                <Skeleton className="h-3.5 w-10 mx-auto" />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-sm h-full">
                                        {Array.from({ length: 10 }).map((_, idx) => (
                                            <tr
                                                key={idx}
                                                className={`h-11 ${idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'}`}
                                            >
                                                <td className="py-2 px-3 border-r border-slate-200 text-center">
                                                    <Skeleton className="h-3.5 w-8 mx-auto" />
                                                </td>
                                                <td className="py-2 px-3 border-r border-slate-200 text-center">
                                                    <Skeleton className="h-3.5 w-16 mx-auto" />
                                                </td>
                                                <td className="py-2 px-3.5 border-r border-slate-200">
                                                    <Skeleton className="h-3.5 w-32 sm:w-44" />
                                                </td>
                                                <td className="py-2 px-3.5 border-r border-slate-200">
                                                    <Skeleton className="h-3.5 w-24" />
                                                </td>
                                                <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                                                    <Skeleton className="h-5 w-16 rounded-full mx-auto" />
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    <Skeleton className="h-5 w-5 rounded-full mx-auto" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>

                            {/* Pagination Footer */}
                            <div className="min-h-[52px] py-2.5 px-3 sm:px-4 liquid-glass-header border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs sm:text-sm rounded-b-2xl shrink-0 mt-auto">
                                <Skeleton className="h-4 w-52" />
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
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4.5 w-4.5 rounded-md" />
                                        <Skeleton className="h-5 w-48 sm:w-56" />
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Card Body */}
                            <CardContent className="p-3 space-y-2.5 text-sm flex-1 min-h-0 overflow-y-auto flex flex-col">
                                {/* Avatar Box + Basic Info */}
                                <div className="flex items-center gap-3.5 p-3 liquid-glass-box rounded-xl">
                                    <div className="w-24 sm:w-26 h-30 sm:h-32 bg-slate-100 border-2 border-slate-900 shrink-0 flex items-center justify-center">
                                        <Skeleton className="h-8 w-8 rounded-md bg-slate-300" />
                                    </div>
                                    <div className="space-y-1.5 flex-1 overflow-hidden">
                                        <Skeleton className="h-5 w-36 sm:w-44" />
                                        <Skeleton className="h-4 w-24" />
                                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                            <Skeleton className="h-5 w-20 rounded-md" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    </div>
                                </div>

                                {/* Doctor & Time Details (3 rows) */}
                                <div className="space-y-2 text-xs sm:text-sm">
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                        <Skeleton className="h-3.5 w-20" />
                                        <Skeleton className="h-3.5 w-32" />
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                        <Skeleton className="h-3.5 w-16" />
                                        <Skeleton className="h-3.5 w-28" />
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                        <Skeleton className="h-3.5 w-28" />
                                        <Skeleton className="h-3.5 w-32" />
                                    </div>
                                </div>

                                {/* Vital Signs Grid (8 boxes) */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-6 w-18 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* BT */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-4 w-14" />
                                        </div>
                                        {/* BW */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-4 w-14" />
                                        </div>
                                        {/* HT */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-4 w-14" />
                                        </div>
                                        {/* P */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-4 w-14" />
                                        </div>
                                        {/* BP */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                        {/* R */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-4 w-14" />
                                        </div>
                                        {/* O2 Sat */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <Skeleton className="h-3 w-16" />
                                            <Skeleton className="h-4 w-12" />
                                        </div>
                                        {/* อาการเบื้องต้น */}
                                        <div className="p-2 liquid-glass-box rounded-xl space-y-1">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-4 w-28" />
                                        </div>
                                    </div>
                                </div>

                                {/* ผลการวินิจฉัย (Diagnosis) */}
                                <div className="p-2.5 liquid-glass-box rounded-xl space-y-1.5">
                                    <Skeleton className="h-3.5 w-36" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-4/5" />
                                </div>
                            </CardContent>

                            {/* Fixed Pinned Card Footer */}
                            <div className="h-16 px-4 bg-slate-50/80 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2.5">
                                <Skeleton className="h-10 flex-1 rounded-full" />
                                <Skeleton className="h-10 flex-1 rounded-full" />
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
