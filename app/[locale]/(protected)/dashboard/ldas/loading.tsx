import React from "react"

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-5 w-40 bg-muted rounded" />

      {/* Header and actions skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-8 w-72 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-muted rounded" />
          <div className="h-9 w-36 bg-muted rounded" />
        </div>
      </div>

      {/* Filters/search skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="h-10 w-full bg-muted rounded" />
        <div className="h-10 w-full bg-muted rounded" />
        <div className="h-10 w-full bg-muted rounded" />
      </div>

      {/* List/grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="space-y-3">
              <div className="h-5 w-2/3 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-20 bg-muted rounded" />
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
