export function MenuSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading menu">
      {/* Sticky Category Bar Skeleton — matches CategoryNav dimensions */}
      <div className="sticky top-[69px] z-20 border-b border-stone-200/80 bg-[#faf9f6]/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-2 overflow-hidden py-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-stone-200/80"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Section Heading + Product Grid Skeletons */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200/80 pb-2">
          <div className="h-6 w-36 animate-pulse rounded bg-stone-200/80" />
          <div className="h-4 w-16 animate-pulse rounded bg-stone-200/60" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white"
            >
              <div className="aspect-[16/10] w-full animate-pulse bg-stone-200/70" />
              <div className="flex flex-1 flex-col justify-between p-4">
                <div className="space-y-2">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200/80" />
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-stone-200/60" />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                  <div className="h-5 w-20 animate-pulse rounded bg-stone-200/80" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
