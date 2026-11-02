import {
  Activity,
  Bot,
  CalendarDays,
  Dumbbell,
  HeartPulse,
  House,
  LayoutDashboard,
  LibraryBig,
  ListChecks,
  Menu,
  Moon,
  Salad,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only the path itself lights this item up, not pages under it. */
  exact?: boolean;
  /** Other paths (and their children) that belong to this item. */
  also?: string[];
};
export type NavGroup = { title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/lifeengine", label: "Today", icon: House, exact: true },
      // A saved plan and the demo plan are opened from the dashboard.
      { href: "/lifeengine/dashboard", label: "Dashboard", icon: LayoutDashboard, also: ["/lifeengine/plan", "/lifeengine/plan-demo"] },
    ],
  },
  {
    title: "Daily",
    items: [
      { href: "/lifeengine/habits", label: "Habits", icon: ListChecks },
      { href: "/lifeengine/sleep", label: "Sleep", icon: Moon },
    ],
  },
  {
    title: "Plans",
    items: [
      { href: "/lifeengine/create", label: "Create plan", icon: Sparkles },
      { href: "/use-custom-gpt", label: "Custom GPT", icon: Bot, also: ["/custom-gpt"] },
      { href: "/lifeengine/diet", label: "Diet", icon: Salad },
      { href: "/lifeengine/profiles", label: "Profiles", icon: Users },
    ],
  },
  {
    title: "Fitness",
    items: [
      { href: "/lifeengine/fitness", label: "Overview", icon: HeartPulse },
      { href: "/lifeengine/fitness/planner", label: "Activity plan", icon: CalendarDays },
      { href: "/lifeengine/fitness/tracker", label: "Tracker", icon: Activity },
      { href: "/lifeengine/fitness/activities", label: "Library", icon: LibraryBig },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/lifeengine/settings", label: "Settings", icon: Settings };

const ALL_ITEMS = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];

function normalize(path: string) {
  return path.replace(/\/+$/, "") || "/";
}

const within = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

/**
 * The nav item to highlight for a path: the item whose href (or one of its
 * `also` paths) is the longest match for the path itself or one of its
 * parents. So /lifeengine/fitness/planner lights up "Activity plan" only,
 * /lifeengine/fitness lights up the Fitness "Overview", and
 * /lifeengine/plan/123 lights up "Dashboard". Returns the item's href.
 */
export function activeHref(pathname: string | null): string | null {
  const current = normalize(pathname || "/");
  let best: string | null = null;
  let bestLength = 0;
  for (const item of ALL_ITEMS) {
    const bases = item.exact ? [] : [item.href, ...(item.also ?? [])];
    const hit = item.exact
      ? current === item.href
        ? item.href.length
        : 0
      : Math.max(0, ...bases.filter((b) => within(current, b)).map((b) => b.length));
    if (hit > bestLength) {
      best = item.href;
      bestLength = hit;
    }
  }
  return best;
}

/* ---------------- bottom tab bar (phones and tablets) ---------------- */

export type TabItem = { key: string; label: string; icon: LucideIcon; href?: string };

/** "More" has no href: it opens the navigation drawer. */
export const TAB_ITEMS: TabItem[] = [
  { key: "today", label: "Today", icon: House, href: "/lifeengine" },
  { key: "habits", label: "Habits", icon: ListChecks, href: "/lifeengine/habits" },
  { key: "plans", label: "Plans", icon: LayoutDashboard, href: "/lifeengine/dashboard" },
  { key: "fitness", label: "Fitness", icon: Dumbbell, href: "/lifeengine/fitness" },
  { key: "more", label: "More", icon: Menu },
];

/** Which tab a path belongs to. Anything not covered by the first four is "More". */
export function activeTab(pathname: string | null): string {
  const href = activeHref(pathname);
  if (href === "/lifeengine") return "today";
  if (href === "/lifeengine/habits") return "habits";
  if (href === "/lifeengine/dashboard" || NAV_GROUPS.find((g) => g.title === "Plans")?.items.some((i) => i.href === href)) {
    return "plans";
  }
  if (href && within(href, "/lifeengine/fitness")) return "fitness";
  return "more";
}
