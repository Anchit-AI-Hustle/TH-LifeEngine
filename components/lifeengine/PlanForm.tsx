"use client";

import { useState, type ReactNode } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ChoiceGroup,
  PlanBasicsFields,
  PreferenceFields,
  SectionCard,
} from "@/components/lifeengine/PlanConfigurator";
import {
  INTENSITY_OPTIONS,
  DIET_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  PlanFormState,
  defaultPlanFormState,
  DEFAULT_PLAN_DURATION_VALUE,
} from "@/lib/lifeengine/planConfig";

export type PlanFormData = PlanFormState & {
  fullName: string;
  age: number;
  gender: string;
  workSchedule: string;
  preferredTime: string;
};

export const defaultPlanFormData: PlanFormData = {
  fullName: "",
  age: 30,
  gender: "other",
  workSchedule: "9_to_5",
  preferredTime: "morning",
  ...defaultPlanFormState,
  planTypes: [],
  duration: DEFAULT_PLAN_DURATION_VALUE,
  intensity: INTENSITY_OPTIONS[1].value,
  focusAreas: [],
  goals: [],
  chronicConditions: [],
  dietType: DIET_OPTIONS[0],
  activityLevel: ACTIVITY_LEVEL_OPTIONS[2],
  sleepHours: "7",
  stressLevel: "medium",
};

/** Ids of the controls each validation error belongs to (for "fix this" links). */
export const PLAN_FORM_FIELD_IDS: Record<string, string> = {
  fullName: "pf-fullName",
  age: "pf-age",
  gender: "pf-gender",
  planTypes: "plan-types",
};

/** Which of the steps rendered by PlanForm are complete. */
export function planFormProgress(formData: PlanFormData) {
  return {
    profile: !!formData.fullName && formData.fullName.trim().length >= 2 && formData.age >= 1 && !!formData.gender,
    plan: formData.planTypes.length > 0 && !!formData.duration,
  };
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other", hint: "Or prefer not to say" },
];

type Props = {
  formData: PlanFormData;
  setFormData: React.Dispatch<React.SetStateAction<PlanFormData>>;
  errors?: Record<string, string>;
  /** Rendered at the top of the profile step (e.g. a saved-profile picker). */
  profileSlot?: ReactNode;
  profileDescription?: string;
};

export function PlanForm({ formData, setFormData, errors = {}, profileSlot, profileDescription }: Props) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const allErrors = { ...localErrors, ...errors };
  // A field fixed after a failed submit should drop its message straight away.
  for (const key of Object.keys(errors)) {
    if (!(key in localErrors) && planFieldPasses(key, formData)) delete allErrors[key];
  }

  const validateField = (field: string, value: any) => {
    const newErrors = { ...localErrors };

    switch (field) {
      case "fullName":
        if (!value || value.trim().length < 2) {
          newErrors.fullName = "Name must be at least 2 characters";
        } else {
          delete newErrors.fullName;
        }
        break;
      case "age":
        if (value < 1) {
          newErrors.age = "Age must be at least 1";
        } else {
          delete newErrors.age;
        }
        break;
      case "planTypes":
        if (!value || value.length === 0) {
          newErrors.planTypes = "Please select at least one plan type";
        } else {
          delete newErrors.planTypes;
        }
        break;
    }

    setLocalErrors(newErrors);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const progress = planFormProgress(formData);

  return (
    <div className="space-y-6">
      <SectionCard
        id="step-profile"
        step={1}
        title="Profile"
        description={profileDescription ?? "Who the plan is for. This shapes the pace, food and timings."}
        status={progress.profile ? "complete" : "todo"}
      >
        {profileSlot}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field label="Full name" required error={allErrors.fullName}>
            <Input
              id={PLAN_FORM_FIELD_IDS.fullName}
              type="text"
              autoComplete="name"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              onBlur={() => validateField("fullName", formData.fullName)}
              error={!!allErrors.fullName}
              placeholder="For example, Priya Sharma"
            />
          </Field>
          <Field label="Age" required error={allErrors.age}>
            <Input
              id={PLAN_FORM_FIELD_IDS.age}
              type="number"
              inputMode="numeric"
              min={1}
              value={formData.age}
              onChange={(e) => updateField("age", parseInt(e.target.value) || 0)}
              onBlur={() => validateField("age", formData.age)}
              error={!!allErrors.age}
              placeholder="30"
            />
          </Field>
        </div>

        <ChoiceGroup
          id={PLAN_FORM_FIELD_IDS.gender}
          legend="Gender"
          required
          options={GENDER_OPTIONS}
          value={formData.gender}
          onChange={(v) => updateField("gender", v)}
          columns="grid-cols-3"
          error={allErrors.gender}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Work schedule">
            <Select value={formData.workSchedule} onChange={(e) => updateField("workSchedule", e.target.value)}>
              <option value="9_to_5">9 am to 5 pm (standard)</option>
              <option value="flexible">Flexible hours</option>
              <option value="night_shift">Night shift</option>
              <option value="rotating">Rotating shifts</option>
              <option value="part_time">Part time</option>
              <option value="student">Student</option>
            </Select>
          </Field>
          <Field label="Best time for wellness" helper="When sessions are scheduled each day.">
            <Select value={formData.preferredTime} onChange={(e) => updateField("preferredTime", e.target.value)}>
              <option value="morning">Morning (6 to 9 am)</option>
              <option value="late_morning">Late morning (9 am to 12 pm)</option>
              <option value="afternoon">Afternoon (12 to 3 pm)</option>
              <option value="evening">Evening (6 to 9 pm)</option>
              <option value="night">Night (after 9 pm)</option>
              <option value="flexible">Flexible</option>
            </Select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        id="step-plan"
        step={2}
        title="Plan"
        description="Choose what the plan covers, how long it runs and how hard it pushes."
        status={progress.plan ? "complete" : "todo"}
      >
        <PlanBasicsFields form={formData} update={(f, v) => updateField(f, v)} errors={allErrors} />
      </SectionCard>

      <SectionCard
        id="step-preferences"
        step={3}
        title="Preferences"
        description="Goals, lifestyle and health details make the plan more personal."
        status="optional"
      >
        <PreferenceFields form={formData} update={(f, v) => updateField(f, v)} />
      </SectionCard>
    </div>
  );
}

/** True when the value now passes the rule behind a submit-time error. */
export function planFieldPasses(field: string, formData: PlanFormData) {
  switch (field) {
    case "fullName":
      return !!formData.fullName && formData.fullName.trim().length >= 2;
    case "age":
      return formData.age >= 1;
    case "planTypes":
      return formData.planTypes.length > 0;
    case "gender":
      return !!formData.gender;
    default:
      return false;
  }
}

// Validation function
export function validatePlanFormData(formData: PlanFormData): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!formData.fullName || formData.fullName.trim().length < 2) {
    errors.fullName = "Name must be at least 2 characters";
  }

  if (formData.age < 1) {
    errors.age = "Age must be at least 1";
  }

  if (!formData.planTypes || formData.planTypes.length === 0) {
    errors.planTypes = "Please select at least one plan type";
  }

  if (!formData.gender) {
    errors.gender = "Please select a gender";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
