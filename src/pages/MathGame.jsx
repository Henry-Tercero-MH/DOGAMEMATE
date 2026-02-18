import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line
import './MathGame.css';
import Rope from '../components/Rope';
import MathDisplay from '../components/MathDisplay';
import Timer from '../components/Timer';
import TugCharacters from '../components/TugCharacters';
import { generateProblem, DIFFICULTY_LABELS, getMaxDifficulty } from '../utils/mathProblems';
import useSoundEffects from '../hooks/useSoundEffects';

// Personajes PNG (fondo transparente)
import imgNino from '../assets/niño-removebg-preview.png';
import imgNina from '../assets/niña-removebg-preview.png';
import imgGenio from '../assets/GENIO-removebg-preview.png';
import imgGenio2 from '../assets/GENIO-removebg-preview (1).png';
import imgMascota from '../assets/MASCOTA-removebg-preview.png';

const MAX_ROPE = 5;
const DEFAULT_TIMER = 30;

// Avatares disponibles para seleccionar
const AVATARS = [
  { id: 'nino', src: imgNino, label: 'Niño' },
  { id: 'nina', src: imgNina, label: 'Niña' },
  { id: 'genio', src: imgGenio, label: 'Genio' },
  { id: 'genio2', src: imgGenio2, label: 'Genio 2' },
  { id: 'mascota', src: imgMascota, label: 'Mascota' },
];

const initialPlayers = [
  { name: 'Jugador 1', score: 0, color: '#7C6BF0', avatarId: 'nino' },
  { name: 'Jugador 2', score: 0, color: '#FF6B9D', avatarId: 'nina' },
];

function getAvatarSrc(avatarId) {
  return AVATARS.find((a) => a.id === avatarId)?.src || imgNino;
}

