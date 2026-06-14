import { Route, Router, Routes, useParams } from "lakebed/client";

function Home() {
  document.title = "HTML Drop";

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-10 text-neutral-100">
      <section className="mx-auto max-w-2xl text-center">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-cyan-300">HTML Drop</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">Drop HTML onto the web</h1>
        <p className="mt-5 text-lg text-neutral-400">
          API-only publishing for private-by-url plans, research notes, and other information-only HTML documents.
        </p>
        <p className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-5 py-4 text-sm text-neutral-400">
          Publishing is API-only and requires an API token. See the local README for usage.
        </p>
      </section>
    </main>
  );
}

function PageView() {
  document.title = "HTML Drop Document";
  const { slug } = useParams<{ slug: string }>();
  return <iframe className="h-screen w-screen border-0 bg-white" sandbox="allow-same-origin allow-popups allow-forms" src={`/raw?slug=${encodeURIComponent(slug)}`} title="Published document" />;
}

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/p/:slug" element={<PageView />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}
