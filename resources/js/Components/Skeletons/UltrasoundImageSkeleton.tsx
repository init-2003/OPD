import React from 'react';
import { Skeleton } from '@/Components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/Components/ui/card';

export default function UltrasoundImageSkeleton() {
    return (
        <div className="min-h-[calc(100vh-65px)] lg:h-[calc(100vh-65px)] overflow-y-auto lg:overflow-hidden flex flex-col p-3.5 sm:p-5 w-full max-w-full space-y-4 animate-in fade-in-50 duration-200">
            {/* Top Navigation & Patient Summary Header Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 liquid-glass-card p-3.5 sm:p-4 rounded-2xl shrink-0 w-full shadow-sm border border-slate-200/80">
                <div className="flex items-center gap-3.5 flex-wrap">
                    {/* Back Button */}
                    <Skeleton className="h-10 w-48 rounded-full" />

                    <div className="h-6 w-px bg-slate-300/60 hidden sm:block" />

                    {/* Patient Quick Chip */}
                    <div className="flex items-center gap-3 bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-full shadow-2xs">
                        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                        <div className="flex items-center gap-2 flex-wrap">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-24 rounded-full" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                    </div>

                    {/* Total Photos Badge */}
                    <Skeleton className="h-7 w-44 rounded-full" />
                </div>

                <div className="flex items-center gap-2">
                    {/* Upload Button */}
                    <Skeleton className="h-10 w-36 rounded-full" />
                </div>
            </div>

            {/* Main 2-Column Studio Canvas: Left = Multi-Select Visit List (4 cols), Right = Grouped Galleries (8 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4.5 flex-1 min-h-0 w-full max-w-full">
                
                {/* Left Column: Multi-Select Visit List (4 Columns) */}
                <div className="lg:col-span-4 h-auto lg:h-full flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden">
                    <Card className="liquid-glass-card shadow-lg border border-slate-300/80 rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden">
                        <CardHeader className="p-3.5 sm:p-4 border-b border-slate-200/80 shrink-0 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5 rounded-md" />
                                    <Skeleton className="h-5 w-44" />
                                </div>
                                <Skeleton className="h-5 w-20 rounded-full" />
                            </div>

                            {/* Select All Link */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                <Skeleton className="h-4 w-36" />
                            </div>
                        </CardHeader>

                        <CardContent className="p-3 space-y-3 flex-1 min-h-0 overflow-y-auto">
                            {/* Visit Item Cards */}
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className={`p-4 rounded-2xl border backdrop-blur-xl space-y-3 ${i === 1 ? 'bg-[#E8F8F2]/75 border-[#00875A]/40' : 'bg-white/80 border-slate-200/80'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2.5">
                                            <Skeleton className="w-5 h-5 rounded-md shrink-0" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-3 w-28" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-1.5">
                                            <Skeleton className="h-3.5 w-3.5 rounded-full" />
                                            <Skeleton className="h-3.5 w-24" />
                                        </div>
                                        <Skeleton className="h-7 w-32 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Grouped Galleries (8 Columns) */}
                <div className="lg:col-span-8 h-auto lg:h-full flex flex-col min-h-[500px] lg:min-h-0 overflow-hidden">
                    <Card className="liquid-glass-card shadow-lg border border-slate-300/80 rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
                        
                        {/* Top Gallery Toolbar */}
                        <CardHeader className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-white/70">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="h-5 w-5 rounded-md" />
                                <Skeleton className="h-5 w-64 sm:w-80" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-24 rounded-lg" />
                                <Skeleton className="h-8 w-28 rounded-lg" />
                            </div>
                        </CardHeader>

                        {/* Gallery Content Shimmer */}
                        <CardContent className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-6">
                            
                            {/* Visit Section Header */}
                            <div className="space-y-3.5">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                                    <div className="flex items-center gap-2.5">
                                        <Skeleton className="h-6 w-24 rounded-lg" />
                                        <Skeleton className="h-4 w-36" />
                                    </div>
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </div>

                                {/* Image Cards Grid (2 cols on mobile, 4 cols on desktop) */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
                                    {Array.from({ length: 8 }).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="liquid-glass-card rounded-2xl overflow-hidden border border-slate-200/80 p-2.5 space-y-2 bg-white/90 shadow-sm"
                                        >
                                            {/* Image Thumbnail Shimmer */}
                                            <Skeleton className="w-full aspect-square rounded-xl" />

                                            {/* Caption & Actions */}
                                            <div className="space-y-1.5 px-0.5">
                                                <Skeleton className="h-3.5 w-3/4" />
                                                <div className="flex justify-between items-center pt-1">
                                                    <Skeleton className="h-3 w-16" />
                                                    <div className="flex gap-1">
                                                        <Skeleton className="h-6 w-6 rounded-md" />
                                                        <Skeleton className="h-6 w-6 rounded-md" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
