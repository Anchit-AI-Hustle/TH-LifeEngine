"use client";

import Link from "next/link";
import { Check, UserPlus } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { PlanConfigurator, SectionCard } from "./PlanConfigurator";
import type { PlanFormState } from "@/lib/lifeengine/planConfig";
import type { Profile } from "@/lib/ai/schemas";

const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", other: "Other" };

type Props = {
  profiles: Profile[];
  selectedProfileId: string;
  onProfileChange: (value: string) => void;
  form: PlanFormState;
  setForm: React.Dispatch<React.SetStateAction<PlanFormState>>;
  children?: React.ReactNode;
  /** Shown under the profile picker, e.g. "choose a profile first". */
  profileError?: string;
};

/** Steps 1 to 3 of the Custom GPT flows: profile, plan, preferences. */
export function CustomGPTForm({
  profiles,
  selectedProfileId,
  onProfileChange,
  form,
  setForm,
  children,
  profileError,
}: Props) {
  const selected = profiles.find((p) => p.id === selectedProfileId);
  return (
    <>
      <SectionCard
        id="step-profile"
        step={1}
        title="Profile"
        description="The plan is written for this person's age, goals and health notes."
        status={selected ? "complete" : "todo"}
      >
        {profiles.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-xl bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">No profiles yet. Add one first, then come back to choose it here.</p>
            <Link
              href="/lifeengine/profiles"
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Add a profile
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <Field label="Choose a profile" required error={profileError}>
              <Select
                id="gpt-profile-select"
                value={selectedProfileId}
                onChange={(e) => onProfileChange(e.target.value)}
                error={!!profileError}
              >
                <option value="">Select a profile</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} ({profile.age}, {GENDER_LABEL[profile.gender] ?? profile.gender})
                  </option>
                ))}
              </Select>
            </Field>
            {selected && (
              <p className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Planning for {selected.name}
              </p>
            )}
          </div>
        )}
      </SectionCard>

      <PlanConfigurator form={form} setForm={setForm} startStep={2} />

      {children}
    </>
  );
}
