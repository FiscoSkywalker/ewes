/** Silhouette de la coquille pendant la vérification de la session. */
export function ShellSkeleton() {
  return (
    <div
      className="flex h-dvh overflow-hidden"
      aria-busy="true"
      aria-label="Chargement du portail"
    >
      <div className="hidden w-[272px] shrink-0 flex-col gap-3 p-4 lg:flex">
        <div className="portal-skeleton mb-4 h-9 w-32 rounded-lg" />
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className="portal-skeleton h-8 rounded-lg"
            style={{ width: `${60 + ((i * 17) % 35)}%` }}
          />
        ))}
      </div>
      <div className="min-w-0 flex-1 lg:py-2 lg:pr-2">
        <div className="h-full bg-panel lg:rounded-2xl lg:border lg:border-line lg:shadow-panel">
          <div className="flex h-14 items-center gap-3 border-b border-line px-4">
            <div className="portal-skeleton h-4 w-48 rounded" />
            <div className="portal-skeleton ml-auto h-9 w-72 rounded-lg max-sm:hidden" />
            <div className="portal-skeleton size-8 rounded-full" />
          </div>
          <div className="space-y-6 p-6 lg:p-10">
            <div className="portal-skeleton h-8 w-72 rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="portal-skeleton h-32 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
