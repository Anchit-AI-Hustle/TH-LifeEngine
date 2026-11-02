"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useEffect, useState, useRef } from "react";
import clsx from "clsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Info,
  RefreshCw,
  RotateCcw,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import PlanPreview from "@/app/components/PlanPreview";
import { CustomGPTForm } from "@/components/lifeengine/CustomGPTForm";
import { SectionCard } from "@/components/lifeengine/PlanConfigurator";
import { GenerationProgress } from "@/components/lifeengine/GenerationProgress";
import type { Profile } from "@/lib/ai/schemas";
import type { LifeEnginePlan } from "@/app/types/lifeengine";
import {
  defaultPlanFormState,
  describePlanBrief,
} from "@/lib/lifeengine/planConfig";
import { requestPlanFromCustomGPT, fallbackToRuleEngine } from "@/lib/lifeengine/customGptService";
import { savePlanRecord } from "@/lib/lifeengine/storage";
import { formatErrorMessage, getLatestPlan, isErrorStatus } from "@/lib/lifeengine/api";
import { buildPromptFromForm, type PromptBuilderInput } from "@/lib/lifeengine/promptBuilder";

const GPT_URL =
  process.env.NEXT_PUBLIC_LIFEENGINE_GPT_URL ||
  "https://chatgpt.com/g/g-690630c1dfe48191b63fc09f8f024ccb-th-lifeengine-companion?ref=mini";

const HOW_IT_WORKS = [
  { title: "Fill in the profile and plan", body: "Choose who the plan is for and what it should cover." },
  { title: "Open the GPT", body: "We copy a short brief for you. Paste it into the LifeEngine Companion in ChatGPT." },
  { title: "Refresh to bring it here", body: "Once the GPT has saved the plan, refresh below to see it." },
];

type LatestStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "none"; checkedAt: Date }
  | { state: "found"; checkedAt: Date; createdAt?: string }
  | { state: "error"; message: string };

function formatWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function UseCustomGPTPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [form, setForm] = useState(defaultPlanFormState);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LifeEnginePlan | null>(null);
  const [rawPlan, setRawPlan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [latest, setLatest] = useState<LatestStatus>({ state: "idle" });
  const [copied, setCopied] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  // Editable prompt feature
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [editedPrompt, setEditedPrompt] = useState("");

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await fetch("/api/lifeengine/profiles");
        const data = await response.json();
        setProfiles(data.profiles || []);
      } catch (err) {
        console.error("Failed to load profiles", err);
      } finally {
        setProfilesLoaded(true);
      }
    };
    loadProfiles();
  }, []);

  // A different profile has a different latest plan.
  useEffect(() => {
    setLatest({ state: "idle" });
  }, [selectedProfileId]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  // Without a profile the brief simply leaves the profile line out (never "unknown").
  const planBrief = selectedProfileId
    ? describePlanBrief(selectedProfileId, form)
    : describePlanBrief("", form)
        .split("\n")
        .filter((line) => !line.startsWith("profile_id:"))
        .join("\n");

  // Generate the full system prompt for preview/editing
  useEffect(() => {
    if (selectedProfile) {
      const promptInput: PromptBuilderInput = {
        ...form,
        profileName: selectedProfile.name,
        age: selectedProfile.age,
        gender: selectedProfile.gender,
      };
      const generatedPrompt = buildPromptFromForm(promptInput);
      setSystemPrompt(generatedPrompt);
      if (!editMode) {
        setEditedPrompt(generatedPrompt);
      }
    }
  }, [selectedProfile, form, editMode]);

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(planBrief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy prompt", err);
    }
  };

  const openGPT = async () => {
    let copiedOk = false;
    try {
      await navigator.clipboard.writeText(planBrief);
      copiedOk = true;
    } catch (err) {
      console.warn("Failed to copy prompt", err);
    }
    window.open(GPT_URL, "_blank", "noopener,noreferrer");
    setNotice(
      copiedOk
        ? "Brief copied. Paste it into the GPT, then come back and refresh to load the plan."
        : "The GPT opened in a new tab. Copy the brief below and paste it there.",
    );
  };

  const refreshLatest = async () => {
    if (!selectedProfileId) return;
    setLatest({ state: "checking" });
    try {
      const latestPlan = (await getLatestPlan(selectedProfileId)) as LifeEnginePlan;
      setPlan(latestPlan);
      setRawPlan(JSON.stringify(latestPlan, null, 2));
      setShowJson(false);
      setLatest({ state: "found", checkedAt: new Date(), createdAt: latestPlan?.metadata?.timestamp });
    } catch (err) {
      if (isErrorStatus(err, 404)) {
        setLatest({ state: "none", checkedAt: new Date() });
      } else {
        setLatest({ state: "error", message: formatErrorMessage(err) });
      }
    }
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProfileId) {
      setError("Please select a profile before generating a plan.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    setShowJson(false);

    try {
      let result: any;

      // Use edited prompt if in edit mode, otherwise use the standard flow
      if (editMode && editedPrompt.trim()) {
        const response = await fetch("/api/lifeengine/custom-gpt-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: editedPrompt,
            profileId: selectedProfileId,
            model: process.env.NEXT_PUBLIC_LIFEENGINE_GPT_ID,
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const gptResponse = await response.json();
        const planText = gptResponse.plan?.trim();

        if (!planText) {
          throw new Error("Custom GPT returned an empty response");
        }

        const parsed = JSON.parse(planText) as LifeEnginePlan;
        result = {
          plan: parsed,
          rawText: planText,
          prompt: editedPrompt,
          metadata: gptResponse.metadata,
        };
      } else {
        // Standard flow
        result = await requestPlanFromCustomGPT({
          form,
          profileId: selectedProfileId,
          profile: selectedProfile,
          model: process.env.NEXT_PUBLIC_LIFEENGINE_GPT_ID,
        });
      }

      const planId = result.metadata?.planId || `local-${crypto.randomUUID()}`;

      // Ensure metadata includes profile_id for /api/v1/plans/latest
      if (!result.plan.metadata) {
        result.plan.metadata = {} as any;
      }
      result.plan.metadata.profile_id = selectedProfileId;
      (result.plan.metadata as any).generated_by = "custom-gpt-page";
      (result.plan.metadata as any).plan_type = form.planTypes;
      result.plan.metadata.language = "English";
      (result.plan.metadata as any).timestamp = result.metadata?.generatedAt || new Date().toISOString();

      setPlan(result.plan);
      setRawPlan(JSON.stringify(result.plan, null, 2));
      setLatest({ state: "found", checkedAt: new Date(), createdAt: (result.plan.metadata as any).timestamp });

      // Save to localStorage for immediate UI access
      savePlanRecord({
        id: planId,
        profileId: selectedProfileId,
        planName: `Plan for ${selectedProfile?.name ?? "Member"}`,
        planTypes: form.planTypes,
        createdAt: result.metadata?.generatedAt ?? new Date().toISOString(),
        source: "custom-gpt",
        plan: result.plan,
        rawPrompt: result.prompt,
      });

      // Also POST to /api/v1/plans for persistence and dashboard integration
      try {
        const postResponse = await fetch('/api/v1/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.plan),
        });

        if (postResponse.ok) {
          const postData = await postResponse.json();
          console.log(`[CustomGPT] Plan saved to backend with ID: ${postData.plan_id}`);
        } else {
          console.warn(`[CustomGPT] Failed to save plan to backend:`, await postResponse.text());
        }
      } catch (backendError) {
        console.warn(`[CustomGPT] Could not save to backend:`, backendError);
      }
    } catch (err: any) {
      const message = formatErrorMessage(err);
      setError(message);
      try {
        const fallbackPlanId = await fallbackToRuleEngine(form, selectedProfileId);
        setError(null);
        setNotice(`Custom GPT failed (${message}). A plan from the built-in rules was created instead. Opening it now.`);
        setTimeout(() => {
          window.location.href = `/lifeengine/plan/${fallbackPlanId}`;
        }, 2000);
      } catch (fallbackError) {
        setError(
          `Custom GPT failed (${message}) and fallback generation also failed: ${formatErrorMessage(
            fallbackError
          )}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!rawPlan) return;
    const blob = new Blob([rawPlan], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TH_LifeEngine_CustomGPT_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!planRef.current || !plan) return;
    try {
      const canvas = await html2canvas(planRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`TH_LifeEngine_CustomGPT_${selectedProfile?.name ?? "plan"}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      setError("Could not create the PDF. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="New plan"
        title="Create with Custom GPT"
        description="Fill in a profile here, then generate the plan with the TH+ LifeEngine Companion GPT in ChatGPT."
      />

      {/* How it works */}
      <section aria-labelledby="how-title" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="how-title" className="text-base font-semibold text-gray-900">
          How it works
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold tabular-nums text-indigo-700">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 break-words">{error}</p>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">{notice}</p>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-6">
        {profilesLoaded ? (
          <CustomGPTForm
            profiles={profiles}
            selectedProfileId={selectedProfileId}
            onProfileChange={setSelectedProfileId}
            form={form}
            setForm={setForm}
          />
        ) : (
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-hidden>
            <div className="h-5 w-32 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
          </div>
        )}

        <SectionCard
          id="step-get-plan"
          step={4}
          title="Get your plan"
          description="Open the GPT in ChatGPT and refresh here when it is done, or generate it right here."
        >
          {/* Latest plan status */}
          <div
            className={clsx(
              "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
              latest.state === "found" ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 bg-gray-50",
            )}
          >
            <div role="status" aria-live="polite" className="flex min-w-0 items-start gap-3">
              <span
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  latest.state === "found" ? "bg-emerald-100 text-emerald-700" : "bg-white text-gray-500 ring-1 ring-gray-200",
                )}
                aria-hidden
              >
                {latest.state === "found" ? (
                  <Check className="h-4 w-4" />
                ) : latest.state === "error" ? (
                  <CircleAlert className="h-4 w-4 text-red-600" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {!selectedProfileId
                    ? "Choose a profile to see its latest plan"
                    : latest.state === "checking"
                      ? "Checking for the latest plan"
                      : latest.state === "found"
                        ? "Latest plan loaded"
                        : latest.state === "none"
                          ? "No plan from the GPT yet"
                          : latest.state === "error"
                            ? "Could not check for a plan"
                            : `Latest plan for ${selectedProfile?.name ?? "this profile"}`}
                </p>
                <p className="mt-0.5 break-words text-xs text-gray-500">
                  {!selectedProfileId
                    ? "Step 1 above."
                    : latest.state === "found"
                      ? latest.createdAt
                        ? `Created ${formatWhen(latest.createdAt)}. It is shown below.`
                        : "It is shown below."
                      : latest.state === "none"
                        ? `Checked at ${latest.checkedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}. Finish in ChatGPT, then refresh again.`
                        : latest.state === "error"
                          ? latest.message
                          : latest.state === "checking"
                            ? "One moment."
                            : "Not checked yet. Refresh after the GPT has saved the plan."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={refreshLatest}
              disabled={!selectedProfileId || latest.state === "checking"}
              className="shrink-0"
            >
              <RefreshCw className={clsx(latest.state === "checking" && "animate-spin")} aria-hidden />
              Refresh latest plan
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">In ChatGPT</p>
              <p className="mt-1 flex-1 text-sm text-gray-500">
                Opens the LifeEngine Companion GPT in a new tab with the brief on your clipboard.
              </p>
              <Button type="button" variant="ghost" onClick={openGPT} className="mt-4 self-start">
                <ExternalLink aria-hidden />
                Open the GPT
              </Button>
            </div>
            <div className="flex flex-col rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Here in the app</p>
              <p className="mt-1 flex-1 text-sm text-gray-500">
                {editMode
                  ? "Sends your edited prompt to the same GPT and shows the plan below."
                  : "Sends the same brief to the GPT for you and shows the plan below."}
              </p>
              <Button type="submit" disabled={loading || !selectedProfileId} className="mt-4 self-start">
                <WandSparkles aria-hidden />
                {loading ? "Generating..." : editMode ? "Generate with edited prompt" : "Generate here"}
              </Button>
              {!selectedProfileId && <p className="mt-2 text-xs text-gray-500">Choose a profile first.</p>}
            </div>
          </div>
        </SectionCard>
      </form>

      {loading && (
        <GenerationProgress title="Generating with Custom GPT" estimatedSeconds={90} />
      )}

      {/* What the GPT receives: technical detail, collapsed by default */}
      <section aria-labelledby="brief-title" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowBrief((open) => !open)}
          aria-expanded={showBrief}
          aria-controls="gpt-brief-panel"
          className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 sm:px-6"
        >
          <span className="min-w-0">
            <span id="brief-title" className="block text-base font-semibold text-gray-900">
              Show what the GPT receives
            </span>
            <span className="mt-0.5 block text-sm text-gray-500">
              Optional. The short brief we copy for you{selectedProfileId ? ", and the full instructions" : ""}.
            </span>
          </span>
          <ChevronDown className={clsx("h-5 w-5 shrink-0 text-gray-400 transition-transform", showBrief && "rotate-180")} aria-hidden />
        </button>

        {showBrief && (
          <div id="gpt-brief-panel" className="space-y-6 border-t border-gray-100 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="gpt-brief" className="text-sm font-semibold text-gray-900">
                  Brief
                </label>
                <Button type="button" variant="ghost" onClick={copyBrief}>
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? "Copied" : "Copy brief"}
                </Button>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                {selectedProfileId
                  ? "Copied for you when you open the GPT."
                  : "Copied for you when you open the GPT. Choose a profile in step 1 to add who the plan is for."}
              </p>
              <textarea
                id="gpt-brief"
                readOnly
                className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                rows={7}
                value={planBrief}
              />
            </div>

            {/* Editable prompt */}
            {selectedProfileId && systemPrompt && (
              <section className="rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  aria-expanded={showPromptEditor}
                  aria-controls="prompt-editor"
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">Advanced: edit the full instructions</span>
                    <span className="mt-0.5 block text-sm text-gray-500">
                      {editMode ? "Editing is on. Your version is used when you generate here." : "See the full instructions sent to the GPT."}
                    </span>
                  </span>
                  <ChevronDown className={clsx("h-5 w-5 shrink-0 text-gray-400 transition-transform", showPromptEditor && "rotate-180")} aria-hidden />
                </button>

                {showPromptEditor && (
                  <div id="prompt-editor" className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-4">
                    <label className="flex min-h-[40px] cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editMode}
                        onChange={(e) => {
                          setEditMode(e.target.checked);
                          if (!e.target.checked) {
                            setEditedPrompt(systemPrompt);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
                      />
                      <span className="text-sm font-medium text-gray-900">Let me edit the prompt</span>
                    </label>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label htmlFor="system-prompt" className="text-[13px] font-semibold text-gray-700">
                          Prompt
                        </label>
                        {editMode && editedPrompt !== systemPrompt && (
                          <Button type="button" variant="subtle" onClick={() => setEditedPrompt(systemPrompt)}>
                            <RotateCcw aria-hidden />
                            Reset to default
                          </Button>
                        )}
                      </div>
                      <textarea
                        id="system-prompt"
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        readOnly={!editMode}
                        aria-describedby="system-prompt-note"
                        className={clsx(
                          "h-64 w-full rounded-xl border p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-4 focus:ring-indigo-100",
                          editMode ? "border-gray-300 bg-white text-gray-900 focus:border-indigo-500" : "border-gray-200 bg-gray-50 text-gray-600",
                        )}
                      />
                      <p id="system-prompt-note" className="mt-1.5 text-xs text-gray-500">
                        {editMode ? "Your changes are used for the next plan generated here." : "Read only. Turn on editing above to change it."}
                      </p>
                    </div>

                    <details className="group rounded-xl border border-gray-200">
                      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-gray-700 hover:text-gray-900">
                        Expected JSON response format
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" aria-hidden />
                      </summary>
                      <pre className="max-h-64 overflow-auto border-t border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
      {`{
  "plan_name": "7-Day Personalized Wellness Plan",
  "weekly_schedule": {
    "monday": {
      "yoga": {
        "sequence": [
          {
            "name": "Mountain Pose",
            "sanskrit_name": "Tadasana",
            "duration_min": 2,
            "benefits": "...",
            "steps": ["Step 1...", "Step 2..."],
            "breathing_instructions": "..."
          }
        ]
      },
      "exercises": [
        {
          "name": "Push-ups",
          "category": "strength",
          "sets": 3,
          "reps": 10,
          "steps": ["Step 1...", "Step 2..."],
          "form_cues": ["Keep back straight", "..."]
        }
      ],
      "meals": {
        "breakfast": {
          "name": "Oatmeal Bowl",
          "ingredients": [...],
          "instructions": ["Step 1...", "Step 2..."],
          "nutrition": {...}
        }
      }
    }
  },
  "metadata": {
    "profile_id": "...",
    "duration_days": 7,
    "language": "English"
  }
}`}
                      </pre>
                    </details>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </section>

      {plan ? (
        <section aria-labelledby="plan-title" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="plan-title" className="text-base font-semibold text-gray-900">
              Your Custom GPT plan
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" type="button" onClick={() => setShowJson(!showJson)} aria-expanded={showJson}>
                <FileJson aria-hidden />
                {showJson ? "Hide JSON" : "View JSON"}
              </Button>
              <Button variant="ghost" type="button" onClick={downloadJson}>
                <Download aria-hidden />
                Download JSON
              </Button>
              <Button type="button" onClick={downloadPdf}>
                <Download aria-hidden />
                Download PDF
              </Button>
            </div>
          </div>

          <div ref={planRef}>
            <PlanPreview plan={plan} />
          </div>

          {showJson && (
            <pre className="max-h-96 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
              {rawPlan}
            </pre>
          )}
        </section>
      ) : (
        !loading && (
          <EmptyState
            icon={Bot}
            title="No plan yet"
            description="Open the GPT and refresh when it is done, or generate the plan here."
          />
        )
      )}
    </div>
  );
}
