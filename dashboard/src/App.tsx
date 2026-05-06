export default function App() {
  return (
    <main>
      <header>
        <h1>kankani</h1>
        <p className="tagline">AI-assisted observability for Node.js</p>
      </header>
      <section className="empty">
        <p>The trace list arrives in the next mini-commit.</p>
        <p className="hint">
          Try the JSON API directly: <code>GET /api/traces</code>
        </p>
      </section>
    </main>
  );
}
