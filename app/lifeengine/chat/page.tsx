"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { CircleAlert, Info, MessageCircle, RefreshCw, SendHorizontal, SquarePen, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { MessageBubble, TypingIndicator, type CoachMessage } from "@/components/lifeengine/coach/CoachThread";
import type { Profile } from "@/lib/ai/schemas";

/** The conversation for this browser tab only. */
const SESSION_KEY = "lifeengine.coach.session.v1";
/** Profile id sent when the coach should give general advice. */
const GENERAL = "general";
const MAX_LENGTH = 1500;

const STARTERS = [
  "What should I eat before a morning walk?",
  "Yoga for lower back pain?",
  "How do I manage PCOS with diet?",
  "A high-protein vegetarian breakfast?",
  "How can I sleep better after late-night screen time?",
  "Is it okay to do yoga after dinner?",
];

const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", other: "Other" };
const EXPERIENCE_LABEL: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

type ProfilesState = { status: "loading" } | { status: "ready"; profiles: Profile[] } | { status: "error" };
type ChatError = { message: string; retryable: boolean };

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * The chat route's own profile lookup runs without the user's session, so the
 * profile is passed along with the question. The thread shows only the question.
 */
function withContext(question: string, profile: Profile | undefined) {
  const about = profile
    ? [
        `About me: ${profile.name}, ${profile.age}, ${GENDER_LABEL[profile.gender] ?? profile.gender}.`,
        profile.goals?.length ? `Goals: ${profile.goals.join(", ")}.` : "",
        profile.healthConcerns?.trim() ? `Health notes: ${profile.healthConcerns.trim()}.` : "",
        profile.experience ? `Experience: ${profile.experience}.` : "",
        profile.preferredTime && profile.preferredTime !== "flexible" ? `I prefer ${profile.preferredTime} sessions.` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";
  return [
    `[Context, not part of my question. ${about} I live in India, so suggest Indian foods, measures and routines where it helps. Keep it short and practical.]`,
    "",
    question,
  ].join("\n");
}

function readSession(): { profileId?: string; messages: CoachMessage[] } {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.messages)) {
      const messages = parsed.messages.filter(
        (m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && typeof m.id === "string",
      );
      return { profileId: typeof parsed.profileId === "string" ? parsed.profileId : undefined, messages };
    }
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  return { messages: [] };
}

