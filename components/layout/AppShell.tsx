"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Sidebar, { BrandMark } from "./Sidebar";
import { TAB_ITEMS, activeTab } from "./nav";
import { hydrate } from "@/lib/sync/client";

/**
 * The one app frame for every signed-in page.
 * - lg and up: a fixed 264px rail on the left (matches --sidebar-w in globals.css).
 * - below lg: a sticky top bar with a menu button that opens the same nav as a
 *   drawer, and a bottom tab bar (Today, Habits, Plans, Fitness, More = drawer).
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Pages read habits, sleep and fitness data from browser storage on mount,
  // so the account's copy is pulled in first (never longer than 4 seconds).
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    let live = true;
    const done = () => live && setSynced(true);
    const cap = setTimeout(done, 4000);
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { owner?: string } | null) => hydrate(d?.owner ?? null))
      .catch(() => {})
      .finally(() => {
        clearTimeout(cap);
        done();
      });
    return () => {
      live = false;
      clearTimeout(cap);
    };
  }, []);
  const menuButton = useRef<HTMLButtonElement>(null);
  // The button that opened the drawer (top-bar menu or the "More" tab) gets focus back.
  const opener = useRef<HTMLElement | null>(null);
  const drawer = useRef<HTMLDivElement>(null);
  // Set by close(); the cleanup below moves focus back once the top bar is no longer inert.
  const returnFocus = useRef(false);
  const pathname = usePathname();

  const close = useCallback(() => {
    returnFocus.current = true;
    setOpen(false);
  }, []);

  const openDrawer = (from: HTMLElement | null) => {
    opener.current = from;
    setOpen(true);
  };
  const tab = activeTab(pathname);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock page scroll, close on Escape, keep Tab inside the drawer.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The portfolio launchers float above everything; hide them so they
    // cannot cover the drawer (they sat on top of "Sign out" on phones).
    document.documentElement.classList.add("nav-open");
    const panel = drawer.current;
    panel?.querySelector<HTMLElement>("button, a")?.focus();
    // Everything behind the drawer is out of reach for Tab and screen readers.
    const behind = [document.getElementById("main"), document.getElementById("topbar"), document.getElementById("tabbar")];
    behind.forEach((el) => el?.setAttribute("inert", ""));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panel.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.classList.remove("nav-open");
      behind.forEach((el) => el?.removeAttribute("inert"));
      if (returnFocus.current) {
        returnFocus.current = false;
        (opener.current ?? menuButton.current)?.focus();
      }
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // A desktop-width resize while open would leave the page scroll-locked.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-gray-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {/* Phone and tablet top bar */}
      <header id="topbar" className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          ref={menuButton}
          type="button"
          onClick={(e) => openDrawer(e.currentTarget)}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <BrandMark compact />
      </header>

      {/* Phone and tablet drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation" id="mobile-nav">
          <div className="absolute inset-0 bg-gray-900/40 animate-[fade-in_150ms_ease-out]" onClick={close} aria-hidden />
          <div
            ref={drawer}
            className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-white shadow-xl animate-[drawer-in_200ms_ease-out]"
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <BrandMark />
              <button
                type="button"
                onClick={close}
                aria-label="Close navigation"
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <Sidebar showBrand={false} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* The portfolio launchers are docked in the top bar / sidebar (globals.css). */}
      <main id="main" className="lg:pl-[264px]">
        {/* Below lg the bottom padding clears the fixed tab bar (64px + the home-indicator inset). */}
        <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-16 lg:pt-8">
          {synced ? (
            children
          ) : (
            <div className="space-y-4" role="status" aria-label="Loading your data">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-4 w-80 max-w-full animate-pulse rounded bg-gray-200" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Phone and tablet tab bar */}
      <nav
        id="tabbar"
        aria-label="Quick"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
          {TAB_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            const inner = (
              <>
                <span
                  className={clsx(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active ? "bg-indigo-50 text-indigo-600" : "text-gray-500",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className={clsx("text-[11px] font-medium leading-none", active ? "text-indigo-700" : "text-gray-600")}>
                  {item.label}
                </span>
              </>
            );
            const cls = "flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg";
            return (
              <li key={item.key} className="min-w-0">
                {item.href ? (
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => openDrawer(e.currentTarget)}
                    aria-expanded={open}
                    aria-controls="mobile-nav"
                    aria-label="More: open navigation"
                    className={cls}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Sticky bottom action bars inside pages (e.g. Create plan) sit on top of the tab bar, not under it. */}
      <style>{`@media (max-width: 1023px) { #main .sticky.bottom-0 { bottom: calc(4rem + env(safe-area-inset-bottom)); } }`}</style>
    </div>
  );
}
