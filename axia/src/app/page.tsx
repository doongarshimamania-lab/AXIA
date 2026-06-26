// ponytail: serve AXIA Vite app (running on port 3000) via full-page iframe
// Reason: the FC platform's web gateway serves Next.js from /app/, not our Vite build.
// This thin Next.js shell makes the FC gateway render the AXIA app at axia.space-z.ai.
export default function Home() {
  return (
    <iframe
      src="/axia/"
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
      title="Axia"
    />
  );
}
