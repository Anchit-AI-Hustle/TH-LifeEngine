"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Check, Circle, LoaderCircle, MinusCircle, Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { ProfileBrief } from "@/lib/onboarding/simulate";
import { STEPS, listProfiles, runFirstWeek, type StepId, type StepReport } from "@/lib/onboarding/runFirstWeek";

const GOAL_CHOICES = ["Weight loss", "PCOS management", "Blood sugar control", "Reduce stress", "Better sleep", "Build strength", "Back or knee pain", "General wellness"];

type Phase = "loading" | "ready" | "running" | "finished";

export default function SetupPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [profiles, setProfiles] = useState<ProfileBrief[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", age: "", gender: "", goals: [] as string[], healthConcerns: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<StepId, StepReport>>(() =>
    Object.fromEntries(STEPS.map((s) => [s.id, { id: s.id, state: "pending" }])) as Record<StepId, StepReport>,
  );
  const [failed, setFailed] = useState(0);

  // /lifeengine/setup?goals=Weight%20loss,Better%20sleep pre-ticks those goals.
  useEffect(() => {
    const wanted = (new URLSearchParams(window.location.search).get("goals") ?? "")
      .split(",")
      .map((g) => g.trim())
      .filter((g) => GOAL_CHOICES.includes(g));
    if (wanted.length) setForm((f) => ({ ...f, goals: wanted }));
  }, []);

  useEffect(() => {
    listProfiles()
      .then((ps) => {
        setProfiles(ps);
        setChosen(ps[0]?.id ?? "new");
        setPhase("ready");
      })
      .catch(() => {
        setLoadError("Could not load your profiles. Check your connection and refresh.");
        setPhase("ready");
        setChosen("new");
      });
  }, []);

  const toggleGoal = (g: string) =>
    setForm((f) => ({ ...f, goals: f.goals.includes(g) ? f.goals.filter((x) => x !== g) : [...f.goals, g] }));

  const start = async () => {
    setFormError(null);
    const existing = profiles.find((p) => p.id === chosen);
    let create;
    if (!existing) {
      const age = Number(form.age);
      if (!form.name.trim()) return setFormError("Add your name.");
      if (!Number.isFinite(age) || age < 13 || age > 100) return setFormError("Add your age (13 to 100).");
      if (!form.gender) return setFormError("Choose a gender.");
      if (!form.goals.length) return setFormError("Pick at least one goal.");
      create = { name: form.name.trim(), age, gender: form.gender as "female" | "male" | "other", goals: form.goals, healthConcerns: form.healthConcerns.trim() };
    }
    setPhase("running");
    const result = await runFirstWeek({ existing, create }, (r) => setSteps((s) => ({ ...s, [r.id]: r })));
    setFailed(result.failed);
    setPhase("finished");
  };

  const chosenProfile = profiles.find((p) => p.id === chosen);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Get started"
        title="Set up my first week"
        description="Runs every feature once for you, so your dashboard, habits, sleep and fitness pages show what the app looks like after two weeks of use."
      />

      {phase === "loading" && <div className="h-40 animate-pulse rounded-2xl bg-gray-100" role="status" aria-label="Loading" />}

      {(phase === "ready" || phase === "running" || phase === "finished") && (
        <div className="space-y-6">
          {phase === "ready" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-gray-900">Who is this for?</h2>
              {loadError && <p className="mt-2 text-sm text-red-600" role="alert">{loadError}</p>}
              {profiles.length > 0 && (
                <div className="mt-4">
                  <Field label="Profile">
                    <Select value={chosen} onChange={(e) => setChosen(e.target.value)}>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.age}
                        </option>
                      ))}
                      <option value="new">Someone new…</option>
                    </Select>
                  </Field>
                  {chosenProfile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Goals: {chosenProfile.goals.length ? chosenProfile.goals.join(", ") : "none yet (general wellness)"}
                      {chosenProfile.healthConcerns ? ` · Health notes: ${chosenProfile.healthConcerns}` : ""}
                    </p>
                  )}
                </div>
              )}

              {chosen === "new" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Name" required>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Anchit" autoComplete="name" />
                  </Field>
                  <Field label="Age" required>
                    <Input type="number" inputMode="numeric" min={13} max={100} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="e.g. 34" />
                  </Field>
                  <Field label="Gender" required>
                    <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="" disabled>
                        Choose…
                      </option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-[13px] font-semibold text-gray-700">
                      Goals <span className="text-red-600" aria-hidden>*</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {GOAL_CHOICES.map((g) => {
                        const on = form.goals.includes(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleGoal(g)}
                            className={clsx(
                              "min-h-[40px] rounded-full px-3.5 text-sm font-medium transition",
                              on ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                            )}
                          >
                            {on && <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden />}
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Health notes" helper="Optional. Conditions, injuries or anything the plan should respect.">
                      <Textarea rows={2} value={form.healthConcerns} onChange={(e) => setForm({ ...form, healthConcerns: e.target.value })} placeholder="e.g. mild knee pain" />
                    </Field>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-800">What gets created</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Two plans on your dashboard: a quick 7-day plan and a full AI plan</li>
                  <li>An AI diet plan for your goals</li>
                  <li>3–4 habits that fit your goals, with two weeks of ticks and a 21-day challenge</li>
                  <li>14 nights of sleep, and a fitness profile with an activity plan and a week of check-ins</li>
                </ul>
                <p className="mt-2">
                  The history is simulated to show the app after two weeks; edit or delete any of it. Running this again never duplicates anything.
                </p>
              </div>

              {formError && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {formError}
                </p>
              )}
              <button
                type="button"
                onClick={start}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 sm:w-auto"
              >
                <Wand2 className="h-4 w-4" aria-hidden />
                Set up my first week
              </button>
            </section>
          )}

          {phase !== "ready" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
              <h2 className="text-base font-semibold text-gray-900">{phase === "running" ? "Setting things up…" : failed ? "Done, with a few gaps" : "All set"}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {phase === "running" ? "The AI steps can take a minute or two. You can keep this tab open." : "Open any item to see it."}
              </p>
              <ol className="mt-4 divide-y divide-gray-100">
                {STEPS.map((s) => {
                  const r = steps[s.id];
                  return (
                    <li key={s.id} className="flex items-start gap-3 py-3">
                      <span className="mt-0.5 shrink-0">
                        {r.state === "done" ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <Check className="h-3 w-3" aria-hidden />
                          </span>
                        ) : r.state === "running" ? (
                          <LoaderCircle className="h-5 w-5 animate-spin text-indigo-600" aria-hidden />
                        ) : r.state === "failed" ? (
                          <TriangleAlert className="h-5 w-5 text-amber-500" aria-hidden />
                        ) : r.state === "skipped" ? (
                          <MinusCircle className="h-5 w-5 text-gray-300" aria-hidden />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900">{s.label}</span>
                        {r.detail && <span className={clsx("block text-sm", r.state === "failed" ? "text-amber-700" : "text-gray-500")}>{r.detail}</span>}
                      </span>
                      {r.href && r.state === "done" && (
                        <Link href={r.href} className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50">
                          Open
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
              {phase === "finished" && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/lifeengine/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Open my dashboard
                  </Link>
                  <Link
                    href="/lifeengine/habits"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Today&apos;s habits
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
