"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ArrowLeft, Bot, Check, CircleAlert, Copy, Download, ExternalLink, FileJson, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/lifeengine/PlanConfigurator";
import { GenerationProgress } from "@/components/lifeengine/GenerationProgress";
import PlanPreview from "@/app/components/PlanPreview";
import { CustomGPTForm } from "@/components/lifeengine/CustomGPTForm";
import type { Profile } from "@/lib/ai/schemas";
import type { LifeEnginePlan } from "@/app/types/lifeengine";
import {
  defaultPlanFormState,
  describePlanBrief,
} from "@/lib/lifeengine/planConfig";
import { requestPlanFromCustomGPT, fallbackToRuleEngine } from "@/lib/lifeengine/customGptService";
import { savePlanRecord } from "@/lib/lifeengine/storage";
import { formatErrorMessage } from "@/lib/lifeengine/api";

const GPT_URL =
  process.env.NEXT_PUBLIC_LIFEENGINE_GPT_URL ||
  "https://chatgpt.com/g/g-690630c1dfe48191b63fc09f8f024ccb-th-lifeengine-companion?ref=mini";

export default function UseCustomGPTPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [form, setForm] = useState(defaultPlanFormState);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LifeEnginePlan | null>(null);
  const [rawPlan, setRawPlan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await fetch("/api/lifeengine/profiles");
        const data = await response.json();
        setProfiles(data.profiles || []);
      } catch (err) {
        console.error("Failed to load profiles", err);
        setError("Failed to load profiles. Please refresh the page.");
        setTimeout(() => setError(null), 5000);
      }
    };
    loadProfiles();
  }, []);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const planBrief = describePlanBrief(selectedProfileId || "unknown", form);

  const openGPT = async () => {
    try {
      await navigator.clipboard.writeText(planBrief);
      setSuccessMessage("Brief copied. Paste it into the GPT that just opened.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.warn("Failed to copy prompt", err);
      setError("Could not copy the brief. Select the text below and copy it.");
      setTimeout(() => setError(null), 3000);
    }
    window.open(GPT_URL, "_blank", "noopener,noreferrer");
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProfileId) {
      setError("Please select a profile before generating a plan.");
      setTimeout(() => setError(null), 4000);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowJson(false);

    try {
      const result = await requestPlanFromCustomGPT({
        form,
        profileId: selectedProfileId,
        profile: selectedProfile,
        model: process.env.NEXT_PUBLIC_LIFEENGINE_GPT_ID,
      });

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
      setSuccessMessage("Plan generated.");
      setTimeout(() => setSuccessMessage(null), 5000);

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
        setSuccessMessage(
          `Custom GPT failed, so a plan from the built-in rules was created instead. Opening it now.`
        );
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
    setSuccessMessage("JSON downloaded.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const downloadPdf = async () => {
    if (!planRef.current || !plan) return;
    try {
      setSuccessMessage("Creating the PDF. This takes a few seconds.");
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
      setSuccessMessage("PDF downloaded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("PDF generation failed", err);
      setError("Failed to generate PDF. Please try again.");
      setTimeout(() => setError(null), 4000);
    }
  };

  const copyPromptToBrief = async () => {
    try {
      await navigator.clipboard.writeText(planBrief);
      setSuccessMessage("Brief copied.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Could not copy the brief. Select the text below and copy it.");
      setTimeout(() => setError(null), 3000);
    }
  };


  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="New plan"
        title="AI plan generator"
        description="Generate a personalised wellness plan with the LifeEngine Custom GPT."
        actions={
          <Link
            href="/lifeengine/dashboard"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Dashboard
          </Link>
        }
      />

      {successMessage && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">{successMessage}</p>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 break-words">{error}</p>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-6">
        <CustomGPTForm
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onProfileChange={setSelectedProfileId}
          form={form}
          setForm={setForm}
        />

        <SectionCard
          id="step-generate"
          step={4}
          title="Generate"
          description="Generate the plan here, or open the GPT in ChatGPT with the brief copied for you."
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="submit" disabled={loading || !selectedProfileId}>
              <WandSparkles aria-hidden />
              {loading ? "Generating..." : "Generate with Custom GPT"}
            </Button>
            <Button type="button" variant="ghost" onClick={openGPT}>
              <ExternalLink aria-hidden />
              Open GPT in ChatGPT
            </Button>
            {!selectedProfileId && <p className="text-xs text-gray-500 sm:ml-2">Choose a profile in step 1 first.</p>}
          </div>
        </SectionCard>
      </form>

      {loading && <GenerationProgress title="Generating with Custom GPT" estimatedSeconds={90} />}

      <section aria-labelledby="brief-title" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="brief-title" className="text-base font-semibold text-gray-900">
              Brief for the GPT
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">Used to generate your plan, and copied when you open the GPT.</p>
          </div>
          <Button variant="ghost" type="button" onClick={copyPromptToBrief}>
            <Copy aria-hidden />
            Copy brief
          </Button>
        </div>
        <textarea
          readOnly
          aria-label="Brief for the GPT"
          className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          rows={7}
          value={planBrief}
        />
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
            <pre className="max-h-[500px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
              {rawPlan}
            </pre>
          )}
        </section>
      ) : (
        !loading && (
          <EmptyState
            icon={Bot}
            title="No plan yet"
            description="Choose a profile, set up the plan above and select Generate with Custom GPT."
          />
        )
      )}
    </div>
  );
}
