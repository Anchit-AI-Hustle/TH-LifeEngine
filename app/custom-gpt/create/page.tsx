"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Copy, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { GenerationProgress } from "@/components/lifeengine/GenerationProgress";
import { PlanForm, PlanFormData, defaultPlanFormData, validatePlanFormData, PLAN_FORM_FIELD_IDS, planFieldPasses } from "@/components/lifeengine/PlanForm";
import type { CustomGPTFormData } from "@/lib/openai/promptBuilder";
import { buildCustomGPTPrompt } from "@/lib/openai/promptBuilder";

export default function CustomGPTPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<PlanFormData>(defaultPlanFormData);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Preparing your plan");
  const [error, setError] = useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const customGPTData = useMemo<CustomGPTFormData>(() => ({
    fullName: formData.fullName,
    age: formData.age,
    gender: formData.gender,
    duration: formData.duration,
    planTypes: formData.planTypes,
    goals: formData.goals,
    dietType: formData.dietType,
    activityLevel: formData.activityLevel,
    chronicConditions: formData.chronicConditions,
    sleepHours: formData.sleepHours,
    stressLevel: formData.stressLevel,
    workSchedule: formData.workSchedule,
    preferredTime: formData.preferredTime,
    intensity: formData.intensity,
    focusAreas: formData.focusAreas,
  }), [formData]);

  const promptPreview = useMemo(() => buildCustomGPTPrompt(customGPTData), [customGPTData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormErrors({});

    // Validate form
    const validation = validatePlanFormData(formData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      requestAnimationFrame(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        errorSummaryRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    setLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setLoadingMessage("Connecting to GPT-4");

    try {
      // Transform PlanFormData to CustomGPTFormData
      const customGPTData: CustomGPTFormData = {
        fullName: formData.fullName,
        age: formData.age,
        gender: formData.gender,
        duration: formData.duration,
        planTypes: formData.planTypes,
        goals: formData.goals,
        dietType: formData.dietType,
        activityLevel: formData.activityLevel,
        chronicConditions: formData.chronicConditions,
        sleepHours: formData.sleepHours,
        stressLevel: formData.stressLevel,
        workSchedule: formData.workSchedule,
        preferredTime: formData.preferredTime,
        intensity: formData.intensity,
        focusAreas: formData.focusAreas,
      };

      setLoadingMessage("Building your personalised prompt");
      await new Promise(resolve => setTimeout(resolve, 500));

      setLoadingMessage("GPT-4 is writing your plan");
      
      // Call API
      const response = await fetch("/api/openai/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: customGPTData,
          model: "gpt-4o", // Can be "gpt-4o" or "gpt-4o-mini"
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate plan");
      }

      setLoadingMessage("Plan written. Preparing your notebook");
      await new Promise(resolve => setTimeout(resolve, 500));

      // Store plan in localStorage
      const storedPlans = JSON.parse(localStorage.getItem("custom_gpt_plans") || "[]");
      storedPlans.push({
        id: data.planId,
        plan: data.plan,
        formData: customGPTData,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("custom_gpt_plans", JSON.stringify(storedPlans));

      setLoadingMessage("Opening your plan");
      
      // Redirect to plan view
      setTimeout(() => {
        router.push(`/custom-gpt/plan/${data.planId}`);
      }, 1000);

    } catch (err: any) {
      console.error("Error generating plan:", err);
      setError(err.message || "Failed to generate plan. Please try again.");
      setLoading(false);
    }
  };

  const errorEntries = Object.entries(formErrors).filter(([field]) => !planFieldPasses(field, formData));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="New plan"
        title="Create with GPT-4"
        description="Fill in the details and GPT-4 writes a day-by-day plan you can read like a notebook and download as a PDF."
      />

      {loading && (
        <div className="mx-auto max-w-3xl">
          <GenerationProgress title="Creating your plan with GPT-4" statusText={loadingMessage} estimatedSeconds={45} />
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {error && (
            <GenerationProgress
              status="error"
              error={error}
              onRetry={() => handleSubmit({ preventDefault() {} } as React.FormEvent)}
            />
          )}

          <div className="grid gap-6 lg:grid-cols-5 lg:items-start lg:gap-8">
            <form onSubmit={handleSubmit} noValidate className="min-w-0 space-y-6 lg:col-span-3">
              <PlanForm
                formData={formData}
                setFormData={setFormData}
                errors={formErrors}
                profileDescription="Who the plan is for. GPT-4 adapts the pace, food and timings to these details."
              />

              <section
                aria-labelledby="generate-title"
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold tabular-nums text-gray-700" aria-hidden>
                    4
                  </span>
                  <div className="min-w-0">
                    <h2 id="generate-title" className="text-base font-semibold text-gray-900">
                      <span className="sr-only">Step 4: </span>Generate
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">GPT-4 usually takes 30 to 60 seconds.</p>
                  </div>
                </div>

                {errorEntries.length > 0 && (
                  <div
                    ref={errorSummaryRef}
                    tabIndex={-1}
                    role="alert"
                    className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 focus:outline-none"
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                      <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
                      {errorEntries.length === 1 ? "One thing needs fixing" : `${errorEntries.length} things need fixing`}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {errorEntries.map(([field, message]) => (
                        <li key={field}>
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(PLAN_FORM_FIELD_IDS[field] ?? field);
                              el?.scrollIntoView({ behavior: "smooth", block: "center" });
                              const target = el?.matches("fieldset") ? el.querySelector<HTMLElement>("input") ?? el : el;
                              target?.focus({ preventScroll: true });
                            }}
                            className="min-h-[32px] text-left text-sm text-red-700 underline decoration-red-300 underline-offset-2 hover:decoration-red-700"
                          >
                            {message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5">
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    <WandSparkles aria-hidden />
                    Generate with GPT-4
                  </Button>
                </div>
              </section>
            </form>

            <aside
              aria-labelledby="prompt-title"
              className="min-w-0 space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-8 lg:col-span-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Prompt preview</p>
                  <h2 id="prompt-title" className="mt-1 text-base font-semibold text-gray-900">
                    What GPT-4 receives
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(promptPreview);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                    } catch (error) {
                      console.error("Failed to copy prompt:", error);
                    }
                  }}
                >
                  {copiedPrompt ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copiedPrompt ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-sm text-gray-500">It updates as you fill in the form, so you can check it before generating.</p>
              <div
                tabIndex={0}
                aria-label="Prompt preview"
                className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
              >
                {promptPreview}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
