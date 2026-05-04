function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/70 ${className}`} />
}

function WmsPageLoading({
  badge,
  title,
  description,
}: {
  badge: string
  title: string
  description: string
}) {
  return (
    <div className="space-y-6 pb-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-3xl border bg-card p-6">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border px-3 py-1 text-xs text-muted-foreground">
              {badge}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <LoadingBlock className="h-24" />
              <LoadingBlock className="h-24" />
              <LoadingBlock className="h-24" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6">
          <div className="space-y-4">
            <LoadingBlock className="h-5 w-32" />
            <LoadingBlock className="h-8 w-56" />
            <LoadingBlock className="h-24 w-full" />
            <LoadingBlock className="h-24 w-full" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LoadingBlock className="h-28" />
        <LoadingBlock className="h-28" />
        <LoadingBlock className="h-28" />
        <LoadingBlock className="h-28" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <LoadingBlock className="h-104" />
        <LoadingBlock className="h-104" />
      </div>
    </div>
  )
}

export { WmsPageLoading }