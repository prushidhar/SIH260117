import type { GenerativeUISpec } from '@/components/generative-ui/types';

/**
 * Robust parser for Generative UI specs embedded in Markdown or JSON blocks.
 * Safely handles incomplete streams and partial JSON during active LLM token emission.
 */
export function parseGenerativeUISpec(raw: string): GenerativeUISpec | null {
  if (!raw || !raw.trim()) return null;

  const trimmed = raw.trim();

  // 1. Direct JSON parse attempt
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && parsed.component) {
      return {
        id: parsed.id || `genui-${Date.now()}`,
        component: parsed.component,
        title: parsed.title,
        props: parsed.props || {},
        rawJson: trimmed,
        status: 'ready',
      };
    }
  } catch {
    // Continue to repair attempts
  }

  // 2. Extract from Markdown fenced blocks if passed full text with fences
  const fenceRegex = /```(?:json:)?(?:gen-?ui|ui)\s*([\s\S]*?)```/i;
  const match = fenceRegex.exec(trimmed);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && typeof parsed === 'object' && parsed.component) {
        return {
          id: parsed.id || `genui-${Date.now()}`,
          component: parsed.component,
          title: parsed.title,
          props: parsed.props || {},
          rawJson: match[1].trim(),
          status: 'ready',
        };
      }
    } catch {
      // Continue to streaming repair
    }
  }

  // 3. Partial streaming JSON repair:
  // If the stream is still appending tokens, we can attempt to close brackets/quotes
  const repaired = attemptRepairPartialJson(trimmed);
  if (repaired) {
    try {
      const parsed = JSON.parse(repaired);
      if (parsed && typeof parsed === 'object' && parsed.component) {
        return {
          id: parsed.id || `genui-${Date.now()}`,
          component: parsed.component,
          title: parsed.title,
          props: parsed.props || {},
          rawJson: trimmed,
          status: 'streaming',
        };
      }
    } catch {
      // Failed to repair
    }
  }

  return null;
}

/**
 * Heuristic repair for streaming JSON
 */
function attemptRepairPartialJson(partial: string): string | null {
  let cleaned = partial.trim();

  // Strip leading code fence if present
  cleaned = cleaned.replace(/^```(?:json:)?(?:gen-?ui|ui)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/, '');

  if (!cleaned.startsWith('{')) {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace === -1) return null;
    cleaned = cleaned.substring(firstBrace);
  }

  // Count unclosed quotes and braces
  let inString = false;
  let escapeNext = false;
  let openBraces = 0;
  let openBrackets = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') openBraces++;
      else if (ch === '}') openBraces--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }
  }

  // Auto-close string if open
  let candidate = cleaned;
  if (inString) {
    candidate += '"';
  }

  // Trim trailing comma
  candidate = candidate.replace(/,\s*$/, '');

  // Close open brackets and braces
  while (openBrackets > 0) {
    candidate += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    candidate += '}';
    openBraces--;
  }

  return candidate;
}