export default function CoachPage() {
  const [profilesState, setProfilesState] = useState<ProfilesState>({ status: "loading" });
  const [profileId, setProfileId] = useState<string>("");
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [restored, setRestored] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const storedProfileRef = useRef<string | undefined>(undefined);

  const loadProfiles = useCallback(async () => {
    setProfilesState({ status: "loading" });
    try {
      const response = await fetch("/api/lifeengine/profiles");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setProfilesState({ status: "ready", profiles: Array.isArray(data.profiles) ? data.profiles : [] });
    } catch {
      setProfilesState({ status: "error" });
    }
  }, []);

  // Restore this tab's conversation, then load profiles.
  useEffect(() => {
    const session = readSession();
    storedProfileRef.current = session.profileId;
    setMessages(session.messages);
    // A question left without a reply (the tab was closed or the request failed) can be asked again.
    if (session.messages[session.messages.length - 1]?.role === "user") {
      setError({ message: "Your last question did not get a reply.", retryable: true });
    }
    setRestored(true);
    void loadProfiles();
    return () => abortRef.current?.abort();
  }, [loadProfiles]);

  // Pick the profile: the one used earlier in this tab, else the first, else general advice.
  useEffect(() => {
    if (profilesState.status === "loading" || profileId) return;
    const profiles = profilesState.status === "ready" ? profilesState.profiles : [];
    const stored = storedProfileRef.current;
    if (stored && (stored === GENERAL || profiles.some((p) => p.id === stored))) setProfileId(stored);
    else setProfileId(profiles[0]?.id ?? GENERAL);
  }, [profilesState, profileId]);

  useEffect(() => {
    if (!restored) return;
    try {
      if (messages.length) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profileId, messages }));
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Storage blocked: the conversation still works for this visit.
    }
  }, [messages, profileId, restored]);

  // Keep the newest message in view.
  useEffect(() => {
    if (!messages.length && !pending) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, pending, error]);

  const profiles = profilesState.status === "ready" ? profilesState.profiles : [];
  const selectedProfile = profiles.find((p) => p.id === profileId);

  /** Ask the last user message in `thread`, with the earlier messages as history. */
  const request = async (thread: CoachMessage[]) => {
    const question = thread[thread.length - 1];
    if (!question || question.role !== "user") return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/lifeengine/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          profileId: profileId || GENERAL,
          message: withContext(question.content, selectedProfile),
          conversationHistory: thread.slice(0, -1).slice(-10),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          response.status === 503
            ? { message: "The coach is not available right now because AI is not set up on this server. Try again later.", retryable: true }
            : response.status === 400
              ? { message: "That question could not be sent. Try rewording it.", retryable: false }
              : { message: "The coach could not answer just now. Check your connection and try again.", retryable: true },
        );
        return;
      }
      const reply = typeof data?.response === "string" ? data.response.trim() : "";
      if (!reply) {
        setError({ message: "The coach sent an empty reply. Try again.", retryable: true });
        return;
      }
      setMessages((current) => [
        ...current,
        { id: newId(), role: "assistant", content: reply, timestamp: data.timestamp ?? new Date().toISOString() },
      ]);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError({ message: "The coach could not answer just now. Check your connection and try again.", retryable: true });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(false);
      }
    }
  };

  const ask = (text: string) => {
    const content = text.trim().slice(0, MAX_LENGTH);
    if (!content || pending) return;
    const thread: CoachMessage[] = [...messages, { id: newId(), role: "user", content, timestamp: new Date().toISOString() }];
    setMessages(thread);
    setDraft("");
    void request(thread);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      ask(draft);
    }
  };

  const retry = () => void request(messages);

  const newChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
    setMessages([]);
    setError(null);
    setDraft("");
    inputRef.current?.focus();
  };

  // Grow the box with its text, up to about six lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [draft]);

  const lastIsUnanswered = messages.length > 0 && messages[messages.length - 1].role === "user";
  const empty = messages.length === 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Coach"
        description="Ask about yoga, food, sleep and everyday habits. Answers take the chosen profile into account."
        actions={
          !empty ? (
            <Button type="button" variant="ghost" onClick={newChat}>
              <SquarePen aria-hidden />
              New chat
            </Button>
          ) : undefined
        }
      />

      <section aria-label="Chat with your coach" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Whose profile the coach considers */}
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-end sm:gap-4 sm:px-6">
          <div className="min-w-0 sm:w-72">
            <label htmlFor="coach-profile" className="mb-1.5 block text-[13px] font-semibold text-gray-700">
              Coach considers
            </label>
            {profilesState.status === "loading" ? (
              <div className="h-10 animate-pulse rounded-xl bg-gray-100" aria-hidden />
            ) : (
              <Select id="coach-profile" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
                <option value={GENERAL}>No one in particular (general advice)</option>
              </Select>
            )}
          </div>
          <div className="min-w-0 flex-1 text-sm text-gray-500 sm:pb-2.5">
            {profilesState.status === "error" ? (
              <p role="alert" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-red-700">
                <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
                <span>Profiles did not load, so answers are general.</span>
                <button type="button" onClick={loadProfiles} className="min-h-[40px] font-semibold underline underline-offset-2">
                  Try again
                </button>
              </p>
            ) : selectedProfile ? (
              <p className="truncate" title={selectedProfile.goals?.join(", ")}>
                {selectedProfile.age} yrs · {GENDER_LABEL[selectedProfile.gender] ?? selectedProfile.gender} ·{" "}
                {EXPERIENCE_LABEL[selectedProfile.experience] ?? selectedProfile.experience}
                {selectedProfile.goals?.length ? ` · ${selectedProfile.goals.slice(0, 2).join(", ")}` : ""}
              </p>
            ) : profilesState.status === "ready" && profiles.length === 0 ? (
              <p>
                <Link href="/lifeengine/profiles" className="inline-flex min-h-[40px] items-center gap-1.5 font-medium text-indigo-700 hover:underline">
                  <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                  Add a profile for personal answers
                </Link>
              </p>
            ) : profilesState.status === "ready" ? (
              <p>Answers are general, not tailored to anyone.</p>
            ) : null}
          </div>
        </div>

        {/* Conversation */}
        <div className="px-4 py-5 sm:px-6">
          {empty ? (
            <div className="flex flex-col items-center py-6 text-center sm:py-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <MessageCircle className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-4 text-base font-semibold text-gray-900">What would you like to ask?</h2>
              <p className="mt-1 max-w-md text-sm text-gray-600">
                Food, yoga, workouts, sleep or stress. Pick a question to start, or type your own below.
              </p>
              <ul className="mt-6 grid w-full gap-2 sm:grid-cols-2" aria-label="Suggested questions">
                {STARTERS.map((question) => (
                  <li key={question}>
                    <button
                      type="button"
                      onClick={() => ask(question)}
                      disabled={pending || !profileId}
                      className="flex min-h-[48px] w-full items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:opacity-50"
                    >
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol role="log" aria-label="Conversation" aria-live="polite" className="space-y-5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {pending && <TypingIndicator />}
            </ol>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center"
            >
              <p className="flex min-w-0 flex-1 items-start gap-2">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{error.message}</span>
              </p>
              {error.retryable && lastIsUnanswered && (
                <Button type="button" variant="ghost" size="sm" onClick={retry} disabled={pending} className="shrink-0">
                  <RefreshCw aria-hidden />
                  Retry
                </Button>
              )}
            </div>
          )}
          <div ref={endRef} className="scroll-mb-48" />
        </div>

        {/* Composer */}
        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 z-10 rounded-b-2xl border-t border-gray-100 bg-white/95 px-4 pb-4 pt-3 backdrop-blur sm:px-6"
        >
          <label htmlFor="coach-input" className="mb-1.5 block text-[13px] font-semibold text-gray-700">
            Your question
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="coach-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your question"
              aria-describedby="coach-note"
              className="min-h-[44px] w-full flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim() || !profileId}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SendHorizontal className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">Send</span>
            </button>
          </div>
          <p id="coach-note" className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              This is general guidance, not medical advice. For a health condition, pregnancy or medicines, check with your doctor.
              <span className="hidden sm:inline"> Press Enter to send, Shift+Enter for a new line.</span>
            </span>
          </p>
        </form>
      </section>
    </div>
  );
}
