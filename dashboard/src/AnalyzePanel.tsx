import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { analyzeTrace, ApiError } from './api';

interface AnalyzePanelProps {
  traceId: string;
  aiConfigured: boolean;
  model: string | null;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; analysis: string }
  | { status: 'error'; message: string };

function friendlyError(code: string, fallback: string): string {
  switch (code) {
    case 'ai_not_configured':
      return 'AI is not configured. Set ANTHROPIC_API_KEY (or pass anthropicApiKey to kankani()) and restart the server.';
    case 'ai_auth_failed':
      return 'Authentication failed. Your API key is invalid or has been revoked — rotate it at console.anthropic.com.';
    case 'ai_rate_limited':
      return 'Rate limit exceeded. Wait a few seconds and try again.';
    case 'ai_timeout':
      return 'Request timed out after 60 seconds. Try again — adaptive thinking can occasionally exceed that.';
    case 'ai_upstream_error':
      return 'Anthropic returned an error. Try again in a moment.';
    case 'ai_unreachable':
      return "Couldn't reach Anthropic. Check your network connection.";
    default:
      return fallback;
  }
}

export default function AnalyzePanel({ traceId, aiConfigured, model }: AnalyzePanelProps) {
  const [state, setState] = useState<State>({ status: 'idle' });

  const onClick = (): void => {
    setState({ status: 'loading' });
    void (async () => {
      try {
        const analysis = await analyzeTrace(traceId);
        setState({ status: 'success', analysis });
      } catch (err) {
        const code = err instanceof ApiError ? err.code : 'unknown';
        const fallback = err instanceof Error ? err.message : String(err);
        setState({ status: 'error', message: friendlyError(code, fallback) });
      }
    })();
  };

  const disabled = !aiConfigured || state.status === 'loading';
  const buttonText = state.status === 'loading' ? 'Analyzing…' : 'Analyze with AI';

  return (
    <section className="analyze-panel">
      <header className="analyze-panel__header">
        <button
          type="button"
          className="analyze-button"
          disabled={disabled}
          onClick={onClick}
          title={
            aiConfigured ? undefined : 'Set ANTHROPIC_API_KEY in your kankani config to enable AI analysis.'
          }
        >
          {buttonText}
        </button>
        {!aiConfigured && (
          <span className="analyze-hint">
            Set <code>ANTHROPIC_API_KEY</code> to enable AI analysis.
          </span>
        )}
        {aiConfigured && model !== null && (
          <span className="analyze-hint analyze-hint--muted">via {model}</span>
        )}
      </header>

      {state.status === 'error' && (
        <div className="analyze-error">
          <strong>Analysis failed:</strong> {state.message}
        </div>
      )}

      {state.status === 'success' && (
        <article className="analyze-result">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.analysis}</ReactMarkdown>
        </article>
      )}
    </section>
  );
}
