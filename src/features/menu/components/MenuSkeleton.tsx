export function MenuSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6" aria-busy="true" aria-label="Loading menu">
      {/* Category Pill Skeletons */}
      <div className="flex gap-2 overflow-hidden pb-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-stone-200/80"
          />
        ))}
      </div>

      {/* Product Grid Skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white"
          >
            <div className="aspect-[16/10] w-full animate-pulse bg-stone-200/70" />
            <div className="space-y-3 p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-stone-200" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

