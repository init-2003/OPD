import React from 'react';
import { Skeleton } from '@/Components/ui/skeleton';

export default function SettingsSkeleton() {
    return (
        <div className="min-h-[calc(100vh-65px)] lg:h-[calc(100vh-65px)] overflow-y-auto flex flex-col p-3.5 sm:p-5 w-full max-w-full space-y-4 select-none pointer-events-none animate-in fade-in duration-200">
            <div className="w-full max-w-full space-y-4 flex flex-col min-h-0 flex-1">

                {/* Header Banner Skeleton */}
                <div className="relative overflow-hidden liquid-glass-card p-4 sm:p-5 rounded-2xl shrink-0 border border-slate-200/80 shadow-sm">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            {/* Back Button Skeleton */}
                            <Skeleton className="h-9 w-32 rounded-full" />

                            <div className="h-6 w-px bg-slate-300/60 hidden sm:block" />

                            {/* Title Skeleton */}
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
                                <div className="space-y-1">
                                    <Skeleton className="h-6 w-48 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notification Setting Main Card Skeleton */}
                <div className="p-5 sm:p-6 rounded-2xl liquid-glass-card border border-slate-200/80 shadow-sm space-y-5">
                    {/* Switch Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3.5">
                            <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <Skeleton className="h-5.5 w-64 rounded-md" />
                                    <Skeleton className="h-5 w-24 rounded-full" />
                                </div>
                            </div>
                        </div>

                        <div className="self-end sm:self-center shrink-0">
                            <Skeleton className="h-8 w-15 rounded-full" />
                        </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Skeleton className="h-9 w-48 rounded-full" />
                            <Skeleton className="h-9 w-60 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* PWA App Installation Card Skeleton */}
                <div className="p-5 sm:p-6 rounded-2xl liquid-glass-card border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <Skeleton className="h-5.5 w-56 rounded-md" />
                                    <Skeleton className="h-5 w-32 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-72 sm:w-96 rounded-md" />
                            </div>
                        </div>

                        <div className="self-end sm:self-center shrink-0">
                            <Skeleton className="h-9.5 w-48 rounded-full" />
                        </div>
                    </div>

                    {/* 3 Step Guidance Cards Skeleton */}
                    <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-3">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4.5 w-4.5 rounded-md" />
                            <Skeleton className="h-5 w-60 rounded-md" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <Skeleton className="h-4 w-28 rounded-md" />
                                <Skeleton className="h-3.5 w-full rounded-md" />
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <Skeleton className="h-4 w-36 rounded-md" />
                                <Skeleton className="h-3.5 w-full rounded-md" />
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <Skeleton className="h-4 w-32 rounded-md" />
                                <Skeleton className="h-3.5 w-full rounded-md" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
