"use client";

/**
 * The way into Fitness: pick a person already saved in Profiles (their name,
 * age, gender, goals and health notes prefill the intake) or start from
 * scratch. Used wherever Fitness has no profile yet.
 */

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, HeartPulse, Plus, RefreshCw } from "lucide-react";

import { ProfileAvatar } from "@/app/lifeengine/profiles/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import type { PersonProfile } from "@/lib/fitness/fromProfile";
import { getFitnessProfiles, setActiveProfileId } from "@/lib/fitness/store";

const GENDER_LABEL: Record<string, string> = { female: "Female", male: "Male", other: "Other" };

export function possessive(name: string) {
  const trimmed = name.trim() || "this person";
  return `${trimmed}’s`;
}

type Props = {
  title?: string;
  description?: string;
  /** Called with the chosen person. Without it, the picker links to the intake. */
  onPick?: (person: PersonProfile) => void;
  onScratch?: () => void;
  /** Extra content under the choices (e.g. example profiles). */
  footer?: React.ReactNode;
  className?: string;
};

export function ProfileSourcePicker({
  title = "Set up fitness for someone",
  description = "Start from a person you already added and their details carry over. Then add health, pain and schedule details.",
  onPick,
  onScratch,
  footer,
  className,
}: Props) {
  const router = useRouter();
  const [people, setPeople] = useState<PersonProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState<Record<string, string>>({});

  const load = async () => {
    setError(null);
    setPeople(null);
    try {
      const response = await fetch("/api/lifeengine/profiles");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { profiles?: PersonProfile[] };
      setPeople(data.profiles ?? []);
    } catch {
      setError("We could not load your profiles.");
      setPeople([]);
    }
  };

  useEffect(() => {
    void load();
    const map: Record<string, string> = {};
    for (const entry of getFitnessProfiles()) {
      if (entry.sourceProfileId) map[entry.sourceProfileId] = entry.id;
    }
    setLinked(map);
  }, []);

  const choose = (person: PersonProfile) => {
    const existing = linked[person.id];
    if (existing) {
      setActiveProfileId(existing);
      router.push("/lifeengine/fitness");
      return;
    }
    if (onPick) onPick(person);
    else router.push(`/lifeengine/fitness/profile?from=${encodeURIComponent(person.id)}`);
  };

  const scratch = () => {
    if (onScratch) onScratch();
    else router.push("/lifeengine/fitness/profile?new=1");
  };

  const hasPeople = Boolean(people && people.length > 0);

  return (
    <section
      aria-labelledby="fitness-picker-title"
      className={clsx("mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6", className)}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <HeartPulse className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="fitness-picker-title" className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-gray-600">{description}</p>
        </div>
      </div>

      <div className="mt-5">
        {people === null ? (
          <ul className="space-y-2" aria-busy="true">
            {[0, 1].map((i) => (
              <li key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </ul>
        ) : error ? (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{error} You can still start from scratch.</span>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw aria-hidden />
              Try again
            </Button>
          </div>
        ) : hasPeople ? (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Your profiles</p>
            <ul className="space-y-2">
              {people!.map((person) => {
                const isLinked = Boolean(linked[person.id]);
                const goals = person.goals?.length ?? 0;
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => choose(person)}
                      className="flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 sm:px-4"
                    >
                      <ProfileAvatar name={person.name ?? ""} seed={person.id} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">
                          {isLinked ? `Open ${possessive(person.name ?? "")} fitness` : `Use ${possessive(person.name ?? "")} details`}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {[
                            person.age ? `${person.age} yrs` : null,
                            person.gender ? GENDER_LABEL[person.gender] ?? person.gender : null,
                            goals ? `${goals} goal${goals === 1 ? "" : "s"}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      {isLinked ? (
                        <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
                          Set up
                        </span>
                      ) : null}
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            No one in{" "}
            <Link href="/lifeengine/profiles" className="font-medium text-indigo-600 hover:text-indigo-700">
              Profiles
            </Link>{" "}
            yet. Start from scratch here, it takes about five minutes.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
        <Button variant={hasPeople ? "ghost" : "primary"} onClick={scratch}>
          <Plus aria-hidden />
          Start from scratch
        </Button>
        {hasPeople ? (
          <Link href="/lifeengine/profiles" className="inline-flex min-h-[40px] items-center px-2 text-sm font-medium text-gray-500 hover:text-gray-800">
            Manage profiles
          </Link>
        ) : null}
      </div>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </section>
  );
}
