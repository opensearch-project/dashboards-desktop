/**
 * PII detection — scan text for sensitive data patterns, redact or warn.
 */

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '<EMAIL>' },
  { name: 'phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '<PHONE>' },
  { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '<SSN>' },
  { name: 'credit_card', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '<CREDIT_CARD>' },
  { name: 'ip_address', pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '<IP>' },
  { name: 'aws_key', pattern: /AKIA[0-9A-Z]{16}/g, replacement: '<AWS_ACCESS_KEY>' },
  { name: 'aws_secret', pattern: /[A-Za-z0-9/+=]{40}(?=\s|$|")/g, replacement: '<AWS_SECRET>' },
];

export interface PIIMatch { type: string; count: number }

export function detectPII(text: string): PIIMatch[] {
  const matches: PIIMatch[] = [];
  for (const { name, pattern } of PII_PATTERNS) {
    const found = text.match(pattern);
    if (found?.length) matches.push({ type: name, count: found.length });
  }
  return matches;
}

export function redactPII(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function hasPII(text: string): boolean {
  return PII_PATTERNS.some(({ pattern }) => pattern.test(text));
}
