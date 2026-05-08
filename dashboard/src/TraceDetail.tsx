import { useEffect, useState } from 'react';
import { aggregateStatus, fetchTrace, type Span, type Trace } from './api';

interface TraceDetailProps {
  traceId: string;
  onBack: () => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; trace: Trace }
  | { status: 'error'; message: string };

export default function TraceDetail({ traceId, onBack }: TraceDetailProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const trace = await fetchTrace(traceId);
        if (!cancelled) setState({ status: 'ready', trace });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  return (
    <section className="trace-detail">
      <header className="trace-detail__header">
        <button type="button" className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h2>Trace</h2>
      </header>

      {state.status === 'loading' && <p className="message">Loading…</p>}
      {state.status === 'error' && (
        <p className="message message--error">Error: {state.message}</p>
      )}
      {state.status === 'ready' && <TraceContent trace={state.trace} />}
    </section>
  );
}

function TraceContent({ trace }: { trace: Trace }) {
  const traceStart = trace.startTime;
  const traceEnd = trace.endTime ?? Date.now();
  const totalDuration = Math.max(traceEnd - traceStart, 1);
  const overallStatus = aggregateStatus(trace);

  const byId = new Map(trace.spans.map((s) => [s.id, s]));
  const depthOf = (span: Span): number => {
    let depth = 0;
    let cur: Span | undefined = span;
    while (cur?.parentId !== undefined) {
      const parent = byId.get(cur.parentId);
      if (!parent) break;
      cur = parent;
      depth++;
      if (depth > 100) break;
    }
    return depth;
  };

  return (
    <>
      <dl className="trace-meta">
        <div>
          <dt>Trace ID</dt>
          <dd className="mono">{trace.id}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>
            {trace.endTime !== undefined ? `${totalDuration.toString()}ms` : 'in flight'}
          </dd>
        </div>
        <div>
          <dt>Spans</dt>
          <dd>{trace.spans.length}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`status status--${overallStatus}`}>{overallStatus}</span>
          </dd>
        </div>
      </dl>

      <h3>Waterfall</h3>
      <div className="waterfall">
        {trace.spans.map((s) => {
          const depth = depthOf(s);
          const startOffset = s.startTime - traceStart;
          const spanEnd = s.endTime ?? traceEnd;
          const spanDur = Math.max(spanEnd - s.startTime, 0);
          const left = (startOffset / totalDuration) * 100;
          const width = Math.max((spanDur / totalDuration) * 100, 0.5);
          return (
            <div key={s.id} className="waterfall__row">
              <div
                className="waterfall__label"
                style={{ paddingLeft: `${(depth * 16).toString()}px` }}
                title={s.name}
              >
                {s.name}
              </div>
              <div className="waterfall__track">
                <div
                  className={`waterfall__bar status--${s.status}`}
                  style={{ left: `${left.toString()}%`, width: `${width.toString()}%` }}
                  title={`${s.name}: ${spanDur.toString()}ms`}
                />
              </div>
              <div className="waterfall__duration">{spanDur.toString()}ms</div>
            </div>
          );
        })}
      </div>

      <h3>Spans</h3>
      <div className="span-list">
        {trace.spans.map((s) => (
          <SpanCard key={s.id} span={s} traceStart={traceStart} />
        ))}
      </div>
    </>
  );
}

function SpanCard({ span, traceStart }: { span: Span; traceStart: number }) {
  const attrEntries = Object.entries(span.attributes);
  return (
    <div className="span-card">
      <div className="span-card__header">
        <span className="span-card__name">{span.name}</span>
        <span className={`status status--${span.status}`}>{span.status}</span>
      </div>
      <dl className="span-card__meta">
        <div>
          <dt>Span ID</dt>
          <dd className="mono">{span.id}</dd>
        </div>
        {span.parentId !== undefined && (
          <div>
            <dt>Parent</dt>
            <dd className="mono">{span.parentId}</dd>
          </div>
        )}
        <div>
          <dt>Duration</dt>
          <dd>
            {span.endTime !== undefined
              ? `${(span.endTime - span.startTime).toString()}ms`
              : 'in flight'}
          </dd>
        </div>
        <div>
          <dt>Start offset</dt>
          <dd>+{(span.startTime - traceStart).toString()}ms</dd>
        </div>
      </dl>
      {attrEntries.length > 0 && (
        <details className="span-card__attrs">
          <summary>Attributes ({attrEntries.length})</summary>
          <dl>
            {attrEntries.map(([k, v]) => (
              <div key={k}>
                <dt className="mono">{k}</dt>
                <dd className="mono">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {span.error && (
        <div className="span-card__error">
          <strong>Error:</strong> {span.error.message}
          {span.error.stack !== undefined && <pre>{span.error.stack}</pre>}
        </div>
      )}
    </div>
  );
}
