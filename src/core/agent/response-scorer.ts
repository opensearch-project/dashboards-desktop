/**
 * Response quality scoring — heuristic score on agent responses.
 */

export interface QualityScore {
  overall: number; // 0-100
  factors: Record<string, number>;
}

export function scoreResponse(response: string, usedTools: boolean, promptLength: number): QualityScore {
  const factors: Record<string, number> = {};

  // Length appropriateness (not too short, not too long)
  const len = response.length;
  factors.length = len < 20 ? 20 : len < 50 ? 50 : len > 5000 ? 60 : 90;

  // Tool usage (bonus if tools were used for data-dependent questions)
  factors.toolUsage = usedTools ? 95 : 70;

  // Specificity (contains numbers, code blocks, or structured data)
  const hasNumbers = /\d+/.test(response);
  const hasCodeBlock = /```/.test(response);
  const hasStructure = /\|.*\|/.test(response) || hasCodeBlock;
  factors.specificity = (hasNumbers ? 30 : 0) + (hasStructure ? 40 : 0) + 30;

  // Response ratio (response should be proportional to prompt)
  const ratio = len / Math.max(promptLength, 1);
  factors.ratio = ratio < 0.1 ? 30 : ratio > 10 ? 60 : 85;

  // Confidence (absence of hedging phrases)
  const hedging = ['i think', 'maybe', 'possibly', 'not sure', 'i apologize'];
  const hedgeCount = hedging.filter((h) => response.toLowerCase().includes(h)).length;
  factors.confidence = Math.max(40, 100 - hedgeCount * 20);

  const overall = Math.round(Object.values(factors).reduce((a, b) => a + b, 0) / Object.keys(factors).length);
  return { overall, factors };
}
