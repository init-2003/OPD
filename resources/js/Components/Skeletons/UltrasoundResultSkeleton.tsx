import React from 'react';
import { Skeleton } from '@/Components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/Components/ui/card';

export default function UltrasoundResultSkeleton() {
    return (
        <div className="min-h-[calc(100vh-65px)] flex flex-col select-none pointer-events-none animate-in fade-in duration-200">

            {/* Top Full-Width Floating Toolbar across 100% of the screen */}
            <div className="px-3.5 pt-3 pb-1.5 shrink-0 z-20 w-full overflow-hidden">
                <Card className="liquid-glass-card bg-white/95 backdrop-blur-md shadow-sm border border-slate-300/80 rounded-2xl px-3.5 py-1.5 flex items-center justify-between gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full">

                    {/* Left Navigation Group */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Back Button Skeleton */}
                        <Skeleton className="h-8 w-18 rounded-xl" />
                        {/* Patient Profile Toggle Skeleton */}
                        <Skeleton className="h-8 w-28 rounded-xl" />
                    </div>

                    {/* Center Formatting & Presets Tools */}
                    <div className="flex items-center gap-1.5 mx-auto shrink-0">
                        {/* Preset Button */}
                        <Skeleton className="h-8 w-22 rounded-xl" />

                        <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                        {/* B / I / U Group */}
                        <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 shrink-0">
                            <Skeleton className="h-7 w-7 rounded-lg" />
                            <Skeleton className="h-7 w-7 rounded-lg" />
                            <Skeleton className="h-7 w-7 rounded-lg" />
                        </div>

                        {/* Desktop XL Tools */}
                        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
                            <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                            {/* Undo / Redo */}
                            <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 shrink-0">
                                <Skeleton className="h-7 w-7 rounded-lg" />
                                <Skeleton className="h-7 w-7 rounded-lg" />
                            </div>

                            <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                            {/* Font Size */}
                            <Skeleton className="h-7 w-14 rounded-lg" />

                            <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                            {/* H1 / H2 */}
                            <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 shrink-0">
                                <Skeleton className="h-7 w-7 rounded-lg" />
                                <Skeleton className="h-7 w-7 rounded-lg" />
                            </div>

                            <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                            {/* Lists */}
                            <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 shrink-0">
                                <Skeleton className="h-7 w-7 rounded-lg" />
                                <Skeleton className="h-7 w-7 rounded-lg" />
                            </div>

                            <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                            {/* Blank Page */}
                            <Skeleton className="h-8 w-26 rounded-xl" />
                        </div>

                        {/* Three-dots for < xl */}
                        <div className="flex xl:hidden items-center gap-1 shrink-0">
                            <Skeleton className="h-8 w-8 rounded-xl" />
                        </div>
                    </div>

                    <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                    {/* Ref Doc Button */}
                    <Skeleton className="h-8 w-24 rounded-xl" />

                    <div className="h-4 w-px bg-slate-300/80 mx-0.5 shrink-0" />

                    {/* Right Zoom Group & Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Zoom Controls */}
                        <div className="flex items-center gap-0.5 bg-slate-100/90 border border-slate-200/80 rounded-xl p-0.5 shrink-0">
                            <Skeleton className="h-7 w-7 rounded-lg" />
                            <Skeleton className="h-3.5 w-8 mx-1" />
                            <Skeleton className="h-7 w-7 rounded-lg" />
                            <Skeleton className="h-7 w-8 rounded-lg" />
                        </div>

                        {/* Edit Button */}
                        <Skeleton className="h-8 w-20 rounded-xl" />

                        {/* Print Button */}
                        <Skeleton className="h-8 w-18 rounded-xl" />
                    </div>
                </Card>
            </div>

            {/* Main Content Underneath Toolbar */}
            <div className="flex-1 flex gap-3.5 px-3.5 pt-1.5 pb-3.5 overflow-hidden min-h-0">

                {/* Left Sidebar (Desktop XL only): Patient Profile Card */}
                <div className="hidden xl:flex flex-col h-full overflow-hidden shrink-0 w-96">
                    <Card className="border-slate-200/80 shadow-sm bg-white flex-1 min-h-0 flex flex-col overflow-hidden h-full rounded-2xl">
                        {/* Card Header */}
                        <CardHeader className="p-3 sm:p-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4.5 w-4.5 rounded-md" />
                                    <Skeleton className="h-5 w-48" />
                                </div>
                                <Skeleton className="h-5 w-5 rounded-md" />
                            </div>
                        </CardHeader>

                        {/* Card Content */}
                        <CardContent className="p-3 space-y-2.5 text-sm flex-1 min-h-0 overflow-y-auto flex flex-col">
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
                                    <Skeleton className="h-4 w-44" />
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

                {/* Middle / Right: Editor Paper Canvas Card */}
                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                    <Card className="overflow-hidden rounded-2xl h-full flex flex-col border-slate-300/60 shadow-sm bg-slate-200/40">
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-300/30 flex flex-col items-center">
                            <div className="flex flex-col items-center gap-4 w-full max-w-[794px]">
                                {/* Page Header Tag */}
                                <div className="w-full flex justify-between items-center text-[11px] mb-1 px-1">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </div>

                                {/* Standard A4 Paper Canvas */}
                                <div className="w-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-300/80 rounded-md p-8 sm:p-10 space-y-4 min-h-[680px]">
                                    <div className="border-b border-slate-200 pb-4 space-y-2">
                                        <Skeleton className="h-6 w-56 mb-2" />
                                        <div className="grid grid-cols-3 gap-2">
                                            <Skeleton className="h-3.5 w-full" />
                                            <Skeleton className="h-3.5 w-full" />
                                            <Skeleton className="h-3.5 w-full" />
                                        </div>
                                    </div>

                                    {/* 23 Lines Shimmer Body */}
                                    <div className="space-y-3 pt-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3.5 w-full" />
                                        <Skeleton className="h-3.5 w-11/12" />
                                        <Skeleton className="h-3.5 w-full" />
                                        <Skeleton className="h-3.5 w-4/5" />
                                        <Skeleton className="h-3.5 w-full" />
                                        <Skeleton className="h-3.5 w-5/6" />
                                        <Skeleton className="h-3.5 w-11/12" />
                                        <Skeleton className="h-3.5 w-full" />
                                        <Skeleton className="h-3.5 w-3/4" />
                                        <Skeleton className="h-3.5 w-full" />
                                        <Skeleton className="h-3.5 w-5/6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
}
