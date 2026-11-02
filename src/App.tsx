import { useState } from 'react';
import Ruleta from './Ruleta';
import Multijugador from './Multijugador';
import './App.css';

function App() {
  const [pantalla, setPantalla] = useState<'individual' | 'online'>(() =>
    new URLSearchParams(window.location.search).has('sala') ? 'online' : 'individual'
  );

  return (
    <div className="app-container">
      <nav style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 12px' }}>
        <button
          onClick={() => setPantalla('individual')}
          style={{ border: 0, borderRadius: 12, padding: '11px 18px', fontWeight: 700, cursor: 'pointer', background: pantalla === 'individual' ? '#4f46e5' : '#e2e8f0', color: pantalla === 'individual' ? '#fff' : '#1e293b' }}
        >
          👤 Juego individual
        </button>
        <button
          onClick={() => setPantalla('online')}
          style={{ border: 0, borderRadius: 12, padding: '11px 18px', fontWeight: 700, cursor: 'pointer', background: pantalla === 'online' ? '#4f46e5' : '#e2e8f0', color: pantalla === 'online' ? '#fff' : '#1e293b' }}
        >
          🌐 Multijugador online
        </button>
      </nav>
      {pantalla === 'individual' ? (
        <>
          <h1>Juego de Preguntados</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Girá la ruleta para obtener una pregunta al azar de la categoría correspondiente.
          </p>
          <Ruleta />
        </>
      ) : <Multijugador />}
    </div>
  );
}

export default App;