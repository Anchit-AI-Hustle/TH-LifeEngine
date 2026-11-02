"use client";

import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, CircleCheck, Download, ListChecks, Printer } from "lucide-react";
import PlanNotebook from "@/components/lifeengine/PlanNotebook";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { samplePlan } from "./samplePlan";

const FEATURES = [
  { icon: CalendarDays, title: "Day by day", body: "Each day has a theme. Pick one from the list, or step through with the buttons or the arrow keys." },
  { icon: CircleCheck, title: "Tick off as you go", body: "Mark each yoga session, workout and meal done and see the day's progress. Ticks follow your account." },
  { icon: ListChecks, title: "Clear instructions", body: "Yoga, training and meals in their own sections, with numbered steps, sets, reps and timings." },
  { icon: BookOpen, title: "Recipes on demand", body: "Indian home food with calories and macros; open a recipe for ingredients and method." },
  { icon: Download, title: "PDF export", body: "Download the whole plan, one day, or any days you choose. Each day starts on a new page." },
  { icon: Printer, title: "Print friendly", body: "Printing hides the app and prints every day on its own page, black on white." },
];

export default function PlanDemoPage() {
  // The open sample lives in the URL (#sample), so reload and the back button work.
  const [showDemo, setShowDemo] = useState(false);
  useEffect(() => {
    const sync = () => setShowDemo(window.location.hash === "#sample");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const open = () => {
    window.location.hash = "sample";
    window.scrollTo({ top: 0 });
  };
  const close = () => {
    history.pushState(null, "", window.location.pathname + window.location.search);
    setShowDemo(false);
  };

  if (showDemo) {
    return <PlanNotebook data={samplePlan} onClose={close} />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Sample"
        title="Plan viewer"
        description="See how a plan reads before you create your own. This sample is a 7-day yoga, vegetarian diet and fitness plan for a beginner."
        actions={
          <Button type="button" onClick={open}>
            <BookOpen aria-hidden />
            View sample plan
          </Button>
        }
      />
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="demo-features">
        <h2 id="demo-features" className="text-base font-semibold text-gray-900">
          What you get
        </h2>
        <ul className="mt-5 grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="mt-0.5 text-sm text-gray-600">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-gray-100 pt-5">
          <Button type="button" onClick={open}>
            View sample plan
          </Button>
        </div>
      </section>
    </div>
  );
}
