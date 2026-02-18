import { useEffect, useState } from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line
import './Timer.css';

export default function Timer({ seconds = 30, onTimeUp, onTick, isActive = true, resetKey = 0 }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  // Reset timer when resetKey changes
  useEffect(() => {
    setTimeLeft(seconds);
  }, [resetKey, seconds]);

  // Countdown
  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          onTimeUp?.();
          return 0;
        }
        const next = t - 1;
        if (next <= 5 && next > 0) {
          onTick?.();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onTimeUp, onTick]);

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
