import React from 'react';
import { Skeleton } from '@/Components/ui/skeleton';
import { Card, CardHeader, CardContent, CardTitle } from '@/Components/ui/card';

export default function PatientDetailSkeleton() {
    return (
        <div className="min-h-[calc(100vh-65px)] lg:h-[calc(100vh-65px)] overflow-y-auto lg:overflow-hidden flex flex-col p-3.5 sm:p-5 select-none pointer-events-none">
            <div className="w-full max-w-full space-y-4 flex flex-col min-h-0 flex-1 lg:overflow-hidden">

                {/* Top Navigation Bar & Action Buttons Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 liquid-glass-card p-3.5 sm:p-4 rounded-2xl shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Back Button Skeleton */}
                        <Skeleton className="h-10 w-36 rounded-full" />
                        <div className="h-6 w-px bg-slate-300/60 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5.5 w-5.5 rounded-md" />
                            <Skeleton className="h-6 w-60 sm:w-72 rounded-lg" />
                        </div>
                    </div>

                    {/* Top Right Action Buttons: สถานะผู้ป่วย + พิมพ์ภาพ + พิมพ์ผลตรวจ */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Skeleton className="h-10 w-32 sm:w-36 rounded-full" />
                        <Skeleton className="h-10 w-36 sm:w-40 rounded-full" />
                        <Skeleton className="h-10 w-36 sm:w-40 rounded-full" />
                    </div>
                </div>

                {/* Main 12-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">

                    {/* Column 1 (Leftmost - 4 cols / xl 3 cols): Patient Profile & Vital Signs */}
                    <div className="lg:col-span-4 xl:col-span-3 h-auto lg:h-full flex flex-col min-h-[420px] lg:min-h-0 overflow-hidden">
                        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden max-h-none lg:max-h-[calc(100vh-140px)] border-slate-200/80 shadow-sm bg-white rounded-2xl">
                            {/* Card Header */}
                            <CardHeader className="p-4 shrink-0 border-b border-slate-100 bg-slate-50/60">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5 rounded-md" />
                                    <Skeleton className="h-5 w-48" />
                                </div>
                            </CardHeader>

                            {/* Card Body */}
                            <CardContent className="p-3.5 space-y-3 text-sm flex-1 min-h-0 overflow-y-auto">
                                {/* Avatar & Basic Info */}
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
                                <div className="space-y-1.5 text-xs sm:text-sm">
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                        <Skeleton className="h-3.5 w-20" />
                                        <Skeleton className="h-3.5 w-32" />
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                        <Skeleton className="h-3.5 w-16" />
                                        <Skeleton className="h-3.5 w-28" />
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                        <Skeleton className="h-3.5 w-28" />
                                        <Skeleton className="h-3.5 w-32" />
                                    </div>
                                </div>

                                {/* Vital Signs Grid (8 boxes) */}
                                <div className="space-y-2">
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
                        </Card>
                    </div>

                    {/* Column 2 (Right - 8 cols / xl 9 cols): X-Ray / Ultrasound Report (1:1 Paper Canvas) */}
                    <div className="lg:col-span-8 xl:col-span-9 h-auto lg:h-full flex flex-col min-h-0 overflow-hidden">
                        <Card className="overflow-hidden flex-1 min-h-[360px] lg:min-h-0 flex flex-col border-slate-300/60 shadow-sm bg-slate-200/40 rounded-2xl">
                            {/* Card Header */}
                            <CardHeader className="p-4 flex flex-row items-center justify-between shrink-0 border-b border-slate-100 bg-white">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5 rounded-md" />
                                    <Skeleton className="h-5 w-64" />
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Zoom & Fit Control */}
                                    <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/80 rounded-xl p-0.5">
                                        <Skeleton className="h-7 w-7 rounded-lg" />
                                        <Skeleton className="h-4 w-10 mx-1" />
                                        <Skeleton className="h-7 w-7 rounded-lg" />
                                        <Skeleton className="h-7 w-9 rounded-lg" />
                                    </div>

                                    {/* Upload Image Button */}
                                    <Skeleton className="h-8 w-28 rounded-full" />

                                    {/* Edit Findings Button */}
                                    <Skeleton className="h-8 w-36 rounded-full" />
                                </div>
                            </CardHeader>

                            {/* Canvas Paper Preview */}
                            <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-300/30 border-0 rounded-b-xl flex flex-col items-center">
                                <div className="flex flex-col items-center gap-4 w-full max-w-[794px]">
                                    {/* Page Header Bar */}
                                    <div className="w-full flex justify-between items-center text-[11px] mb-1 px-1">
                                        <Skeleton className="h-4 w-36" />
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                    </div>

                                    {/* Paper Canvas */}
                                    <div className="w-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-300/80 rounded-md p-8 sm:p-10 space-y-4 min-h-[500px]">
                                        <Skeleton className="h-5 w-48 mb-6" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-5/6" />
                                        <Skeleton className="h-4 w-11/12" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <div className="pt-4 space-y-3">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-4/5" />
                                            <Skeleton className="h-4 w-5/6" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