export default function MathGame() {
  const [phase, setPhase] = useState('menu');
  const [players, setPlayers] = useState(initialPlayers);
  const [turn, setTurn] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [ropePos, setRopePos] = useState(0);
  const [winner, setWinner] = useState(null);
  const [difficulty, setDifficulty] = useState(3);
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [pulling, setPulling] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef(null);
  const fullscreenRef = useRef(null);
  const sfx = useSoundEffects();

  // Sonido de menú al entrar en el menú
  useEffect(() => {
    if (!soundEnabled) {
      sfx.pauseMenu?.();
      sfx.pauseBattle?.();
    } else {
      if (phase === 'menu') {
        sfx.playMenu?.();
        sfx.pauseBattle?.();
      }
      if (phase === 'playing') {
        sfx.pauseMenu?.();
        sfx.playBattle?.();
      }
    }
  }, [phase, soundEnabled, sfx]);

  useEffect(() => {
    if (phase === 'playing' && !feedback) {
      setProblem(generateProblem(difficulty));
      setInput('');
      setSelectedChoice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, difficulty]);

  useEffect(() => {
    if (problem?.inputType === 'number' && inputRef.current && !feedback) {
      inputRef.current.focus();
    }
  }, [problem, feedback]);

  const currentPlayer = players[turn];

  const confettiPieces = useMemo(
    () =>
      Array(12)
        .fill(null)
        .map((_, i) => ({
          initialX: Math.random() * 400 - 200,
          animateX: Math.random() * 600 - 300,
          rotate: Math.random() * 720,
          color: ['#7C6BF0', '#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF'][i % 5],
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showConfetti],
  );

  const startGame = () => {
    setPlayers(initialPlayers.map((p, i) => ({
      ...p,
      name: players[i].name || p.name,
      avatarId: players[i].avatarId || p.avatarId,
    })));
    setPhase('playing');
    setRopePos(0);
    setWinner(null);
    setRound(1);
    setStreak(0);
    setFeedback(null);
    setPulling(null);
    setProblem(generateProblem(difficulty));
    if (soundEnabled) sfx.playGameStart();
  };

  const processAnswer = useCallback((isCorrect) => {
    let newRopePos = ropePos;
    const newPlayers = players.map((p) => ({ ...p }));

    if (isCorrect) {
      newPlayers[turn].score += 1;
      newRopePos = ropePos + (turn === 0 ? -1 : 1);
      setStreak((s) => {
        const next = s + 1;
        if (soundEnabled && next >= 3) sfx.playStreak();
        return next;
      });
      setPulling(turn);
      if (soundEnabled) {
        sfx.playCorrect();
        setTimeout(() => sfx.playPull(), 300);
      }
    } else {
      newRopePos = ropePos + (turn === 0 ? 1 : -1);
      setStreak(0);
      setPulling((turn + 1) % 2);
      if (soundEnabled) {
        sfx.playWrong();
        setTimeout(() => sfx.playPull(), 300);
      }
    }

    setPlayers(newPlayers);
    newRopePos = Math.max(-MAX_ROPE, Math.min(MAX_ROPE, newRopePos));
    setRopePos(newRopePos);

    setFeedback({
      type: isCorrect ? 'correct' : 'wrong',
      correctAnswer: problem?.answerLatex || '',
    });

    if (isCorrect) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1500);
    }

    if (newRopePos <= -MAX_ROPE) {
      setWinner(0);
      setPhase('finished');
      if (soundEnabled) sfx.playWin();
      return;
    }
    if (newRopePos >= MAX_ROPE) {
      setWinner(1);
      setPhase('finished');
      if (soundEnabled) sfx.playWin();
      return;
    }

    setTimeout(() => {
      setFeedback(null);
      setPulling(null);
      setTurn((t) => (t + 1) % 2);
      setRound((r) => r + 1);
      if (soundEnabled) sfx.playTurnChange();
    }, 2200);
  }, [ropePos, players, turn, problem, soundEnabled, sfx]);

  const handleAnswer = (answer, isCorrectChoice = null) => {
    if (feedback || winner !== null) return;
    let isCorrect;
    if (isCorrectChoice !== null) {
      isCorrect = isCorrectChoice;
    } else {
      isCorrect = answer.trim() === problem.answer;
    }
    processAnswer(isCorrect);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleAnswer(input);
  };

  const handleChoiceClick = (choice) => {
    if (feedback) return;
    if (soundEnabled) sfx.playClick();
    setSelectedChoice(choice);
    handleAnswer(null, choice.correct);
  };

  const handleTimeUp = useCallback(() => {
    if (feedback || winner !== null) return;
    if (soundEnabled) sfx.playTimeUp();
    processAnswer(false);
  }, [feedback, winner, processAnswer, soundEnabled, sfx]);

  const resetGame = () => {
    setPhase('menu');
    setPlayers(initialPlayers);
    setTurn(0);
    setRopePos(0);
    setWinner(null);
    setRound(1);
    setStreak(0);
    setFeedback(null);
    setProblem(null);
    setPulling(null);
  };

  // ─── MENU ─────────────────────────────────────────────────
  if (phase === 'menu') {
    return (
      <div className="game-screen" ref={fullscreenRef}>
        <div className="floating-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>

        <motion.div
          className="menu-container glass-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="menu-header">
            <motion.img
              src={imgMascota}
              alt="MathBattle Mascota"
              className="menu-logo-img"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <h1 className="game-title">
              <span className="title-math">Math</span>
              <span className="title-battle">Battle</span>
            </h1>
            <p className="game-subtitle">Tira y Afloja Matemático</p>
          </div>

          {/* Player Config with Avatar Selection */}
          <div className="menu-players-section">
            {players.map((p, i) => (
              <div key={i} className="menu-player-card">
                <div className="menu-player-input">
                  <div className="player-avatar-circle" style={{ background: p.color }}>
                    <img
                      src={getAvatarSrc(p.avatarId)}
                      alt={p.name}
                      className="avatar-img-sm"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={p.name}
                    value={p.name === initialPlayers[i].name ? '' : p.name}
                    onChange={(e) => {
                      const updated = [...players];
                      updated[i] = { ...updated[i], name: e.target.value || initialPlayers[i].name };
                      setPlayers(updated);
                    }}
                    className="player-name-input"
                  />
                </div>
                {/* Avatar picker */}
                <div className="avatar-picker">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      className={`avatar-option ${p.avatarId === av.id ? 'selected' : ''}`}
                      onClick={() => {
                        const updated = [...players];
                        updated[i] = { ...updated[i], avatarId: av.id };
                        setPlayers(updated);
                        if (soundEnabled) sfx.playClick();
                      }}
                      title={av.label}
                    >
                      <img src={av.src} alt={av.label} className="avatar-option-img" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Difficulty */}
          <div className="difficulty-section">
            <label className="difficulty-label">Nivel de Dificultad</label>
            <div className="difficulty-slider-wrap">
              <input
                type="range"
                min={1}
                max={getMaxDifficulty()}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="difficulty-slider"
              />
              <div className="difficulty-info">
                <span className="difficulty-number">{difficulty}</span>
                <span className="difficulty-name">{DIFFICULTY_LABELS[difficulty - 1]}</span>
              </div>
            </div>
          </div>

          {/* Game Options */}
          <div className="timer-config">
            <div className="timer-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={timerEnabled}
                  onChange={(e) => setTimerEnabled(e.target.checked)}
                  className="toggle-checkbox"
                />
                <span className="toggle-switch" />
                <span className="toggle-text">Temporizador</span>
              </label>
            </div>
            {timerEnabled && (
              <motion.div
                className="timer-seconds-config"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="timer-presets">
                  {[15, 30, 45, 60].map((s) => (
                    <button
                      key={s}
                      className={`preset-btn ${timerSeconds === s ? 'active' : ''}`}
                      onClick={() => setTimerSeconds(s)}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="timer-toggle" style={{ marginTop: 12 }}>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="toggle-checkbox"
                />
                <span className="toggle-switch" />
                <span className="toggle-text">Sonidos</span>
              </label>
            </div>
          </div>

          <motion.button
            className="btn-start"
            onClick={startGame}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Comenzar Batalla
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ─── GAME ─────────────────────────────────────────────────
  return (
    <div className="game-screen" ref={fullscreenRef}>
      <div className="floating-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            className="confetti-container"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {confettiPieces.map((piece, i) => (
              <motion.div
                key={i}
                className="confetti-piece"
                initial={{ y: -20, x: piece.initialX, rotate: 0, opacity: 1 }}
                animate={{ y: 400, x: piece.animateX, rotate: piece.rotate, opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{ background: piece.color }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="top-bar glass-card-sm">
        <div className="top-bar-left">
          <span className="badge">{DIFFICULTY_LABELS[difficulty - 1]}</span>
          <span className="round-counter">Ronda {round}</span>
          <button
            className="sound-toggle-btn"
            onClick={() => setSoundEnabled((s) => !s)}
            title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
        <div className="top-bar-right">
          {streak >= 2 && (
            <motion.div
              className="streak-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              key={streak}
            >
              {streak} racha
            </motion.div>
          )}
          {timerEnabled && phase === 'playing' && !feedback && (
            <Timer
              seconds={timerSeconds}
              onTimeUp={handleTimeUp}
              onTick={soundEnabled ? sfx.playTick : null}
              isActive={!feedback && winner === null}
              resetKey={round}
            />
          )}
        </div>
      </div>

      {/* Main Card */}
      <motion.div className="game-container glass-card" layout>
        {/* Players Header with PNG avatars */}
        <div className="players-header">
          {players.map((p, i) => (
            <motion.div
              key={i}
              className={`player-card ${turn === i && phase === 'playing' ? 'active' : ''}`}
              animate={turn === i ? { scale: 1.05 } : { scale: 1 }}
            >
              <motion.div
                className="player-avatar-game"
                animate={
                  feedback && turn === i
                    ? feedback.type === 'correct'
                      ? { rotate: [0, -10, 10, -5, 0], scale: [1, 1.15, 1] }
                      : { x: [0, -5, 5, -3, 0] }
                    : {}
                }
                transition={{ duration: 0.5 }}
              >
                <img
                  src={getAvatarSrc(p.avatarId)}
                  alt={p.name}
                  className="player-avatar-img"
                />
                {/* Feedback overlay */}
                {feedback && turn === i && (
                  <motion.div
                    className={`avatar-feedback-badge ${feedback.type}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    {feedback.type === 'correct' ? '✓' : '✗'}
                  </motion.div>
                )}
              </motion.div>
              <span className="player-name">{p.name}</span>
              <div className="player-score-chip" style={{ background: p.color }}>
                {p.score}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tug Characters pulling rope */}
        <TugCharacters
          position={ropePos}
          max={MAX_ROPE}
          player1Color={players[0].color}
          player2Color={players[1].color}
          pulling={pulling}
          player1Img={getAvatarSrc(players[0].avatarId)}
          player2Img={getAvatarSrc(players[1].avatarId)}
        />

        {/* Rope progress bar */}
        <Rope
          position={ropePos}
          max={MAX_ROPE}
          player1Color={players[0].color}
          player2Color={players[1].color}
        />

        {/* Game Area */}
        {phase === 'finished' ? (
          <motion.div
            className="winner-section"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.img
              src={getAvatarSrc(players[winner].avatarId)}
              alt="Ganador"
              className="winner-avatar-img"
              animate={{ rotate: [0, -5, 5, -3, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
            />
            {/* Genio appears for winner celebration */}
            <motion.img
              src={imgGenio}
              alt="Genio"
              className="winner-genio-img"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            />
            <h2 className="winner-text">
              {players[winner].name} gana la batalla!
            </h2>
            <p className="winner-stats">
              Puntuación final: {players[0].score} - {players[1].score}
            </p>
            <motion.button
              className="btn-restart"
              onClick={resetGame}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Jugar de Nuevo
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Turn Indicator */}
            <motion.div
              className="turn-indicator"
              key={turn}
              initial={{ opacity: 0, x: turn === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <img
                src={getAvatarSrc(currentPlayer.avatarId)}
                alt=""
                className="turn-avatar-img"
              />
              <span>Turno de <strong>{currentPlayer.name}</strong></span>
            </motion.div>

            {/* Problem Card */}
            {problem && (
              <motion.div
                className="problem-card"
                key={round}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Professor gives the problem */}
                <div className="problem-header">
                  <img src={imgGenio2} alt="Profesor" className="professor-img" />
                  <div className="problem-header-text">
                    <span className="problem-category">{problem.category}</span>
                    {problem.prompt && <p className="problem-prompt">{problem.prompt}</p>}
                  </div>
                </div>

                <div className="problem-equation">
                  <MathDisplay latex={problem.latex} displayMode />
                </div>

                {/* Number input */}
                {problem.inputType === 'number' && !feedback && (
                  <form onSubmit={handleSubmit} className="answer-form">
                    <input
                      ref={inputRef}
                      type="number"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Tu respuesta..."
                      className="answer-input"
                      required
                      autoFocus
                    />
                    <motion.button
                      type="submit"
                      className="btn-answer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Responder
                    </motion.button>
                  </form>
                )}

                {/* Multiple choice */}
                {problem.inputType === 'choice' && !feedback && problem.choices && (
                  <div className="choices-grid">
                    {problem.choices.map((choice, i) => (
                      <motion.button
                        key={i}
                        className={`choice-btn ${selectedChoice === choice ? 'selected' : ''}`}
                        onClick={() => handleChoiceClick(choice)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                        <MathDisplay latex={choice.latex} />
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Feedback */}
                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      className={`feedback-card ${feedback.type}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <img
                        src={feedback.type === 'correct' ? imgGenio : imgGenio2}
                        alt=""
                        className="feedback-character-img"
                      />
                      <div className="feedback-text">
                        <strong>
                          {feedback.type === 'correct' ? '¡Correcto! Eres un genio' : 'Incorrecto, sigue intentando'}
                        </strong>
                        {feedback.type === 'wrong' && (
                          <span className="correct-answer">
                            Respuesta: <MathDisplay latex={feedback.correctAnswer} />
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
