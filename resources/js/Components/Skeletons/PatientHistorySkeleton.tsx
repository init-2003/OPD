import React from 'react';
import { Skeleton } from '@/Components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/Components/ui/card';

export default function PatientHistorySkeleton() {
    return (
        <div className="p-3.5 sm:p-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col animate-in fade-in-50 duration-200">
            <div className="w-full max-w-full space-y-4 flex flex-col min-h-0 flex-1 lg:overflow-hidden">
                {/* Top Patient Profile Bar */}
                <Card className="border-slate-200/80 shadow-sm bg-white rounded-2xl p-3 sm:p-4 shrink-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl shrink-0" />
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-44 sm:w-60" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-3.5 w-24" />
                                    <Skeleton className="h-3.5 w-20" />
                                    <Skeleton className="h-3.5 w-28" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-24 rounded-lg" />
                            <Skeleton className="h-8 w-28 rounded-lg" />
                        </div>
                    </div>
                </Card>

                {/* History Timeline / Table Card */}
                <Card className="border-slate-200/80 shadow-sm bg-white flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl">
                    <CardHeader className="p-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-5 w-44" />
                            <Skeleton className="h-8 w-36 rounded-lg" />
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 overflow-hidden flex-1 min-h-0 flex flex-col space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="p-3.5 liquid-glass-box rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-5 rounded-full" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-20 rounded-full" />
                                    </div>
                                    <Skeleton className="h-4 w-28" />
                                </div>
                                <div className="grid grid-cols-3 gap-3 pt-1">
                                    <Skeleton className="h-3.5 w-full" />
                                    <Skeleton className="h-3.5 w-full" />
                                    <Skeleton className="h-3.5 w-full" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
