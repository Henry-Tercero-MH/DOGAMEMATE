import { motion } from 'framer-motion';
import './Rope.css';

export default function Rope({ position = 0, max = 5, player1Color = '#7C6BF0', player2Color = '#FF6B9D' }) {
  const totalSteps = max * 2 + 1;
  const centerIndex = max;
  const markerIndex = centerIndex + position;
  const progressPercent = ((position + max) / (max * 2)) * 100;

  return (
    <div className="rope-wrapper">
      {/* Labels */}
      <div className="rope-labels">
        <span className="rope-label p1">J1</span>
        <span className="rope-label center">Centro</span>
        <span className="rope-label p2">J2</span>
      </div>

      {/* Progress track */}
      <div className="rope-track">
        <div className="rope-track-bg">
          {/* Player 1 zone */}
          <motion.div
            className="rope-zone p1-zone"
            animate={{ width: `${50 - (position / max) * 50}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ background: player1Color }}
          />
          {/* Player 2 zone */}
          <motion.div
            className="rope-zone p2-zone"
            animate={{ width: `${50 + (position / max) * 50}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ background: player2Color }}
          />
        </div>

        {/* Center marker */}
        <div className="rope-center-mark" />

        {/* Moving knot */}
        <motion.div
          className="rope-knot"
          animate={{ left: `${progressPercent}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="knot-inner">
            <span>🪢</span>
          </div>
        </motion.div>

        {/* Step indicators */}
        <div className="rope-steps">
          {Array(totalSteps).fill(null).map((_, i) => (
            <div
              key={i}
              className={`rope-step ${i === centerIndex ? 'center-step' : ''} ${i === markerIndex ? 'active-step' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Score indicators */}
      <div className="rope-score-bar">
        <div className="score-indicator p1-score">
          {Array(max).fill(null).map((_, i) => (
            <motion.div
              key={i}
              className={`score-dot ${position <= -(i + 1) ? 'filled' : ''}`}
              animate={position <= -(i + 1) ? { scale: [1, 1.3, 1] } : {}}
              style={{ background: position <= -(i + 1) ? player1Color : 'transparent', borderColor: player1Color }}
            />
          ))}
        </div>
        <div className="score-indicator p2-score">
          {Array(max).fill(null).map((_, i) => (
            <motion.div
              key={i}
              className={`score-dot ${position >= (i + 1) ? 'filled' : ''}`}
              animate={position >= (i + 1) ? { scale: [1, 1.3, 1] } : {}}
              style={{ background: position >= (i + 1) ? player2Color : 'transparent', borderColor: player2Color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
