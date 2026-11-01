export function MenuSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading menu">
      {/* Sticky Category Bar Skeleton */}
      <div className="sticky top-[69px] z-20 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-hidden px-4 py-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-stone-200/80"
            />
          ))}
        </div>
      </div>

      {/* Category Section & Product Grid Skeletons */}
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-6">
        {Array.from({ length: 2 }).map((_, sectionIdx) => (
          <div key={sectionIdx} className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-stone-200/80 pb-2">
              <div className="h-6 w-48 animate-pulse rounded-lg bg-stone-200" />
              <div className="h-4 w-16 animate-pulse rounded bg-stone-200/70" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((__, cardIdx) => (
                <div
                  key={cardIdx}
                  className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white"
                >
                  <div className="aspect-[16/10] w-full animate-pulse bg-stone-200/70" />
                  <div className="space-y-3 p-4">
                    <div className="h-3 w-20 animate-pulse rounded bg-stone-200/80" />
                    <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200" />
                    <div className="flex items-center justify-between pt-1">
                      <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
                      <div className="h-6 w-16 animate-pulse rounded-full bg-stone-200/70" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

