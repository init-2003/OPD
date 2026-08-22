import React from 'react';
import { Skeleton } from '@/Components/ui/skeleton';

export default function ProfileSkeleton() {
    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col p-4 sm:p-6 w-full max-w-full select-none pointer-events-none animate-in fade-in duration-200">
            <div className="mx-auto w-full max-w-6xl space-y-5 flex flex-col h-full overflow-hidden">

                {/* Header Banner Skeleton */}
                <div className="relative overflow-hidden liquid-glass-card p-6 sm:p-8 rounded-3xl shrink-0 border border-slate-200/80 shadow-sm">
                    <div className="relative z-10 space-y-5">
                        {/* Back Button Skeleton */}
                        <Skeleton className="h-8 w-28 rounded-full" />

                        <div className="space-y-2">
                            <Skeleton className="h-3.5 w-32 rounded-md" />
                            <Skeleton className="h-8 w-64 sm:w-80 rounded-lg" />
                            <Skeleton className="h-4 w-72 sm:w-96 rounded-md" />
                        </div>
                    </div>
                </div>

                {/* Content Section Skeleton */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] h-full overflow-hidden">

                        {/* Profile Summary Card Skeleton */}
                        <div className="liquid-glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center border border-slate-200/80 shadow-sm">
                            <Skeleton className="h-28 w-28 rounded-full border-4 border-white/90 shadow-xl" />

                            <Skeleton className="h-6 w-44 rounded-lg mt-5" />

                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                        </div>

                        {/* User Information Grid Card Skeleton */}
                        <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 flex flex-col min-h-0 overflow-y-auto border border-slate-200/80 shadow-sm">
                            <div className="mb-6 border-b border-slate-200/70 pb-4 space-y-2">
                                <Skeleton className="h-3.5 w-36 rounded-md" />
                                <Skeleton className="h-6 w-56 rounded-lg" />
                                <Skeleton className="h-4 w-80 rounded-md" />
                            </div>

                            {/* 4 Info Rows Grid Skeleton */}
                            <div className="grid gap-3.5 sm:grid-cols-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 rounded-2xl p-3.5 liquid-glass-box border border-slate-200/60"
                                    >
                                        <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <Skeleton className="h-3.5 w-24 rounded-md" />
                                            <Skeleton className="h-5 w-40 rounded-md" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
