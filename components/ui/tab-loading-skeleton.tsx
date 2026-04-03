export function TabLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse pt-4">
      <div className="flex gap-3">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded" />
            ))}
          </div>
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 border-b last:border-0">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-4 bg-muted rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
