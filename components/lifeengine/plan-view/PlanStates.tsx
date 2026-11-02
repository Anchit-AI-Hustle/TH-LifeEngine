import { CircleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Classes for a Next.js <Link> that should look like a secondary button. */
export const secondaryLinkClass =
  "inline-flex min-h-[40px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0";

export const primaryLinkClass =
  "inline-flex min-h-[40px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-gray-900 bg-gray-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0";

const bar = "animate-pulse rounded-lg bg-gray-200/70";

/** Placeholder with the same shape as the plan reader. */
export function PlanSkeleton({ label = "Loading your plan" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between" aria-hidden>
        <div className="space-y-3">
          <div className={`${bar} h-8 w-64 max-w-full`} />
          <div className={`${bar} h-4 w-80 max-w-full`} />
        </div>
        <div className="flex gap-2">
          <div className={`${bar} h-10 w-28 rounded-xl`} />
          <div className={`${bar} h-10 w-24 rounded-xl`} />
          <div className={`${bar} h-10 w-24 rounded-xl`} />
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[15rem_minmax(0,1fr)]" aria-hidden>
        <div className="flex gap-2 overflow-hidden lg:flex-col lg:rounded-2xl lg:border lg:border-gray-200 lg:bg-white lg:p-2">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={`${bar} h-12 w-20 shrink-0 rounded-xl lg:w-full`} />
          ))}
        </div>
        <div className="mt-4 space-y-4 lg:mt-0">
          <div className={`${bar} h-7 w-40`} />
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className={`${bar} h-10 w-10 rounded-xl`} />
                <div className={`${bar} h-5 w-32`} />
              </div>
              <div className="mt-5 space-y-2.5">
                <div className={`${bar} h-4 w-full`} />
                <div className={`${bar} h-4 w-11/12`} />
                <div className={`${bar} h-4 w-4/6`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Inline error with a retry, for when the plan could not be loaded. */
export function PlanError({ message, onRetry, children }: { message: string; onRetry?: () => void; children?: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <CircleAlert className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">We could not load this plan</h2>
          <p className="mt-1 text-sm text-gray-600">{message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry && (
              <Button type="button" onClick={onRetry}>
                <RefreshCw aria-hidden />
                Try again
              </Button>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
