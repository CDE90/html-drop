export type Page = {
  id: string;
  slug: string;
  editToken: string;
  title: string;
  html: string;
  authorId: string;
  readOnly: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export function cleanToken(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 96);
}

export function cleanTitle(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, 120) || "Untitled document";
}

export function looksLikeHtml(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return lower.includes("<html") || lower.includes("<!doctype html") || lower.includes("<body") || lower.includes("<main");
}
