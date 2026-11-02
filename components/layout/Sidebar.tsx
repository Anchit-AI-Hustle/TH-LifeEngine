"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import LogoutButton from "@/components/LogoutButton";
import { NAV_GROUPS, SETTINGS_ITEM, activeHref, type NavItem } from "./nav";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/lifeengine" className="flex items-center gap-3 rounded-lg focus-visible:outline-offset-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-sm font-bold text-white shadow-sm">
        TH+
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold text-gray-900">LifeEngine</span>
        {!compact && <span className="text-xs text-gray-500">Personal wellness planner</span>}
      </span>
    </Link>
  );
}

function Item({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      <Icon
        className={clsx("h-[18px] w-[18px] shrink-0", active ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600")}
        aria-hidden
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** "+91 ••••• •5238": which account is signed in, without showing the number. */
function SignedInAs() {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { mobile?: string | null } | null) => live && setLabel(d?.mobile ?? null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  if (!label) return null;
  return (
    <p className="truncate px-3 pb-1 text-xs text-gray-500" title="Signed in">
      Signed in as <span className="font-medium tabular-nums text-gray-700">{label}</span>
    </p>
  );
}

/** The navigation itself; rendered in the desktop rail and in the phone drawer. */
export default function Sidebar({ onNavigate, showBrand = true }: { onNavigate?: () => void; showBrand?: boolean }) {
  const current = activeHref(usePathname());

  return (
    <div className="flex h-full flex-col">
      {showBrand && (
        <div className="px-5 pb-4 pt-5">
          <BrandMark />
        </div>
      )}
      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Item key={item.href} item={item} active={current === item.href} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      {/* lg:pb-[68px] keeps a strip free for the docked portfolio launchers. */}
      <div className="space-y-0.5 border-t border-gray-200 px-3 py-3 lg:pb-[68px]">
        <SignedInAs />
        <Item item={SETTINGS_ITEM} active={current === SETTINGS_ITEM.href} onNavigate={onNavigate} />
        <LogoutButton />
      </div>
    </div>
  );
}
