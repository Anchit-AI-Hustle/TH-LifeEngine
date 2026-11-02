import type { ReactNode } from "react";

export const cardClass = "min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6";

export const primaryLink =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800";

export const secondaryLink =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50";

export const textLink =
  "inline-flex min-h-[40px] items-center gap-1 rounded-lg text-sm font-semibold text-indigo-700 hover:text-indigo-900";

/** Section title row of a Today card, with an optional right-hand slot. */
export function CardHeader({
  id,
  title,
  description,
  aside,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
