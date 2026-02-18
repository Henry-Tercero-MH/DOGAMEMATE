import { motion } from 'framer-motion'; // eslint-disable-line
import './TugCharacters.css';

/**
 * Personajes PNG animados que jalan la cuerda.
 * Recibe las imágenes de cada jugador como props.
 */
export default function TugCharacters({
  position = 0,
  max = 5,
  player1Color = '#7C6BF0',
  player2Color = '#FF6B9D',
  pulling = null,
  player1Img,
  player2Img,
}) {
  const p1Effort = Math.max(0, -position) / max;
  const p2Effort = Math.max(0, position) / max;

  return (
    <div className="tug-characters">
      {/* Jugador 1 - Izquierda */}
      <motion.div
        className="tug-char tug-char-left"
        animate={{
          x: pulling === 0 ? [-8, 0, -8] : pulling === 1 ? [0, 4, 0] : 0,
          rotate: pulling === 0 ? [-8, -3, -8] : pulling === 1 ? [2, 5, 2] : 0,
        }}
        transition={{
          duration: pulling !== null ? 0.5 : 0.3,
          repeat: pulling !== null ? 2 : 0,
          ease: 'easeInOut',
        }}
      >
        <div className="char-img-wrapper" style={{ borderColor: player1Color }}>
          <motion.img
            src={player1Img}
            alt="Jugador 1"
            className="char-png"
            animate={pulling === 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.4, repeat: pulling === 0 ? 2 : 0 }}
          />
        </div>
        {p1Effort > 0 && (
          <div className="effort-indicator">
            {Array(Math.ceil(p1Effort * 3)).fill(null).map((_, i) => (
              <motion.span
                key={i}
                className="effort-spark"
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
              >
                {'💪'}
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Cuerda central entre personajes */}
      <div className="tug-rope-line">
        <motion.div
          className="rope-visual"
          animate={{
            x: (position / max) * 30,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="rope-segment-char">━━━━━━━━━━</div>
        </motion.div>
      </div>

      {/* Jugador 2 - Derecha */}
      <motion.div
        className="tug-char tug-char-right"
        animate={{
          x: pulling === 1 ? [8, 0, 8] : pulling === 0 ? [0, -4, 0] : 0,
          rotate: pulling === 1 ? [8, 3, 8] : pulling === 0 ? [-2, -5, -2] : 0,
        }}
        transition={{
          duration: pulling !== null ? 0.5 : 0.3,
          repeat: pulling !== null ? 2 : 0,
          ease: 'easeInOut',
        }}
      >
        <div className="char-img-wrapper flipped" style={{ borderColor: player2Color }}>
          <motion.img
            src={player2Img}
            alt="Jugador 2"
            className="char-png"
            animate={pulling === 1 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.4, repeat: pulling === 1 ? 2 : 0 }}
          />
        </div>
        {p2Effort > 0 && (
          <div className="effort-indicator">
            {Array(Math.ceil(p2Effort * 3)).fill(null).map((_, i) => (
              <motion.span
                key={i}
                className="effort-spark"
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
              >
                {'💪'}
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
