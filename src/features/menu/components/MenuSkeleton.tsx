export function MenuSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading menu">
      {/* Sticky Category Bar Skeleton */}
      <div className="sticky top-14 sm:top-16 z-20 border-b border-[#4A2C16] bg-[#302019]/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-2 overflow-hidden py-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-[#3D261A]"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Section Heading + Hybrid Product Grid Skeletons */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-baseline justify-between border-b border-[#4A2C16] pb-2.5">
          <div className="h-6 w-36 animate-pulse rounded bg-[#3D261A]" />
          <div className="h-4 w-16 animate-pulse rounded bg-[#3D261A]/60" />
        </div>

        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 grid-flow-row-dense gap-3 sm:gap-3.5 lg:gap-4 items-stretch">
          {[true, false, false, true, false, false].map((hasImage, idx) =>
            hasImage ? (
              <div
                key={idx}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#EDE4D9] bg-[#FFF9F2] min-[340px]:row-span-2 shadow-xs"
              >
                <div className="aspect-[4/3] w-full animate-pulse bg-[#F3E9DD]" />
                <div className="flex flex-1 flex-col justify-between p-3 sm:p-3.5">
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#EDE4D9]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[#EDE4D9]/70" />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-[#EDE4D9] pt-2.5">
                    <div className="h-4 w-16 animate-pulse rounded bg-[#EDE4D9]" />
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={idx}
                className="row-span-1 flex min-h-[88px] flex-col justify-between rounded-2xl border border-[#EDE4D9] bg-[#FFF9F2] p-3 shadow-xs sm:min-h-[96px] sm:p-3.5"
              >
                <div className="space-y-2">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-[#EDE4D9]" />
                  <div className="h-3 w-2/5 animate-pulse rounded bg-[#EDE4D9]/70" />
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-[#EDE4D9] pt-2">
                  <div className="h-4 w-16 animate-pulse rounded bg-[#EDE4D9]" />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
