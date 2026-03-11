import { useEffect, useState } from 'react';
import './Lobby.css';
import { listPlayers } from '../utils/multiplayerAPI';
import { QRCodeSVG } from 'qrcode.react';

export default function Lobby({ roomId, isJoining = false }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Polling para actualizar la lista de jugadores cada 3 segundos
  useEffect(() => {
    let interval;
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const response = await listPlayers(roomId);
        const data = response.success ? response.data : [];
        setPlayers(data || []);
      } catch (err) {
        console.error('Error cargando jugadores:', err);
        setPlayers([]);
      }
      setLoading(false);
    };
    fetchPlayers();
    interval = setInterval(fetchPlayers, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  return (
    <div className="lobby-container">
      <h2>{isJoining ? '👋 Uniéndote a la Sala' : '🎮 Sala de Espera'}</h2>
      
      {isJoining && (
        <p style={{ color: '#6BCB77', marginBottom: '1rem', fontSize: '0.95rem', textAlign: 'center' }}>
          Te has unido correctamente. Espera a que el anfitrión inicie la partida.
        </p>
      )}
      
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {/* QR Code - Solo se muestra si estás creando la sala */}
        {!isJoining && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              background: '#fff', 
              padding: '1rem', 
              borderRadius: '12px', 
              display: 'inline-block',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <QRCodeSVG 
                value={`${window.location.origin}/?roomId=${roomId}`} 
                size={180}
                level="M"
                includeMargin={true}
              />
            </div>
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#aaa' }}>Escanea para unirte</p>
          </div>
        )}

        {/* Room Info */}
        <div style={{ textAlign: 'left', flex: '1', minWidth: '200px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.3rem' }}>Room ID:</p>
            <div style={{ 
              background: 'rgba(102, 126, 234, 0.1)', 
              padding: '0.75rem 1rem', 
              borderRadius: '8px',
              border: '2px solid rgba(102, 126, 234, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}>
              <strong style={{ 
                color: '#667eea', 
                fontFamily: 'monospace', 
                fontSize: '1.1rem',
                wordBreak: 'break-all'
              }}>{roomId}</strong>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(roomId);
                  alert('Room ID copiado al portapapeles');
                }}
                style={{
                  background: '#667eea',
                  color: '#fff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
                title="Copiar Room ID"
              >
                📋 Copiar
              </button>
            </div>
          </div>
          
          <div style={{ fontSize: '1.1rem', color: '#667eea', marginTop: '1.5rem' }}>
            👥 Jugadores conectados: <strong>{players.length}</strong>
          </div>
        </div>
      </div>

      {loading && players.length === 0 ? <p>Cargando jugadores...</p> : null}
      
      <ul>
        {players.length === 0 ? (
          <li style={{ justifyContent: 'center', color: '#888' }}>
            Esperando jugadores...
          </li>
        ) : (
          players.map((player, idx) => (
            <li key={idx}>
              <span>{player[1] || 'Jugador'}</span> {/* playerName */}
              <span style={{ marginLeft: 8, color: '#888' }}>🎭 {player[2] || 'avatar'}</span>
            </li>
          ))
        )}
      </ul>
      <p style={{ fontSize: '0.95rem', color: '#999', marginTop: '2rem' }}>
        ⏳ Esperando a que todos se unan...
      </p>
    </div>
  );
}
