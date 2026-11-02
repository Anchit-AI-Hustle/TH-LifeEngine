import {
  Activity,
  Bot,
  CalendarDays,
  HeartPulse,
  House,
  LayoutDashboard,
  LibraryBig,
  ListChecks,
  Moon,
  Salad,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/lifeengine", label: "Home", icon: House },
      { href: "/lifeengine/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
      { href: "/use-custom-gpt", label: "Create with Custom GPT", icon: Bot },
      { href: "/lifeengine/profiles", label: "Profiles", icon: Users },
      { href: "/lifeengine/diet", label: "Diet builder", icon: Salad },
    ],
  },
  {
    title: "Fitness",
    items: [
      { href: "/lifeengine/fitness", label: "Health profile", icon: HeartPulse },
      { href: "/lifeengine/fitness/planner", label: "Activity plan", icon: CalendarDays },
      { href: "/lifeengine/fitness/tracker", label: "Activity tracker", icon: Activity },
      { href: "/lifeengine/fitness/activities", label: "Activity library", icon: LibraryBig },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/lifeengine/settings", label: "Settings", icon: Settings };

const ALL_HREFS = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM].map((i) => i.href);

function normalize(path: string) {
  return path.replace(/\/+$/, "") || "/";
}

/**
 * The nav item to highlight for a path: the longest href that is the path
 * itself or one of its parents. So /lifeengine/fitness/planner lights up
 * "Activity plan" only, and /lifeengine/plan/123 lights up "Home".
 */
export function activeHref(pathname: string | null): string | null {
  const current = normalize(pathname || "/");
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    if (current === href || current.startsWith(`${href}/`)) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}
