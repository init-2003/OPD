import { cn } from '@/lib/utils';
import React from 'react';

export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'rounded-md bg-slate-200/80 skeleton-shimmer',
                className
            )}
            {...props}
        />
    );
}

export default Skeleton;
