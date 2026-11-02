# TH+ LifeEngine design system

One look across every page. When in doubt, copy an existing page that already
follows this: `app/lifeengine/page.tsx` (home), `app/lifeengine/settings/page.tsx`,
`app/login/page.tsx`, the shell in `components/layout/`.

## Principles
1. **Calm and clinical-grade.** White cards on a light grey canvas, one accent
   (indigo), generous spacing. No rainbow gradients, no gradient text, no
   glassmorphism, no bouncing or scaling on hover.
2. **Icons are lucide-react, never emoji.** Emoji are not icons: they render
   differently per OS, are read out by screen readers and break alignment.
   Food or activity emoji inside user content (a meal name) are fine.
3. **Nothing overlaps.** No icon sits on text; inputs with a leading icon use
   `pl-10` and the icon `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4`.
   Verify with `overlap.js` (see Testing).
4. **Every state is designed:** loading (skeleton), empty (`EmptyState`),
   error (inline alert with a retry), success (inline confirmation, not `alert()`).
5. **Mobile first.** 390px phone, 820px tablet, 1440px desktop. No horizontal
   scroll, tap targets at least 40px, forms one column on phones.

## Tokens (app/globals.css `:root`)
| Token | Value | Use |
|---|---|---|
| `--bg` | #F6F7F9 | page canvas (the shell sets it) |
| `--panel` | #FFFFFF | cards |
| `--border` / `--border-strong` | #E5E7EB / #D1D5DB | card borders / control borders |
| `--text` / `--text-2` / `--muted` / `--subtle` | #111827 / #374151 / #6B7280 / #9CA3AF | headings / body / secondary / placeholders |
| `--brand` | #111827 | primary buttons |
| `--accent` / `--accent-quiet` | #4F46E5 / #EEF2FF | selection, links, focus, active nav |
| `--success`, `--warn`, `--error` (+ `-quiet`) | emerald / amber / red | status only |
| `--ring` | indigo 16% | focus ring |

Tailwind equivalents: `gray-*`, `indigo-*`, `emerald-*`, `amber-*`, `red-*`.
Do not introduce blue, purple, pink or teal as UI colours.

## Type scale
- Page title: use `<PageHeader title description eyebrow actions />` (`components/ui/PageHeader.tsx`).
- Section title: `text-base font-semibold text-gray-900` (+ `text-sm text-gray-500` description below).
- Body: `text-sm text-gray-700`; secondary `text-sm text-gray-500`; captions `text-xs text-gray-500`.
- Numbers in stats: `text-2xl font-semibold tabular-nums text-gray-900`.
- Never use italic for UI text; never all-caps sentences (all-caps only for tiny eyebrows/table headers with `tracking-wider`).

## Building blocks (Tailwind)
- **Card:** `rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6`.
- **Stat card:** card + `flex items-start justify-between`; label `text-sm font-medium text-gray-500`, value as above, icon in `h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600` tile, optional hint `text-xs text-gray-500`.
- **Primary button:** `<Button>` or `inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50`.
- **Secondary button:** `<Button variant="ghost">` or `rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50`.
- **Text button:** `<Button variant="subtle">`.
- **Destructive:** `<Button variant="danger">`, always behind a confirmation.
- **Input / Select / Textarea:** `components/ui/Input|Select|Textarea` or `w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100`. Wrap with `<Field label helper error>` for labels.
- **Chip / tag:** `inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700`; selected filter chip `bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200`.
- **Segmented control:** `inline-grid grid-flow-col rounded-xl bg-gray-100 p-1`; active segment `bg-white shadow-sm text-gray-900`, others `text-gray-500`.
- **Alert:** `rounded-xl border px-4 py-3 text-sm` with `border-red-200 bg-red-50 text-red-700` (error), amber for warnings, emerald for success, plus a lucide icon.
- **Empty state:** `<EmptyState icon={LucideIcon} title description action />`.
- **Skeleton:** `animate-pulse rounded-lg bg-gray-100`.
- **Table:** wrap in `overflow-x-auto rounded-2xl border border-gray-200 bg-white`; header row `bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500`; rows `border-t border-gray-100 text-sm`. On phones prefer a card list.
- **Grid gaps:** `gap-4` (cards), `gap-6` (sections), sections separated by `space-y-6` / `space-y-8`.

## Copy
Sentence case everywhere ("Create plan", not "Create Plan"). Plain words, no
marketing superlatives, no developer jargon on screen ("Data Source: Plan
Creation Module" does not belong in the UI).

## Testing
- `npx tsc --noEmit` and `npm run build`.
- Overlap detector: `node <scratchpad>/overlap.js http://localhost:<port> /your/page` must report 0 in-page overlaps.
- Screenshots at 390 / 820 / 1440 and no console errors.
