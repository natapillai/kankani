import type { Span, Trace } from './types.js';

/** Result of building the prompt for the analyze endpoint. */
export interface AnalyzePromptInput {
  system: SystemBlock[];
  messages: UserMessage[];
}

interface SystemBlock {
  type: 'text';
  text: string;
  cache_control: { type: 'ephemeral' };
}

interface UserMessage {
  role: 'user';
  content: string;
}

interface TraceSummary {
  duration_ms: number | null;
  span_count: number;
  spans: SpanSummary[];
}

interface SpanSummary {
  label: string;
  name: string;
  duration_ms: number | null;
  start_offset_ms: number;
  parent: string | null;
  status: Span['status'];
  attributes: Span['attributes'];
  error: Span['error'];
}

const SYSTEM_PROMPT = `You are an observability assistant for kankani, a Node.js HTTP request tracer.

Each user request to the developer's app produces a "trace" — a record of one HTTP request and its child operations. Traces contain "spans": units of work, each with a name, duration, status (ok/error/unset), and attributes (e.g. http.method, http.status, http.url for the root HTTP span).

When analyzing a trace, look for:
- What the request was for (HTTP method + path)
- How long each part took (highlight anything > 200ms or unusually slow)
- Errors (status: "error", or http.status >= 500) — try to suggest what may have caused them
- Span tree structure when relevant (parent-child relationships via the parent field)

Format your response as concise GitHub-flavored markdown:
- Open with a 1-2 sentence plain-English summary of what happened
- Use bullet points for individual observations or concerns
- End with a "Likely cause" or "Suggested fix" when applicable

Stay factual — do not invent attributes, timings, or error messages that are not in the trace. If a trace looks normal, say so briefly. If you don't have enough information to be sure, say that.`;

/**
 * Build the system + user message structure for analyzing a single trace.
 *
 * The system prompt is marked cacheable so repeat analyses within the TTL share
 * the cached prefix; per-trace data goes in the user message after the cached
 * prefix. (At v0.1 the system prompt is below the model's cache threshold and
 * silently won't cache yet — the marker is harmless and makes caching kick in
 * once the prompt grows.)
 */
export function buildAnalyzePrompt(trace: Trace): AnalyzePromptInput {
  const summary = summarizeTrace(trace);
  return {
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Analyze this trace:\n\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``,
      },
    ],
  };
}

function summarizeTrace(trace: Trace): TraceSummary {
  const labels = new Map<string, string>();
  trace.spans.forEach((s, i) => labels.set(s.id, `S${(i + 1).toString()}`));

  return {
    duration_ms: trace.endTime !== undefined ? trace.endTime - trace.startTime : null,
    span_count: trace.spans.length,
    spans: trace.spans.map((s, i) => ({
      label: `S${(i + 1).toString()}`,
      name: s.name,
      duration_ms: s.endTime !== undefined ? s.endTime - s.startTime : null,
      start_offset_ms: s.startTime - trace.startTime,
      parent: s.parentId !== undefined ? (labels.get(s.parentId) ?? null) : null,
      status: s.status,
      attributes: s.attributes,
      error: s.error,
    })),
  };
}
