import { Fragment, type ReactNode } from "react";

/**
 * Renders the coach's reply: paragraphs, headings, bullet and numbered lists
 * and **bold**. Builds React elements (no HTML injection) and drops the
 * markdown symbols the model uses, so no raw asterisks or hashes show.
 */

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[]; start: number };

const BULLET = /^\s*(?:[-*•+])\s+(.*)$/;
const NUMBERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*?)\s*#*\s*$/;
/** A whole line in bold, like "**Breakfast ideas:**", reads as a heading. */
const BOLD_LINE = /^\s*\*\*([^*]+)\*\*:?\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim() || RULE.test(line)) {
      flush();
      continue;
    }
    const heading = HEADING.exec(line) ?? BOLD_LINE.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "h", text: heading[1].replace(/:$/, "") });
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      if (current?.kind !== "ul") {
        flush();
        current = { kind: "ul", items: [] };
      }
      current.items.push(bullet[1]);
      continue;
    }
    const numbered = NUMBERED.exec(line);
    if (numbered) {
      if (current?.kind !== "ol") {
        flush();
        current = { kind: "ol", items: [], start: Number(numbered[1]) || 1 };
      }
      current.items.push(numbered[2]);
      continue;
    }
    // An indented line right after a list item continues that item.
    if ((current?.kind === "ul" || current?.kind === "ol") && /^\s{2,}/.test(raw)) {
      current.items[current.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    if (current?.kind !== "p") {
      flush();
      current = { kind: "p", lines: [] };
    }
    current.lines.push(line.trim());
  }
  flush();
  return blocks;
}

/** **bold** and __bold__ become <strong>; single *emphasis*, `code` and [links](url) keep only their text. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|__(.+?)__/g;
  let last = 0;
  let match: RegExpExecArray | null;
  const plain = (value: string) =>
    value
      .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/(^|[^\w*])\*(?!\s)([^*]+?)\*(?!\w)/g, "$1$2")
      .replace(/(^|\W)_(?!\s)([^_]+?)_(?!\w)/g, "$1$2")
      .replace(/\*{2,}/g, "");
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(plain(text.slice(last, match.index)));
    out.push(
      <strong key={match.index} className="font-semibold text-gray-900">
        {plain(match[1] ?? match[2])}
      </strong>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(plain(text.slice(last)));
  return out;
}

export function CoachMarkdown({ text }: { text: string }) {
  const blocks = parse(text);
  return (
    <div className="space-y-3 text-sm leading-6 text-gray-700">
      {blocks.map((block, i) => {
        if (block.kind === "h") {
          return (
            <p key={i} className="pt-1 text-sm font-semibold text-gray-900">
              {inline(block.text)}
            </p>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <span className="min-w-0 flex-1">{inline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <span aria-hidden className="w-5 shrink-0 text-right font-semibold tabular-nums text-gray-500">
                    {block.start + j}.
                  </span>
                  <span className="min-w-0 flex-1">{inline(item)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="break-words">
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
