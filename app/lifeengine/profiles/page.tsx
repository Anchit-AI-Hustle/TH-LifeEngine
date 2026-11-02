"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  Gauge,
  Loader2,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Sunrise,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { Profile } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Field } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { EXPERIENCE_LABEL, GENDER_LABEL, ProfileAvatar, TIME_LABEL } from "./ProfileAvatar";

const DEFAULT_PROFILE: Partial<Profile> = {
  name: "",
  age: 25,
  goals: [],
  healthConcerns: "",
  experience: "beginner",
  preferredTime: "flexible",
  subscriptionType: "quarterly",
};

/** Common goals offered as chips. Anything else can be typed in. */
const GOAL_PRESETS = [
  "Weight loss",
  "Flexibility",
  "Stress relief",
  "Strength",
  "Better sleep",
  "Endurance",
  "Posture",
  "Mobility",
  "More energy",
  "Heart health",
  "Blood sugar control",
  "Weight gain",
];

/** Show the search box once the list is longer than this. */
const SEARCH_THRESHOLD = 3;

type FormState = {
  name: string;
  age: string;
  /** Empty until the person picks one (required). */
  gender: Profile["gender"] | "";
  goals: string[];
  healthConcerns: string;
  experience: Profile["experience"];
  preferredTime: Profile["preferredTime"];
  subscriptionType: Profile["subscriptionType"];
};

type FormErrors = Partial<Record<"name" | "age" | "gender", string>>;

