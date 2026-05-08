import { useState } from 'react';
import TraceDetail from './TraceDetail';
import TraceList from './TraceList';

export default function App() {
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  return (
    <main>
      <header className="page-header">
        <h1>kankani</h1>
        <p className="tagline">AI-assisted observability for Node.js</p>
      </header>
      {selectedTraceId === null ? (
        <TraceList onSelect={setSelectedTraceId} />
      ) : (
        <TraceDetail
          traceId={selectedTraceId}
          onBack={() => {
            setSelectedTraceId(null);
          }}
        />
      )}
    </main>
  );
}
