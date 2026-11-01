"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PlanForm, PlanFormData, defaultPlanFormData, validatePlanFormData } from "@/components/lifeengine/PlanForm";
import { generatePlan, formatErrorMessage } from "@/lib/lifeengine/api";
import { PLAN_TYPE_OPTIONS, DURATION_OPTIONS, getDietLabel } from "@/lib/lifeengine/planConfig";
import { GenerationProgress } from "@/components/lifeengine/GenerationProgress";
import { useAppVersion } from "@/components/providers/AppVersionProvider";
import Link from "next/link";
import { Cpu, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

const GENDER_MAP: Record<string, "M" | "F" | "Other"> = {
  male: "M",
  female: "F",
  other: "Other",
};

const SLOT_PRESETS: Record<
  string,
  {
    start: string;
    end: string;
  }
> = {
  morning: { start: "06:00", end: "07:00" },
  late_morning: { start: "10:00", end: "11:00" },
  afternoon: { start: "13:00", end: "14:00" },
  evening: { start: "18:00", end: "19:00" },
  night: { start: "21:00", end: "22:00" },
  flexible: { start: "09:00", end: "10:00" },
};

interface Profile {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  goals: string[];
  healthConcerns: string;
  experience: "beginner" | "intermediate" | "advanced";
  preferredTime: "morning" | "evening" | "flexible";
  subscriptionType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function CreatePlan() {
  const router = useRouter();
  const { version: appVersion } = useAppVersion();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [formData, setFormData] = useState<PlanFormData>(defaultPlanFormData);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Preparing your plan...");
  const [error, setError] = useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generatedPlanId, setGeneratedPlanId] = useState<string>("");

  // Fetch profiles on mount
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const response = await fetch("/api/lifeengine/profiles");
        if (response.ok) {
          const data = await response.json();
          setProfiles(data.profiles || []);
        }
      } catch (err) {
        console.error("Failed to fetch profiles:", err);
      } finally {
        setLoadingProfiles(false);
      }
    }
    fetchProfiles();
  }, []);

  // Update form when profile is selected
  useEffect(() => {
    if (selectedProfileId && selectedProfileId !== "new") {
      const profile = profiles.find(p => p.id === selectedProfileId);
      if (profile) {
        // Use functional setState to avoid formData in dependencies (prevents infinite loop)
        setFormData(prevData => ({
          ...prevData,
          fullName: profile.name,
          age: profile.age,
          gender: profile.gender,
          goals: profile.goals || [],
          preferredTime: profile.preferredTime || "flexible",
          // Map experience to intensity
          intensity: profile.experience === "beginner" ? "low" : 
                     profile.experience === "advanced" ? "high" : "medium",
        }));
      }
    }
  }, [selectedProfileId, profiles]); // Safe - no formData dependency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormErrors({});
    setGeneratedPlanId("");
    
    // Validate form
    const validation = validatePlanFormData(formData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    
    setLoading(true);
    setLoadingMessage("🔮 Analyzing your profile and preferences...");

    try {
      // Use selected profile ID or create inline profile
      const profileId = selectedProfileId && selectedProfileId !== "new" 
        ? selectedProfileId 
        : `inline_${Date.now()}`;
        
      const normalizedGender = GENDER_MAP[formData.gender] ?? "Other";
      
      // Parse duration from the new format (e.g., "1_week", "2_weeks", "3_months")
      let durationValue: number;
      let durationUnit: "days" | "weeks" | "months";
      
      if (formData.duration.includes("week")) {
        durationValue = parseInt(formData.duration.match(/\d+/)?.[0] || "1", 10);
        durationUnit = "weeks";
      } else if (formData.duration.includes("month")) {
        durationValue = parseInt(formData.duration.match(/\d+/)?.[0] || "1", 10);
        durationUnit = "months";
      } else {
        // Fallback to days
        durationValue = parseInt(formData.duration.match(/\d+/)?.[0] || "7", 10);
        durationUnit = "days";
      }
      
      const preferredSlot = SLOT_PRESETS[formData.preferredTime] ?? SLOT_PRESETS.flexible;
      const daysPerWeek =
        formData.activityLevel === "intense" ? 6 : formData.activityLevel === "sedentary" ? 4 : 5;

      // Convert PlanFormData to API format
      const payload = {
        profileId,
        appVersion,
        profileSnapshot: {
          id: profileId,
          name: formData.fullName,
          age: formData.age,
          gender: normalizedGender,
          height_cm: 170,
          weight_kg: 70,
          region: "Global",
          activity_level: formData.activityLevel,
          dietary: {
            type: formData.dietType,
            allergies: [],
            avoid_items: [],
            cuisine_pref: []
          },
          medical_flags: formData.chronicConditions,
          preferences: {
            tone: "balanced",
            indoor_only: false,
            notes: `Work: ${formData.workSchedule}, Preferred Time: ${formData.preferredTime}, Sleep: ${formData.sleepHours}h, Stress: ${formData.stressLevel}`
          },
          availability: {
            days_per_week: daysPerWeek,
            preferred_slots: [preferredSlot]
          }
        },
        plan_type: {
          primary: formData.planTypes[0] || "combined",
          secondary: formData.planTypes.slice(1)
        },
        goals: formData.goals.map((goal, index) => ({
          name: goal,
          priority: index + 1
        })),
        conditions: formData.chronicConditions,
        duration: {
          unit: durationUnit,
          value: durationValue
        },
        time_budget_min_per_day: formData.intensity === "low" ? 30 : formData.intensity === "high" ? 60 : 45,
        experience_level: formData.intensity === "low" ? "beginner" : formData.intensity === "high" ? "advanced" : "intermediate",
        equipment: []
      };
      
      console.log('🔍 [CreatePlan] Generating with profile:', {
        profileId,
        name: formData.fullName,
        age: formData.age,
        planTypes: formData.planTypes,
        duration: formData.duration,
        goals: formData.goals
      });
      
      // Update loading messages
      const timer1 = setTimeout(() => {
        setLoadingMessage("✨ AI is crafting your personalized wellness plan...");
      }, 5000);

      const timer2 = setTimeout(() => {
        setLoadingMessage("🎯 Adding step-by-step instructions...");
      }, 15000);

      const timer3 = setTimeout(() => {
        setLoadingMessage("📝 Finalizing your plan details...");
      }, 30000);
      
      const result = await generatePlan(payload);
      if (typeof window !== 'undefined' && result?.plan) {
        try {
          const cachedPayload = {
            plan: result.plan,
            warnings: result.warnings || [],
            analytics: result.analytics || null,
            planName: `Plan for ${formData.fullName}`,
          };
          window.sessionStorage.setItem(
            `th_plan_cache_${result.planId}`,
            JSON.stringify(cachedPayload)
          );
        } catch (error) {
          console.warn('Failed to cache plan locally:', error);
        }
      }
      
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      
      console.log('✅ [CreatePlan] Plan generated successfully:', result.planId);
      
      setGeneratedPlanId(result.planId);
      
      // Success message and redirect
      setTimeout(() => {
        router.push(`/lifeengine/plan/${result.planId}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ [CreatePlan] Generation failed:', err);
      
      const errorMessage = formatErrorMessage(err);
      const timeoutHint = errorMessage.toLowerCase().includes('timeout')
        ? ' Try one of the new 1, 3, or 5 day plans or reduce the duration before retrying.'
        : '';
      setError(`Plan generation failed: ${errorMessage}.${timeoutHint} Please try again or contact support if the issue persists.`);
      
      // Log detailed error for debugging
      console.error('Detailed error:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
    } finally {
      setLoading(false);
      setLoadingMessage("Preparing your plan...");
    }
  };

  return (
    <main>
      <div className="mx-auto max-w-[1800px]">
        <PageHeader
          eyebrow="New plan"
          title="Create a wellness plan"
          description="Pick a profile, choose the plan types and duration, and get a day-by-day plan in under a minute."
          actions={
            <Link
              href="/lifeengine/settings"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              title="Change the plan engine in Settings"
            >
              {appVersion === "oss" ? <Cpu className="h-3.5 w-3.5 text-gray-500" aria-hidden /> : <Sparkles className="h-3.5 w-3.5 text-indigo-600" aria-hidden />}
              Engine: {appVersion === "oss" ? "Built-in rules" : "Gemini AI"}
            </Link>
          }
        />

        {/* Loading State with Real Progress - Full Width with Animation */}
        {loading && (
          <div className="mb-10 animate-fade-in">
            <GenerationProgress onComplete={() => {
              console.log('Progress complete - generation should be finishing soon');
            }} />
          </div>
        )}

        {/* Error Messages - Enhanced Design */}
        {Object.keys(formErrors).length > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400 rounded-2xl p-6 shadow-2xl mb-8 animate-shake">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-red-500 flex items-center justify-center shadow-lg">
                <span className="text-3xl">⚠️</span>
              </div>
              <div className="flex-1">
                <p className="font-black text-red-900 text-xl mb-3">
                  Please Fix the Following Errors
                </p>
                <ul className="space-y-2">
                  {Object.entries(formErrors).map(([field, error]) => (
                    <li key={field} className="flex items-start gap-3 bg-white/70 rounded-lg p-3 shadow-sm">
                      <span className="text-red-600 font-bold text-lg flex-shrink-0">•</span>
                      <span className="font-semibold text-red-800">{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* API Error - Enhanced Design */}
        {error && !loading && (
          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400 rounded-2xl p-6 shadow-2xl mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-red-500 flex items-center justify-center shadow-lg">
                <span className="text-3xl">❌</span>
              </div>
              <div className="flex-1">
                <p className="font-black text-red-900 text-xl mb-2">Generation Failed</p>
                <p className="text-red-800 font-medium leading-relaxed bg-white/70 rounded-lg p-4">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message - Enhanced Design */}
        {generatedPlanId && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-400 rounded-2xl p-6 shadow-2xl mb-8 animate-bounce-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg animate-pulse">
                <span className="text-3xl">✅</span>
              </div>
              <div className="flex-1">
                <p className="font-black text-green-900 text-xl mb-2">
                  🎉 Plan Generated Successfully!
                </p>
                <p className="text-green-800 font-medium">
                  Your personalized wellness plan is ready. Redirecting you now...
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Two Column Layout: Form (Left) + Summary (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Form Fields (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Selector - Enhanced Card Design */}
              <div className="bg-gradient-to-br from-white to-blue-50/30 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border-2 border-blue-200/50 hover:shadow-3xl transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-3xl">👤</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">Select Profile</h2>
                    <p className="text-sm text-gray-600 font-medium">Choose existing or create new</p>
                  </div>
                  {selectedProfileId && selectedProfileId !== "new" && (
                    <div className="px-4 py-2 bg-green-100 border border-green-300 rounded-xl">
                      <span className="text-sm font-bold text-green-700">✓ Loaded</span>
                    </div>
                  )}
                </div>
                
                {loadingProfiles ? (
                  <div className="flex items-center gap-3 text-gray-600 bg-blue-50 rounded-xl p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-3 border-b-blue-600 border-t-transparent border-l-transparent border-r-transparent"></div>
                    <span className="font-medium">Loading profiles...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <select
                      id="profile-select"
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all text-base font-medium bg-white shadow-sm hover:border-blue-400"
                      aria-label="Select a profile"
                    >
                      <option value="">-- Select a Profile --</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name} (Age: {profile.age}, {profile.gender})
                        </option>
                      ))}
                      <option value="new">➕ Create New Profile</option>
                    </select>
                    
                    {selectedProfileId && selectedProfileId !== "new" && (
                      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                        <p className="text-sm text-blue-800 font-semibold flex items-center gap-2">
                          <span className="text-xl">✅</span>
                          Profile loaded successfully. Modify details below if needed.
                        </p>
                      </div>
                    )}
                    
                    {selectedProfileId === "new" && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                        <p className="text-sm text-green-800 font-semibold flex items-center gap-2">
                          <span className="text-xl">✨</span>
                          Creating new profile. Fill in all the details below.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Unified Plan Form */}
              <PlanForm formData={formData} setFormData={setFormData} errors={formErrors} />
            </div>

            {/* Right Column: Plan Summary (1/3 width, sticky) - Enhanced Design */}
            {formData.planTypes.length > 0 && formData.fullName && (
              <div className="lg:col-span-1">
                <div className="sticky top-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <span className="text-2xl">📊</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Plan Summary</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Name</p>
                      <p className="text-base font-bold text-gray-900">{formData.fullName}</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Age & Gender</p>
                      <p className="text-base font-bold text-gray-900">{formData.age}y, {formData.gender}</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Plan Types</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formData.planTypes.map(pt => 
                          PLAN_TYPE_OPTIONS.find(opt => opt.value === pt)?.label || pt
                        ).join(", ")}
                      </p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Duration</p>
                      <p className="text-base font-bold text-gray-900">
                        {DURATION_OPTIONS.find(opt => opt.value === formData.duration)?.label}
                      </p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Diet</p>
                      <p className="text-sm font-bold text-gray-900">
                        {getDietLabel(formData.dietType)}
                      </p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Activity</p>
                      <p className="text-base font-bold text-gray-900 capitalize">{formData.activityLevel}</p>
                    </div>
                    {formData.goals.length > 0 && (
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Goals</p>
                        <p className="text-sm font-bold text-gray-900">{formData.goals.join(", ")}</p>
                      </div>
                    )}
                    {formData.chronicConditions.length > 0 && (
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Health Conditions</p>
                        <p className="text-sm font-bold text-gray-900">{formData.chronicConditions.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Enhanced Design with Better Styling */}
          <div className="flex flex-wrap gap-4 justify-center items-center pt-8 pb-10 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-transparent rounded-2xl px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={loading}
              className="px-8 py-4 text-base font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200"
            >
              ← Back
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.fullName || formData.planTypes.length === 0}
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-black px-12 py-4 text-lg rounded-2xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-3xl"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating Your Plan...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>✨</span>
                  <span>Generate My Perfect Plan</span>
                  <span>🚀</span>
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFormData(defaultPlanFormData)}
              disabled={loading}
              className="px-8 py-4 text-base font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200"
            >
              🔄 Reset Form
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
