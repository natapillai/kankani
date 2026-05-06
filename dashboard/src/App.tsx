import TraceList from './TraceList';

export default function App() {
  return (
    <main>
      <header className="page-header">
        <h1>kankani</h1>
        <p className="tagline">AI-assisted observability for Node.js</p>
      </header>
      <TraceList />
    </main>
  );
}
