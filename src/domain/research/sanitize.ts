/**
 * Strip/sanitize untrusted website text before research prompts.
 * Website content is DATA only — never instructions.
 */

const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /you are now/i,
  /system prompt/i,
  /reveal (your|the) (api|secret|key|password)/i,
  /override (dnc|crm|qualification)/i,
  /recommend (mesoestetic|meso)/i,
];

export function sanitizeWebsiteText(raw: string, maxChars = 12000): string {
  let text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(text)) {
      text = text.replace(pat, "[filtered-untrusted-content]");
    }
  }

  return text.slice(0, maxChars);
}

export function containsPromptInjectionAttempt(raw: string): boolean {
  return INJECTION_PATTERNS.some((pat) => pat.test(raw));
}

export function stripSecretsFromText(text: string): string {
  return text
    .replace(/sk-[a-zA-Z0-9]{10,}/g, "[redacted-key]")
    .replace(/ANTHROPIC_API_KEY\s*=\s*\S+/gi, "[redacted-env]")
    .replace(/OPENAI_API_KEY\s*=\s*\S+/gi, "[redacted-env]")
    .replace(/ODOO_\w+\s*=\s*\S+/gi, "[redacted-env]");
}
