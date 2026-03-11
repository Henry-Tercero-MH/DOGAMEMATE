import { useEffect, useState } from 'react';
import './Lobby.css';
import { listPlayers } from '../utils/multiplayerAPI';
import { QRCodeSVG } from 'qrcode.react';

export default function Lobby({ roomId, isJoining = false, isHost = false, onStartGame }) {
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
      <h2>{isJoining ? '👋 Uniéndote a la Sala' : '🎮 Sala de Espera - 2 Equipos'}</h2>
      
      {isJoining && (
        <p style={{ color: '#6BCB77', marginBottom: '1rem', fontSize: '0.95rem', textAlign: 'center' }}>
          Te has unido correctamente. Espera a que el anfitrión inicie la partida.
        </p>
      )}
      
      {/* Mostrar 2 QR codes - Uno por equipo */}
      {!isJoining && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: '#667eea' }}>
            📱 Escanea según tu equipo
          </h3>
          <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* QR Equipo A */}
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ color: '#FF6B9D', marginBottom: '0.5rem', fontSize: '1.2rem' }}>🔴 Equipo A</h4>
              <div style={{ 
                background: '#fff', 
                padding: '1rem', 
                borderRadius: '12px', 
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(255,107,157,0.3)',
                border: '3px solid #FF6B9D'
              }}>
                <QRCodeSVG 
                  value={`${window.location.origin}/?roomId=${roomId}&teamId=A`} 
                  size={150}
                  level="M"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* QR Equipo B */}
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ color: '#7C6BF0', marginBottom: '0.5rem', fontSize: '1.2rem' }}>🔵 Equipo B</h4>
              <div style={{ 
                background: '#fff', 
                padding: '1rem', 
                borderRadius: '12px', 
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(124,107,240,0.3)',
                border: '3px solid #7C6BF0'
              }}>
                <QRCodeSVG 
                  value={`${window.location.origin}/?roomId=${roomId}&teamId=B`} 
                  size={150}
                  level="M"
                  includeMargin={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Info */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.3rem' }}>Room ID:</p>
          <div style={{ 
            background: 'rgba(102, 126, 234, 0.1)', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px',
            border: '2px solid rgba(102, 126, 234, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <strong style={{ 
              color: '#667eea', 
              fontFamily: 'monospace', 
              fontSize: '1.1rem'
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

      {loading && players.length === 0 ? <p>Cargando jugadores...</p> : null}
      
      {/* Lista de jugadores por equipos */}
      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
        {/* Equipo A */}
        <div style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
          <h3 style={{ color: '#FF6B9D', textAlign: 'center', marginBottom: '1rem' }}>🔴 Equipo A</h3>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            background: 'rgba(255,107,157,0.1)',
            border: '2px solid rgba(255,107,157,0.3)',
            borderRadius: '12px',
            minHeight: '100px'
          }}>
            {players.filter(p => (p.teamId || p[5]) === 'A').length === 0 ? (
              <li style={{ justifyContent: 'center', color: '#888', padding: '1rem' }}>
                Esperando jugadores del Equipo A...
              </li>
            ) : (
              players.filter(p => (p.teamId || p[5]) === 'A').map((player, idx) => (
                <li key={idx} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,107,157,0.2)' }}>
                  <span>{player.playerName || player[1] || 'Jugador'}</span>
                  <span style={{ marginLeft: 8, color: '#FF6B9D' }}>🎭 {player.avatar || player[2] || 'avatar'}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Equipo B */}
        <div style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
          <h3 style={{ color: '#7C6BF0', textAlign: 'center', marginBottom: '1rem' }}>🔵 Equipo B</h3>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0,
            background: 'rgba(124,107,240,0.1)',
            border: '2px solid rgba(124,107,240,0.3)',
            borderRadius: '12px',
            minHeight: '100px'
          }}>
            {players.filter(p => (p.teamId || p[5]) === 'B').length === 0 ? (
              <li style={{ justifyContent: 'center', color: '#888', padding: '1rem' }}>
                Esperando jugadores del Equipo B...
              </li>
            ) : (
              players.filter(p => (p.teamId || p[5]) === 'B').map((player, idx) => (
                <li key={idx} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(124,107,240,0.2)' }}>
                  <span>{player.playerName || player[1] || 'Jugador'}</span>
                  <span style={{ marginLeft: 8, color: '#7C6BF0' }}>🎭 {player.avatar || player[2] || 'avatar'}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      
      {/* Botón Iniciar Partida - Solo para anfitrión */}
      {isHost && players.length >= 1 && (
        <button
          onClick={onStartGame}
          style={{
            marginTop: '2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1.1rem',
            fontWeight: '700',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
          }}
          onMouseLeave={e => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
          }}
        >
          🎮 Iniciar Partida
        </button>
      )}
      
      {!isHost && (
        <p style={{ fontSize: '0.95rem', color: '#999', marginTop: '2rem' }}>
          ⏳ Esperando a que el anfitrión inicie la partida...
        </p>
      )}
    </div>
  );
}
