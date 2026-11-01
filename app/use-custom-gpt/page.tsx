"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/Button";
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
import { buildPromptFromForm, type PromptBuilderInput } from "@/lib/lifeengine/promptBuilder";

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
  const [showJson, setShowJson] = useState(false);
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
      }
    };
    loadProfiles();
  }, []);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const planBrief = describePlanBrief(selectedProfileId || "unknown", form);

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

  const openGPT = async () => {
    try {
      await navigator.clipboard.writeText(planBrief);
    } catch (err) {
      console.warn("Failed to copy prompt", err);
    }
    window.open(GPT_URL, "_blank", "noopener,noreferrer");
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProfileId) {
      setError("Please select a profile before generating a plan.");
      return;
    }
    setLoading(true);
    setError(null);
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
          console.log(`✅ [CustomGPT] Plan saved to backend with ID: ${postData.plan_id}`);
        } else {
          console.warn(`⚠️ [CustomGPT] Failed to save plan to backend:`, await postResponse.text());
        }
      } catch (backendError) {
        console.warn(`⚠️ [CustomGPT] Could not save to backend:`, backendError);
      }
    } catch (err: any) {
      const message = formatErrorMessage(err);
      setError(message);
      try {
        const fallbackPlanId = await fallbackToRuleEngine(form, selectedProfileId);
        alert(
          `Custom GPT failed (${message}). A rule-based plan was generated instead. Redirecting you now.`
        );
        window.location.href = `/lifeengine/plan/${fallbackPlanId}`;
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
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div>
      <div className="max-w-5xl mx-auto space-y-8">
        <PageHeader
          eyebrow="New plan"
          title="Create with Custom GPT"
          description="Fill in a profile here, then generate the plan with the TH+ LifeEngine Companion GPT in ChatGPT."
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm text-red-800">
            {error}
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
          <div className="flex flex-wrap gap-4">
            <Button type="submit" disabled={loading || !selectedProfileId}>
              {loading ? "Generating..." : editMode ? "Generate with Custom Prompt" : "Generate with Custom GPT"}
            </Button>
            <Button type="button" variant="ghost" onClick={openGPT}>
              Open GPT in Chat
            </Button>
          </div>
        </form>

        {/* Editable Prompt Section */}
        {selectedProfileId && systemPrompt && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔧</span>
                <h3 className="text-lg font-semibold text-indigo-900">
                  Advanced: System Prompt Editor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                {showPromptEditor ? "▼ Hide" : "▶ Show"} Prompt
              </button>
            </div>

            {showPromptEditor && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    ✏️ <strong>Edit the system prompt</strong> below to customize the AI's instructions before generating your plan.
                    This gives you full control over how the AI interprets your requirements.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editMode}
                      onChange={(e) => {
                        setEditMode(e.target.checked);
                        if (!e.target.checked) {
                          setEditedPrompt(systemPrompt);
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-blue-900">
                      Enable Prompt Editing Mode
                    </span>
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      System Prompt:
                    </label>
                    {editMode && editedPrompt !== systemPrompt && (
                      <button
                        type="button"
                        onClick={() => setEditedPrompt(systemPrompt)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        🔄 Reset to Default
                      </button>
                    )}
                  </div>
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    disabled={!editMode}
                    className={`w-full h-64 p-4 border rounded-xl font-mono text-sm transition-all ${
                      editMode
                        ? "bg-white border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        : "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                    }`}
                    placeholder="System prompt will appear here..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editMode
                      ? "✅ Editing enabled - Your changes will be used for generation"
                      : "🔒 Read-only mode - Enable editing above to customize"}
                  </p>
                </div>

                <div>
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-indigo-600 flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform">▶</span>
                      Expected JSON Response Format
                    </summary>
                    <pre className="mt-3 bg-gray-900 text-green-300 p-4 rounded-xl text-xs overflow-auto max-h-64 border border-gray-700">
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
              </div>
            )}
          </div>
        )}

        <PlanBrief block={planBrief} copyBrief={() => navigator.clipboard.writeText(planBrief)} />

        {plan && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">📖</span> Custom GPT Plan
              </h2>
              <div className="flex flex-wrap gap-3">
                <Button variant="ghost" type="button" onClick={() => setShowJson(!showJson)}>
                  {showJson ? "Hide JSON" : "View Full JSON"}
                </Button>
                <Button variant="ghost" type="button" onClick={downloadJson}>
                  Download JSON
                </Button>
                <Button type="button" onClick={downloadPdf}>
                  Download PDF
                </Button>
              </div>
            </div>

            <div ref={planRef}>
              <PlanPreview plan={plan} />
            </div>

            {showJson && (
              <pre className="bg-gray-900 text-green-200 text-xs rounded-xl p-4 overflow-auto max-h-96">
                {rawPlan}
              </pre>
            )}
          </div>
        )}

        {!plan && !error && !loading && (
          <div className="bg-gray-50 rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No plan yet
            </h3>
            <p className="text-gray-600">
              Configure your profile and click “Generate with Custom GPT” to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type PlanBriefProps = {
  block: string;
  copyBrief: () => Promise<void> | void;
};

function PlanBrief({ block, copyBrief }: PlanBriefProps) {
  return (
    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 justify-between">
        <div className="font-semibold text-purple-800 flex items-center gap-2">
          <span className="text-xl">📝</span> GPT Prompt Snapshot
        </div>
        <button
          onClick={copyBrief}
          className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
        >
          Copy Brief
        </button>
      </div>
      <textarea
        readOnly
        aria-label="GPT Prompt Brief"
        title="GPT Prompt Brief"
        className="w-full border border-purple-200 rounded-lg bg-white/80 text-sm p-3 text-gray-700"
        rows={6}
        value={block}
      />
      <p className="text-xs text-purple-600">
        The brief is automatically copied when you open the Custom GPT tab.
      </p>
    </div>
  );
}
