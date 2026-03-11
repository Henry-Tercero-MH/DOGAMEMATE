import { motion } from 'framer-motion';
import './Ball.css';

export default function Ball({ position = 'A', isMoving = false, isFalling = false }) {
  // Posición del balón: 'A' (izquierda), 'B' (derecha), 'center' (centro)
  const getXPosition = () => {
    if (position === 'A') return '10%';
    if (position === 'B') return '90%';
    return '50%';
  };

  return (
    <div className="ball-container">
      {/* Cancha de juego */}
      <div className="court">
        <div className="team-zone team-a">
          <span className="team-label">🔴 Equipo A</span>
        </div>
        <div className="net"></div>
        <div className="team-zone team-b">
          <span className="team-label">🔵 Equipo B</span>
        </div>
      </div>

      {/* Balón animado */}
      <motion.div
        className={`ball ${isFalling ? 'falling' : ''}`}
        animate={{
          x: getXPosition(),
          y: isFalling ? '100vh' : '50%',
          scale: isFalling ? 0.5 : 1,
          rotate: isMoving ? 360 : 0
        }}
        transition={{
          x: { type: 'spring', stiffness: 100, damping: 15, duration: isMoving ? 0.8 : 0 },
          y: { duration: isFalling ? 1.5 : 0.3, ease: isFalling ? 'easeIn' : 'easeOut' },
          scale: { duration: 0.3 },
          rotate: { duration: isMoving ? 0.8 : 0, ease: 'linear' }
        }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: 'center'
        }}
      >
        <div className="ball-emoji">⚽</div>
      </motion.div>

      {/* Indicador de turno */}
      {!isFalling && (
        <motion.div 
          className="turn-indicator"
          style={{ 
            position: 'absolute',
            left: position === 'A' ? '10%' : '90%',
            top: '80%',
            transform: 'translateX(-50%)'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={`indicator-arrow ${position === 'A' ? 'team-a-indicator' : 'team-b-indicator'}`}>
            ↑ Turno del {position === 'A' ? 'Equipo A' : 'Equipo B'}
          </div>
        </motion.div>
      )}
    </div>
  );
}
