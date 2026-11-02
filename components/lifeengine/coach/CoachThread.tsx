"use client";

import { Sparkles } from "lucide-react";
import { CoachMarkdown } from "./CoachMarkdown";

export type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

function CoachAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600" aria-hidden>
      <Sparkles className="h-4 w-4" />
    </span>
  );
}

export function MessageBubble({ message }: { message: CoachMessage }) {
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-900 px-4 py-2.5 text-sm leading-6 text-white sm:max-w-[75%]">
          <span className="sr-only">You: </span>
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-3">
      <CoachAvatar />
      <div className="min-w-0 max-w-[calc(100%-2.75rem)] rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 sm:max-w-[85%]">
        <span className="sr-only">Coach: </span>
        <CoachMarkdown text={message.content} />
      </div>
    </li>
  );
}

export function TypingIndicator() {
  return (
    <li className="flex items-start gap-3">
      <CoachAvatar />
      <div className="rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3.5">
        <span role="status" className="sr-only">
          The coach is writing a reply
        </span>
        <span className="flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </span>
      </div>
    </li>
  );
}
