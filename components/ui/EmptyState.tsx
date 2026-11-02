"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** A link or button rendered under the text. */
  action?: React.ReactNode;
  className?: string;
};

/** The one empty state: icon in a soft tile, a short title, one line of help, one action. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-gray-600">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
