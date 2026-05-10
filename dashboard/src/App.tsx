import { useEffect, useState } from 'react';
import { fetchConfig, type ServerConfig } from './api';
import TraceDetail from './TraceDetail';
import TraceList from './TraceList';

const FALLBACK_CONFIG: ServerConfig = { aiConfigured: false, model: null };

export default function App() {
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [config, setConfig] = useState<ServerConfig>(FALLBACK_CONFIG);

  useEffect(() => {
    void (async () => {
      try {
        setConfig(await fetchConfig());
      } catch {
        setConfig(FALLBACK_CONFIG);
      }
    })();
  }, []);

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
          aiConfigured={config.aiConfigured}
          model={config.model}
          onBack={() => {
            setSelectedTraceId(null);
          }}
        />
      )}
    </main>
  );
}
