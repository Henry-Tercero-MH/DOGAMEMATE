import { motion } from 'framer-motion'; // eslint-disable-line
import './NumericKeypad.css';

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '⌫'];

export default function NumericKeypad({ value, onChange, onSubmit }) {
  const handlePress = (key) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (key === '-') {
      if (value === '' || value === undefined) {
        onChange('-');
      } else if (value.startsWith('-')) {
        onChange(value.slice(1));
      }
    } else {
      if (value.length < 6) {
        onChange(value + key);
      }
    }
  };

  const canSubmit = value && value !== '-' && value.length > 0;

  return (
    <div className="numeric-keypad">
      {/* Pantalla de display */}
      <div className="keypad-display">
        {value ? (
          <span className="keypad-display-value">{value}</span>
        ) : (
          <span className="keypad-placeholder">_ _ _</span>
        )}
      </div>

      {/* Grid de teclas */}
      <div className="keypad-grid">
        {KEYS.map((key) => (
          <motion.button
            key={key}
            type="button"
            className={`keypad-btn${key === '⌫' ? ' keypad-delete' : ''}${key === '-' ? ' keypad-minus' : ''}`}
            onClick={() => handlePress(key)}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.06 }}
          >
            {key}
          </motion.button>
        ))}
      </div>

      {/* Botón responder */}
      <motion.button
        type="button"
        className="keypad-submit-btn"
        onClick={onSubmit}
        disabled={!canSubmit}
        whileTap={canSubmit ? { scale: 0.96 } : {}}
        whileHover={canSubmit ? { scale: 1.02 } : {}}
      >
        ✓ Responder
      </motion.button>
    </div>
  );
}
