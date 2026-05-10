import type Anthropic from '@anthropic-ai/sdk';
import { buildAnalyzePrompt } from './prompts.js';
import type { Trace } from './types.js';

const MAX_TOKENS = 16000;
/** Hard ceiling for a single analyze call. Adaptive thinking on Opus can take a while. */
const TIMEOUT_MS = 60_000;

/**
 * The slice of the Anthropic SDK we depend on. Defining the shape ourselves
 * lets the analyze endpoint be unit-tested with a hand-rolled stub and avoids
 * coupling tests to the SDK constructor.
 */
export interface AnalysisClient {
  messages: {
    create(
      params: Anthropic.MessageCreateParamsNonStreaming,
      options?: { timeout?: number },
    ): Promise<Anthropic.Message>;
  };
}

/** Send `trace` to Claude for analysis and return the markdown response. */
export async function analyzeTrace(
  trace: Trace,
  client: AnalysisClient,
  model: string,
): Promise<string> {
  const prompt = buildAnalyzePrompt(trace);
  const response = await client.messages.create(
    {
      model,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      system: prompt.system,
      messages: prompt.messages,
    },
    { timeout: TIMEOUT_MS },
  );
  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}