function toFormState(profile: Partial<Profile>): FormState {
  return {
    name: profile.name ?? "",
    age: profile.age != null ? String(profile.age) : "",
    gender: profile.gender ?? "",
    goals: [...(profile.goals ?? [])],
    healthConcerns: profile.healthConcerns ?? "",
    experience: profile.experience ?? "beginner",
    preferredTime: profile.preferredTime ?? "flexible",
    subscriptionType: profile.subscriptionType ?? "quarterly",
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Enter a name.";
  const age = Number(form.age);
  if (!form.age.trim()) errors.age = "Enter an age.";
  else if (!Number.isInteger(age) || age < 1 || age > 120) errors.age = "Enter an age between 1 and 120.";
  if (!form.gender) errors.gender = "Choose a gender.";
  return errors;
}

const sameGoal = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

interface DeleteConfirmState {
  isOpen: boolean;
  profileId: string;
  profileName: string;
  planCount: number;
}

const TIME_ICON = { morning: Sunrise, evening: Moon, flexible: Clock } as const;

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(toFormState(DEFAULT_PROFILE));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    profileId: "",
    profileName: "",
    planCount: 0,
  });

  const formRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const fetchProfiles = async () => {
    setLoadError(null);
    try {
      const response = await fetch("/api/lifeengine/profiles");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
      setLoadError("We could not load your profiles. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === editingId) ?? null,
    [profiles, editingId],
  );

  // Load the chosen profile into the form (or a blank one for "New profile").
  useEffect(() => {
    setForm(toFormState(selectedProfile ?? DEFAULT_PROFILE));
    setErrors({});
    setSubmitted(false);
    setSaveError(null);
    setCustomGoal("");
  }, [selectedProfile]);

  const openForm = (id: string | null) => {
    setEditingId(id);
    if (id === null) {
      // Re-selecting "new" while already new does not change selectedProfile; reset by hand.
      setForm(toFormState(DEFAULT_PROFILE));
      setErrors({});
      setSubmitted(false);
      setSaveError(null);
      setCustomGoal("");
    }
    setFormOpen(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameRef.current?.focus({ preventScroll: true });
    });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    requestAnimationFrame(() => newButtonRef.current?.focus());
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (submitted) setErrors(validate(next));
      return next;
    });
  };

  const toggleGoal = (goal: string) => {
    setForm((current) => {
      const has = current.goals.some((g) => sameGoal(g, goal));
      return { ...current, goals: has ? current.goals.filter((g) => !sameGoal(g, goal)) : [...current.goals, goal] };
    });
  };

  const addCustomGoal = () => {
    const goal = customGoal.trim();
    if (!goal) return;
    setForm((current) =>
      current.goals.some((g) => sameGoal(g, goal)) ? current : { ...current, goals: [...current.goals, goal] },
    );
    setCustomGoal("");
  };

  const customGoals = form.goals.filter((g) => !GOAL_PRESETS.some((p) => sameGoal(p, g)));

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    if (found.name) {
      nameRef.current?.focus();
      return;
    }
    if (found.age) {
      ageRef.current?.focus();
      return;
    }
    if (found.gender) {
      document.querySelector<HTMLInputElement>('input[name="gender"]')?.focus();
      return;
    }

    // A goal still sitting in the "add your own" box counts too.
    const pending = customGoal.trim();
    const goals = pending && !form.goals.some((g) => sameGoal(g, pending)) ? [...form.goals, pending] : form.goals;

    const payload: Profile = {
      id: editingId || `profile_${Date.now()}`,
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender as Profile["gender"],
      goals: goals.map((g) => g.trim()).filter(Boolean),
      healthConcerns: form.healthConcerns,
      experience: form.experience,
      preferredTime: form.preferredTime,
      // Not asked in the form any more; existing profiles keep theirs, new ones get the default.
      subscriptionType: form.subscriptionType,
    };

    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/lifeengine/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchProfiles();
        const wasEditing = Boolean(editingId);
        setEditingId(null);
        setFormOpen(false);
        setForm(toFormState(DEFAULT_PROFILE));
        setFeedback({
          type: "success",
          message: wasEditing ? `Saved changes to ${payload.name}.` : `${payload.name} was added.`,
        });
        requestAnimationFrame(() => listHeadingRef.current?.focus());
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSaveError(`The profile was not saved: ${errorData.error || "unknown error"}.`);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      setSaveError("The profile was not saved because the network request failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    // Fetch plan count for this profile
    try {
      const plansResponse = await fetch(`/api/lifeengine/listPlans?profileId=${encodeURIComponent(id)}`);
      if (!plansResponse.ok) throw new Error(`HTTP ${plansResponse.status}`);
      const plansData = await plansResponse.json();
      const planCount = plansData.plans?.filter((plan: any) => plan.profileId === id).length || 0;

      setDeleteConfirm({ isOpen: true, profileId: id, profileName: name, planCount });
    } catch (error) {
      console.error("Failed to fetch plan count:", error);
      // Still show dialog even if we couldn't get plan count
      setDeleteConfirm({ isOpen: true, profileId: id, profileName: name, planCount: 0 });
    }
  };

  const confirmDelete = async () => {
    const { profileId, profileName } = deleteConfirm;

    try {
      const response = await fetch(`/api/lifeengine/profiles?id=${profileId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchProfiles();
        if (editingId === profileId) {
          setEditingId(null);
          setFormOpen(false);
          setForm(toFormState(DEFAULT_PROFILE));
        }
        setFeedback({ type: "success", message: `${profileName} and their plans were deleted.` });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setFeedback({ type: "error", message: errorData.error || "The profile could not be deleted." });
      }
    } catch (error) {
      console.error("Failed to delete profile:", error);
      setFeedback({ type: "error", message: "Network error while deleting the profile. Try again." });
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.name, ...(p.goals ?? []), p.healthConcerns ?? "", p.experience, p.preferredTime]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [profiles, query]);

  const showSearch = profiles.length > SEARCH_THRESHOLD;

  return (
    <div>
      <PageHeader
        title="Profiles"
        description="Everyone you plan for. Goals, health notes and schedule here shape every plan you create."
        actions={
          <Button ref={newButtonRef} type="button" onClick={() => openForm(null)}>
            <Plus aria-hidden />
            New profile
          </Button>
        }
      />

      <div aria-live="polite" role="status">
        {feedback && (
          <div
            className={clsx(
              "mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {feedback.type === "success" ? (
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <p className="min-w-0 flex-1">{feedback.message}</p>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss message"
              className="-my-2 -mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div className={clsx("grid gap-6", formOpen && "lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start")}>
        {/* List */}
        <section aria-labelledby="profiles-list-heading" className="min-w-0">
          <div
            className={clsx(
              "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
              !loading && !loadError && profiles.length === 0 && "sr-only",
            )}
          >
            <h2
              id="profiles-list-heading"
              ref={listHeadingRef}
              tabIndex={-1}
              className="text-base font-semibold text-gray-900 focus:outline-none"
            >
              {loading ? "Profiles" : `${profiles.length} ${profiles.length === 1 ? "profile" : "profiles"}`}
            </h2>
            {showSearch && (
              <div className="relative w-full sm:max-w-xs">
                <label htmlFor="profile-search" className="sr-only">
                  Search profiles
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <Input
                  id="profile-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, goal or note"
                  className="!pl-10"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div
              className={clsx("grid gap-4", formOpen ? "sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}
              aria-busy="true"
              aria-label="Loading profiles"
            >
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 animate-pulse rounded-full bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 animate-pulse rounded-lg bg-gray-100" />
                      <div className="h-3 w-1/3 animate-pulse rounded-lg bg-gray-100" />
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
                  </div>
                  <div className="mt-4 h-3 w-4/5 animate-pulse rounded-lg bg-gray-100" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {loadError}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  fetchProfiles();
                }}
              >
                <RefreshCw aria-hidden />
                Retry
              </Button>
            </div>
          ) : profiles.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No profiles yet"
              description="Add the first person you plan for. Their goals and health notes make every plan personal."
              className={clsx(formOpen && "hidden lg:flex")}
              action={
                formOpen ? undefined : (
                  <Button type="button" onClick={() => openForm(null)}>
                    <Plus aria-hidden />
                    Create a profile
                  </Button>
                )
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matching profiles"
              description={`Nothing matches "${query.trim()}". Try a different name or goal.`}
              action={
                <Button type="button" variant="ghost" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <ul className={clsx("grid gap-4", formOpen ? "sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
              {filtered.map((profile) => {
                const TimeIcon = TIME_ICON[profile.preferredTime] ?? Clock;
                const goals = profile.goals ?? [];
                const isEditing = formOpen && editingId === profile.id;
                return (
                  <li
                    key={profile.id}
                    className={clsx(
                      "flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm",
                      isEditing ? "border-indigo-300 ring-1 ring-indigo-300" : "border-gray-200",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <ProfileAvatar name={profile.name} seed={profile.id} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-gray-900" title={profile.name}>
                          {profile.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {profile.age} yrs · {GENDER_LABEL[profile.gender] ?? profile.gender}
                        </p>
                      </div>
                      <div className="-mr-2 -mt-2 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => openForm(profile.id)}
                          aria-label={`Edit ${profile.name}`}
                          title="Edit"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(profile.id, profile.name)}
                          aria-label={`Delete ${profile.name}`}
                          title="Delete"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        <Gauge className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                        {EXPERIENCE_LABEL[profile.experience] ?? profile.experience}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        <TimeIcon className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                        {TIME_LABEL[profile.preferredTime] ?? profile.preferredTime}
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500">Goals</p>
                      {goals.length > 0 ? (
                        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={`Goals for ${profile.name}`}>
                          {goals.slice(0, 4).map((goal) => (
                            <li
                              key={goal}
                              className="max-w-full truncate rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                            >
                              {goal}
                            </li>
                          ))}
                          {goals.length > 4 && (
                            <li className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              +{goals.length - 4} more
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-gray-400">No goals added</p>
                      )}
                    </div>

                    {profile.healthConcerns?.trim() ? (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <p className="text-xs font-medium text-gray-500">Health notes</p>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-700" title={profile.healthConcerns}>
                          {profile.healthConcerns}
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Create / edit */}
        {formOpen && (
          <div
            ref={formRef}
            className="order-first scroll-mt-20 rounded-2xl border border-gray-200 bg-white shadow-sm lg:order-none lg:sticky lg:top-6"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900">
                  {editingId ? `Edit ${selectedProfile?.name || "profile"}` : "New profile"}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Fields marked <span className="text-red-600">*</span> are required.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close form"
                className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSave} noValidate className="divide-y divide-gray-100">
              <FormSection title="About">
                <Field label="Name" required error={errors.name}>
                  <Input
                    ref={nameRef}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    autoComplete="name"
                    placeholder="e.g. Priya Sharma"
                    error={Boolean(errors.name)}
                    aria-required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <Field label="Age" required error={errors.age}>
                    <Input
                      ref={ageRef}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={120}
                      value={form.age}
                      onChange={(e) => update("age", e.target.value)}
                      error={Boolean(errors.age)}
                      aria-required
                    />
                  </Field>
                  <SegmentedField
                    label="Gender"
                    name="gender"
                    value={form.gender}
                    onChange={(v) => update("gender", v as Profile["gender"])}
                    error={errors.gender}
                    options={[
                      { value: "female", label: "Female" },
                      { value: "male", label: "Male" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </div>
              </FormSection>

              <FormSection title="Goals" description="Pick any that apply, or add your own.">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Goals">
                  {GOAL_PRESETS.map((goal) => {
                    const on = form.goals.some((g) => sameGoal(g, goal));
                    return (
                      <GoalChip key={goal} label={goal} selected={on} onClick={() => toggleGoal(goal)} />
                    );
                  })}
                  {customGoals.map((goal) => (
                    <GoalChip key={goal} label={goal} selected onClick={() => toggleGoal(goal)} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="custom-goal" className="sr-only">
                      Add your own goal
                    </label>
                    <Input
                      id="custom-goal"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomGoal();
                        }
                      }}
                      placeholder="Add your own goal"
                    />
                  </div>
                  <Button type="button" variant="ghost" onClick={addCustomGoal} disabled={!customGoal.trim()}>
                    <Plus aria-hidden />
                    Add
                  </Button>
                </div>
              </FormSection>

              <FormSection title="Health">
                <Field
                  label="Health notes"
                  helper="Conditions, injuries, medicines or anything a plan should avoid."
                >
                  <Textarea
                    value={form.healthConcerns}
                    onChange={(e) => update("healthConcerns", e.target.value)}
                    placeholder="e.g. Mild knee pain, thyroid medication"
                    rows={3}
                  />
                </Field>
              </FormSection>

              <FormSection title="Schedule">
                <SegmentedField
                  label="Experience"
                  name="experience"
                  value={form.experience}
                  onChange={(v) => update("experience", v as Profile["experience"])}
                  options={[
                    { value: "beginner", label: "Beginner" },
                    { value: "intermediate", label: "Intermediate" },
                    { value: "advanced", label: "Advanced" },
                  ]}
                />
                <SegmentedField
                  label="Preferred session time"
                  name="preferredTime"
                  value={form.preferredTime}
                  onChange={(v) => update("preferredTime", v as Profile["preferredTime"])}
                  options={[
                    { value: "morning", label: "Morning" },
                    { value: "evening", label: "Evening" },
                    { value: "flexible", label: "Flexible" },
                  ]}
                />
              </FormSection>

              <div className="space-y-3 px-5 py-4 sm:px-6">
                {saveError && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {saveError}
                  </p>
                )}
                {submitted && (errors.name || errors.age || errors.gender) && (
                  <p role="alert" className="text-sm text-red-600">
                    Fix the highlighted fields to save.
                  </p>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="ghost" onClick={closeForm} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    {saving ? "Saving…" : editingId ? "Save changes" : "Create profile"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((current) => ({ ...current, isOpen: false }))}
        onConfirm={confirmDelete}
        fallbackFocusRef={listHeadingRef}
        title={`Delete ${deleteConfirm.profileName}?`}
        message={
          <>
            This removes the profile <strong className="font-semibold text-gray-900">{deleteConfirm.profileName}</strong>{" "}
            and every plan created for it. This cannot be undone.
          </>
        }
        confirmText="Delete profile"
        cancelText="Cancel"
        variant="danger"
        details={
          deleteConfirm.planCount > 0 ? (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {deleteConfirm.planCount} {deleteConfirm.planCount === 1 ? "plan" : "plans"} for this profile will also
              be deleted.
            </p>
          ) : undefined
        }
      />
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0 space-y-4 px-5 py-5 sm:px-6">
      <legend className="float-left mb-1 w-full">
        <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</span>
        {description ? <span className="mt-1 block text-sm text-gray-500">{description}</span> : null}
      </legend>
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

function SegmentedField({
  label,
  name,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  error?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
      <legend className="mb-1.5 text-[13px] font-semibold text-gray-700">
        {label}
        <span className="ml-1 text-red-600" aria-hidden>
          *
        </span>
      </legend>
      <div
        className={clsx("grid rounded-xl bg-gray-100 p-1", error && "ring-1 ring-red-300")}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label key={option.value} className="relative min-w-0">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-[40px] cursor-pointer items-center justify-center truncate rounded-lg px-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 peer-checked:bg-white peer-checked:text-gray-900 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function GoalChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        "inline-flex min-h-[40px] max-w-full items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
        selected
          ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
          : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50",
      )}
    >
      {selected ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Plus className="h-3.5 w-3.5 text-gray-400" aria-hidden />}
      <span className="truncate">{label}</span>
    </button>
  );
}

