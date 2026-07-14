import { marked } from "marked";

export const EMAIL_TEMPLATE_VARS = ["{{name}}", "{{service}}", "{{review_link}}"] as const;

export type EmailTemplateVars = {
  name: string;
  service: string;
  review_link: string;
};

export const EMAIL_PREVIEW_VARS: EmailTemplateVars = {
  name: "Alex Johnson",
  service: "Digital Marketing",
  review_link: "https://GMBFlow.app/review/sample-token",
};

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function replaceTemplateVars(
  text: string,
  vars: EmailTemplateVars
): string {
  return text
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{service\}\}/g, vars.service)
    .replace(/\{\{review_link\}\}/g, vars.review_link);
}

export function looksLikeHtml(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text.trim());
}

export function markdownToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) return trimmed;
  return marked.parse(trimmed) as string;
}

export function renderEmailPreviewHtml(
  body: string,
  vars: EmailTemplateVars = EMAIL_PREVIEW_VARS
): string {
  const withVars = replaceTemplateVars(body, vars);
  return markdownToHtml(withVars);
}

export function renderEmailPreviewText(
  body: string,
  vars: EmailTemplateVars = EMAIL_PREVIEW_VARS
): string {
  const withVars = replaceTemplateVars(body, vars);
  if (looksLikeHtml(withVars)) {
    return withVars.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return withVars;
}
