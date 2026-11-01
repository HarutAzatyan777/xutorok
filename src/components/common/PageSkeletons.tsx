export function ProtectedRouteSkeleton({ restaurantId }: { restaurantId: string }) {
  return (
    <div
      className="flex min-h-dvh flex-col bg-stone-100/70 lg:flex-row"
      aria-busy="true"
      aria-label={`Loading admin workspace for ${restaurantId}`}
    >
      {/* Sidebar Skeleton */}
      <aside className="border-b border-stone-200 bg-white p-5 lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="h-10 w-24 animate-pulse rounded-xl bg-stone-200/80" />
          <div className="space-y-2">
            <div className="h-3.5 w-24 animate-pulse rounded bg-stone-200" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-stone-200/70" />
          </div>
        </div>
        <div className="mt-4 flex gap-2 lg:flex-col">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-10 w-28 animate-pulse rounded-xl bg-stone-200/70 lg:w-full"
            />
          ))}
        </div>
      </aside>

      {/* Content Area Skeleton */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-56 animate-pulse rounded-lg bg-stone-200" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-stone-200/70" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 animate-pulse rounded-2xl border border-stone-200 bg-white p-5"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl border border-stone-200 bg-white" />
        </div>
      </main>
    </div>
  );
}

export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
      aria-busy="true"
      aria-label="Loading records"
    >
      <div className="border-b border-stone-200 bg-stone-50/80 px-4 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="h-3.5 w-32 animate-pulse rounded bg-stone-200" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-stone-200" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-stone-200" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-stone-200" />
        </div>
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-stone-200/80" />
              <div className="space-y-2">
                <div className="h-4 w-44 animate-pulse rounded bg-stone-200" />
                <div className="h-3 w-28 animate-pulse rounded bg-stone-200/70" />
              </div>
            </div>
            <div className="hidden h-5 w-24 animate-pulse rounded-full bg-stone-200/70 sm:block" />
            <div className="h-4 w-20 animate-pulse rounded bg-stone-200" />
            <div className="flex gap-1.5">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-stone-200/70" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-stone-200/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSettingsSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-busy="true" aria-label="Loading settings">
      <div className="space-y-2">
        <div className="h-7 w-52 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-stone-200/70" />
      </div>
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6"
        >
          <div className="h-5 w-48 animate-pulse rounded bg-stone-200" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-10 animate-pulse rounded-xl bg-stone-200/70" />
            <div className="h-10 animate-pulse rounded-xl bg-stone-200/70" />
            <div className="h-10 animate-pulse rounded-xl bg-stone-200/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

