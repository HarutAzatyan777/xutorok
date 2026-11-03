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

      {/* Section Heading + Hybrid Product Grid Skeletons */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200/80 pb-2">
          <div className="h-6 w-36 animate-pulse rounded bg-stone-200/80" />
          <div className="h-4 w-16 animate-pulse rounded bg-stone-200/60" />
        </div>

        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 grid-flow-row-dense gap-3 sm:gap-3.5 lg:gap-4 items-stretch">
          {[true, false, false, true, false, false].map((hasImage, idx) =>
            hasImage ? (
              <div
                key={idx}
                className="flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white min-[340px]:row-span-2"
              >
                <div className="aspect-[4/3] w-full animate-pulse bg-stone-200/70" />
                <div className="flex flex-1 flex-col justify-between p-3 sm:p-3.5">
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200/80" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-stone-200/60" />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2.5">
                    <div className="h-4 w-16 animate-pulse rounded bg-stone-200/80" />
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={idx}
                className="row-span-1 flex min-h-[88px] flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-3 sm:min-h-[96px] sm:p-3.5"
              >
                <div className="space-y-2">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-stone-200/80" />
                  <div className="h-3 w-2/5 animate-pulse rounded bg-stone-200/60" />
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2">
                  <div className="h-4 w-16 animate-pulse rounded bg-stone-200/80" />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
