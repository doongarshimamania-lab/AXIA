export default function Home() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Axia</h1>
        <p style={{ fontSize: '24px', marginBottom: '30px', color: '#94a3b8' }}>Agency Payment Protection Platform</p>
        <a href="/timelock/" style={{ background: 'linear-gradient(124.94deg, #0D9488 11.04%, #14B8A6 96.98%)', padding: '12px 32px', borderRadius: '8px', color: 'white', textDecoration: 'none', fontSize: '16px', fontWeight: 600 }}>
          Open Dashboard
        </a>
      </div>
    </div>
  );
}
