'use client'

interface LoadingSkeletonProps {
    viewMode: 'grid' | 'table'
    count?: number
}

function SkeletonPulse({ className = '' }: { className?: string }) {
    return (
        <div
            className={`rounded-lg bg-muted/40 animate-shimmer-vertical ${className}`}
        />
    )
}

function GridCardSkeleton() {
    return (
        <div className="rounded-xl border bg-card p-4 space-y-3">
            {/* Image area */}
            <SkeletonPulse className="w-full aspect-[4/3]" />
            {/* Title */}
            <SkeletonPulse className="h-4 w-3/4" />
            {/* Meta */}
            <div className="space-y-1">
                <SkeletonPulse className="h-3 w-1/3" />
                <SkeletonPulse className="h-3 w-1/2" />
            </div>
        </div>
    )
}

function TableRowSkeleton() {
    return (
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
            <SkeletonPulse className="h-4 w-4 rounded" />
            <SkeletonPulse className="h-4 flex-1 max-w-[200px]" />
            <SkeletonPulse className="h-4 w-16 hidden sm:block" />
            <SkeletonPulse className="h-4 w-24 hidden sm:block" />
            <SkeletonPulse className="h-4 w-8 ml-auto" />
        </div>
    )
}

export function LoadingSkeleton({ viewMode, count }: LoadingSkeletonProps) {
    const gridCount = count ?? 12
    const tableCount = count ?? 8

    if (viewMode === 'table') {
        return (
            <div className="rounded-xl border bg-card overflow-hidden animate-fade-in">
                {/* Table header skeleton */}
                <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/10">
                    <SkeletonPulse className="h-4 w-4 rounded" />
                    <SkeletonPulse className="h-4 w-16" />
                    <SkeletonPulse className="h-4 w-12 hidden sm:block" />
                    <SkeletonPulse className="h-4 w-16 hidden sm:block" />
                    <div className="w-8 ml-auto" />
                </div>
                {Array.from({ length: tableCount }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                ))}
            </div>
        )
    }

    // Match FileList's CELL_HEIGHT (200px) and GAP (16px) logic
    return (
        <div
            className="
        grid
        grid-cols-1
        min-[440px]:grid-cols-2
        sm:grid-cols-3
        md:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-5
        2xl:grid-cols-6
        gap-4 animate-fade-in
      "
        >
            {Array.from({ length: gridCount }).map((_, i) => (
                <GridCardSkeleton key={i} />
            ))}
        </div>
    )
}
