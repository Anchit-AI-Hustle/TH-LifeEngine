import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Moon,
  Salad,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

const ACTIONS: { href: string; title: string; body: string; icon: LucideIcon; tint: string }[] = [
  {
    href: "/lifeengine/create",
    title: "Create a wellness plan",
    body: "Yoga, diet, sleep and habits in one day-by-day plan, written for one profile.",
    icon: Sparkles,
    tint: "bg-indigo-50 text-indigo-600",
  },
  {
    href: "/lifeengine/fitness",
    title: "Build a health profile",
    body: "Conditions, injuries, equipment and goals, so the activity planner stays safe.",
    icon: HeartPulse,
    tint: "bg-rose-50 text-rose-600",
  },
  {
    href: "/lifeengine/fitness/tracker",
    title: "Log today's activity",
    body: "Tick off sessions, log pain, mood, sleep and weight, and watch the trends.",
    icon: Activity,
    tint: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/lifeengine/habits",
    title: "Build daily habits",
    body: "Water, walks, pranayama, sleep on time: tick them off, keep streaks, run 21-day challenges.",
    icon: ListChecks,
    tint: "bg-amber-50 text-amber-600",
  },
  {
    href: "/lifeengine/sleep",
    title: "Log your sleep",
    body: "Bedtime, wake time and how you slept, with averages, sleep debt and tips from your own nights.",
    icon: Moon,
    tint: "bg-indigo-50 text-indigo-600",
  },
  {
    href: "/lifeengine/diet",
    title: "Build a diet plan",
    body: "Meals that respect restrictions, allergies and cuisine preferences.",
    icon: Salad,
    tint: "bg-lime-50 text-lime-700",
  },
  {
    href: "/lifeengine/profiles",
    title: "Manage profiles",
    body: "Everyone you plan for, with their goals and health notes.",
    icon: Users,
    tint: "bg-sky-50 text-sky-600",
  },
  {
    href: "/use-custom-gpt",
    title: "Plan with Custom GPT",
    body: "Generate a plan inside ChatGPT and bring it back here.",
    icon: Bot,
    tint: "bg-violet-50 text-violet-600",
  },
];

const STEPS = [
  { title: "Add a profile", body: "Age, goals, health notes and the time they have each day." },
  { title: "Generate a plan", body: "Pick the plan types and duration. It takes under a minute." },
  { title: "Follow and track", body: "Open the plan day by day, export it, and log progress." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 px-6 py-10 sm:px-10 sm:py-14">
        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            TH+ LifeEngine
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Wellness plans that fit the person, not the template.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
            Personal yoga, movement, diet and sleep plans, shaped by each person&apos;s health, culture, schedule and
            motivation, then tracked day by day.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/lifeengine/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Create a plan
            </Link>
            <Link
              href="/lifeengine/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Open dashboard
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="actions-title">
        <h2 id="actions-title" className="text-lg font-semibold text-gray-900">
          What would you like to do?
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {ACTIONS.map(({ href, title, body, icon: Icon, tint }) => (
            <Link
              key={href}
              href={href}
              className="group flex gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-semibold text-gray-900">
                  {title}
                  <ArrowRight
                    className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-700"
                    aria-hidden
                  />
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-gray-600">{body}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-title" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="how-title" className="text-lg font-semibold text-gray-900">
          How it works
        </h2>
        <ol className="mt-5 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <span>
                <span className="block font-medium text-gray-900">{step.title}</span>
                <span className="mt-1 block text-sm text-gray-600">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
