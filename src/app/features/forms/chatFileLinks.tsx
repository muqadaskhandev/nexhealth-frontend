import { Paperclip } from "lucide-react";

const FILE_URL_RE = /(?:https?:\/\/[^\s"'<>]+|\/uploads\/[^\s"'<>]+)/i;
const UPLOADED_RE = /^uploaded\s+/i;

export function extractFileUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    if (value && typeof value === "object" && "url" in (value as object)) {
      return extractFileUrl((value as { url: unknown }).url);
    }
    if (value && typeof value === "object" && "value" in (value as object)) {
      return extractFileUrl((value as { value: unknown }).value);
    }
    return null;
  }
  const trimmed = value.trim();
  const match = trimmed.match(FILE_URL_RE);
  if (match) return match[0];
  if (trimmed.startsWith("/uploads/")) return trimmed;
  return null;
}

export function fileLabelFromUrl(url: string, fallback?: string): string {
  const raw = url.split("/").pop() || fallback || "Open file";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const stripped = decoded.replace(/^[0-9a-f]{32}_/i, "");
  return stripped || decoded;
}

export function fileForTurn(
  turn: { content: string; field_id?: string | null },
  answers: { field_id: string; parsed_value: unknown }[] = [],
  draftAnswers: Record<string, unknown> = {}
): { url: string; label: string } | null {
  const fromText = extractFileUrl(turn.content);
  if (fromText) {
    return { url: fromText, label: fileLabelFromUrl(fromText) };
  }
  const fromAnswer = turn.field_id
    ? extractFileUrl(answers.find((a) => a.field_id === turn.field_id)?.parsed_value)
    : null;
  const fromDraft = turn.field_id ? extractFileUrl(draftAnswers[turn.field_id]) : null;
  let url = fromAnswer || fromDraft;
  if (!url && UPLOADED_RE.test(turn.content || "")) {
    const found = [
      ...answers.map((a) => extractFileUrl(a.parsed_value)),
      ...Object.values(draftAnswers).map((v) => extractFileUrl(v)),
    ].filter((u): u is string => Boolean(u));
    const unique = [...new Set(found)];
    if (unique.length === 1) url = unique[0];
  }
  if (!url) return null;
  const label = (turn.content || "").replace(UPLOADED_RE, "").trim() || fileLabelFromUrl(url);
  return { url, label };
}

export function ChatFileLink({
  href,
  label,
  dark = false,
}: {
  href: string;
  label?: string;
  dark?: boolean;
}) {
  const name = label || fileLabelFromUrl(href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 font-medium underline underline-offset-2 ${
        dark ? "text-white decoration-white/70 hover:decoration-white" : "text-teal-600 hover:text-teal-800"
      }`}
    >
      <Paperclip size={14} className="shrink-0" />
      <span className="break-all">{name}</span>
    </a>
  );
}
