import React from 'react';

export function App() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>FireWatch Tanzania</h1>
      <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
        Web App Core Shell (Geremi / Team Tazama)
      </p>
      <div style={{ marginTop: '2rem' }}>
        <a
          href="/insights-preview/"
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#f97316',
            color: '#000',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 700,
          }}
        >
          Open Domain D Analytics Preview
        </a>
      </div>
    </div>
  );
}
export default App;
