import { useCallback, useEffect, useState } from 'react';
import { aggregateStatus, fetchTraces, type Trace } from './api';

const REFRESH_INTERVAL_MS = 5000;

interface TraceListProps {
  onSelect: (traceId: string) => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; traces: Trace[] }
  | { status: 'error'; message: string };

function durationOf(trace: Trace): number | null {
  if (trace.endTime === undefined) return null;
  return trace.endTime - trace.startTime;
}

function relativeTime(ms: number): string {
  const delta = Date.now() - ms;
  if (delta < 1000) return 'just now';
  if (delta < 60_000) return `${Math.floor(delta / 1000).toString()}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000).toString()}m ago`;
  return `${Math.floor(delta / 3_600_000).toString()}h ago`;
}

export default function TraceList({ onSelect }: TraceListProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const traces = await fetchTraces();
      setState({ status: 'ready', traces });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(id);
    };
  }, [autoRefresh, refresh]);

  return (
    <section className="trace-list">
      <header className="trace-list__header">
        <h2>Traces</h2>
        <div className="trace-list__actions">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => {
                setAutoRefresh(e.target.checked);
              }}
            />
            Auto-refresh
          </label>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      {state.status === 'loading' && <p className="message">Loading…</p>}

      {state.status === 'error' && (
        <p className="message message--error">Error: {state.message}</p>
      )}

      {state.status === 'ready' && state.traces.length === 0 && (
        <p className="message">No traces captured yet. Hit your app to generate some.</p>
      )}

      {state.status === 'ready' && state.traces.length > 0 && (
        <table className="trace-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th className="num">Duration</th>
              <th>Started</th>
              <th>Trace ID</th>
            </tr>
          </thead>
          <tbody>
            {state.traces.map((t) => {
              const dur = durationOf(t);
              const stat = aggregateStatus(t);
              const rootSpan = t.spans.find((s) => s.id === t.rootSpanId);
              return (
                <tr
                  key={t.id}
                  className="trace-table__row"
                  onClick={() => {
                    onSelect(t.id);
                  }}
                >
                  <td>{rootSpan?.name ?? '—'}</td>
                  <td>
                    <span className={`status status--${stat}`}>{stat}</span>
                  </td>
                  <td className="num">{dur !== null ? `${dur.toString()}ms` : '—'}</td>
                  <td>{relativeTime(t.startTime)}</td>
                  <td className="mono">{t.id.slice(0, 8)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
