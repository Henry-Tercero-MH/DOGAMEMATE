import { useEffect, useState } from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line
import './Timer.css';

export default function Timer({ seconds = 30, onTimeUp, onTick, onEveryTick, isActive = true, resetKey = 0 }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  // Reset timer when resetKey or seconds change
  useEffect(() => {
    setTimeLeft(seconds);
  }, [resetKey, seconds]);

  // Countdown — solo actualiza el número
  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Side effects por cambio de timeLeft (fuera del state updater)
  useEffect(() => {
    if (!isActive) return;
    if (timeLeft === 0) {
      onTimeUp?.();
    } else if (timeLeft < seconds) {
      // Tick suave cada segundo
      onEveryTick?.();
      // Tick urgente en los últimos 5 segundos
      if (timeLeft <= 5) onTick?.();
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = timeLeft / seconds;
  const isUrgent = timeLeft <= 5;
  const circumference = 2 * Math.PI * 38;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={`timer-container ${isUrgent ? 'urgent' : ''}`}>
      <svg className="timer-svg" viewBox="0 0 84 84">
        {/* Background circle */}
        <circle
          cx="42" cy="42" r="38"
          fill="none"
          stroke="rgba(167, 139, 250, 0.2)"
          strokeWidth="5"
        />
        {/* Progress circle */}
        <motion.circle
          cx="42" cy="42" r="38"
          fill="none"
          stroke={isUrgent ? '#FB7185' : progress > 0.5 ? '#A78BFA' : '#FBBF24'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 42 42)"
          animate={isUrgent ? { scale: [1, 1.03, 1] } : {}}
          transition={isUrgent ? { duration: 0.5, repeat: Infinity } : {}}
        />
      </svg>
      <div className="timer-text">
        <motion.span
          className="timer-number"
          key={timeLeft}
          initial={isUrgent ? { scale: 1.3 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {timeLeft}
        </motion.span>
        <span className="timer-label">seg</span>
      </div>
    </div>
  );
}
