import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// Hook para tema
function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);
  return [theme, setTheme];
}
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line
import './MathGame.css';
import Rope from '../components/Rope';
import MathDisplay from '../components/MathDisplay';
import Timer from '../components/Timer';
import TugCharacters from '../components/TugCharacters';
import { generateProblem, DIFFICULTY_LABELS, getMaxDifficulty } from '../utils/mathProblems';
import useSoundEffects from '../hooks/useSoundEffects';
import NumericKeypad from '../components/NumericKeypad';

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
  const [theme, setTheme] = useTheme();
  // Estadísticas por jugador
  const [stats, setStats] = useState([
    { correct: 0, wrong: 0, maxStreak: 0, currentStreak: 0 },
    { correct: 0, wrong: 0, maxStreak: 0, currentStreak: 0 },
  ]);
  const [phase, setPhase] = useState('menu');
  const [menuStep, setMenuStep] = useState(1);
  const [stepDirection, setStepDirection] = useState(1);
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
  // Temporizador general de partida
  const [globalTimerEnabled, setGlobalTimerEnabled] = useState(false);
  const [globalTimerSeconds, setGlobalTimerSeconds] = useState(180);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(180);
  const [pulling, setPulling] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tabletMode, setTabletMode] = useState(false);
  const [gameDuration, setGameDuration] = useState(0); // 0 = libre
  const [gameTimeLeft, setGameTimeLeft] = useState(0);
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

  // Formatea segundos como MM:SS
  const formatGameTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Cuenta regresiva del temporizador de partida (por ronda)
  useEffect(() => {
    if (phase !== 'playing' || gameDuration === 0 || gameTimeLeft <= 0) return;
    const id = setInterval(() => {
      setGameTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, gameDuration, gameTimeLeft]);

  // Temporizador general de partida
  useEffect(() => {
    if (!globalTimerEnabled || phase !== 'playing' || globalTimeLeft <= 0) return;
    const id = setInterval(() => {
      setGlobalTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [globalTimerEnabled, phase, globalTimeLeft]);

  // Terminar partida cuando el tiempo general se acaba
  useEffect(() => {
    if (globalTimerEnabled && globalTimeLeft === 0 && phase === 'playing') {
      let winnerIndex;
      if (ropePos < 0) winnerIndex = 0;
      else if (ropePos > 0) winnerIndex = 1;
      else winnerIndex = players[0].score >= players[1].score ? 0 : 1;
      setWinner(winnerIndex);
      setPhase('finished');
      if (soundEnabled) sfx.playWin();
    }
  }, [globalTimerEnabled, globalTimeLeft, phase, ropePos, players, soundEnabled, sfx]);

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
    setGameTimeLeft(gameDuration);
    if (globalTimerEnabled) setGlobalTimeLeft(globalTimerSeconds);
    if (soundEnabled) sfx.playGameStart();
  };

  const processAnswer = useCallback((isCorrect) => {
    let newRopePos = ropePos;
    const newPlayers = players.map((p) => ({ ...p }));
    const newStats = stats.map((s) => ({ ...s }));

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
      // Estadísticas correctas
      newStats[turn].correct += 1;
      newStats[turn].currentStreak += 1;
      if (newStats[turn].currentStreak > newStats[turn].maxStreak) {
        newStats[turn].maxStreak = newStats[turn].currentStreak;
      }
    } else {
      newRopePos = ropePos + (turn === 0 ? 1 : -1);
      setStreak(0);
      setPulling((turn + 1) % 2);
      if (soundEnabled) {
        sfx.playWrong();
        setTimeout(() => sfx.playPull(), 300);
      }
      // Estadísticas incorrectas
      newStats[turn].wrong += 1;
      newStats[turn].currentStreak = 0;
    }

    setStats(newStats);
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
  }, [ropePos, players, turn, problem, soundEnabled, sfx, stats]);

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

  const handleKeypadSubmit = () => {
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
    setMenuStep(1);
    setStepDirection(1);
    setPlayers(initialPlayers);
    setTurn(0);
    setRopePos(0);
    setWinner(null);
    setRound(1);
    setStreak(0);
    setFeedback(null);
    setProblem(null);
    setPulling(null);
    setStats([
      { correct: 0, wrong: 0, maxStreak: 0, currentStreak: 0 },
      { correct: 0, wrong: 0, maxStreak: 0, currentStreak: 0 },
    ]);
  };

  // ─── MENU WIZARD ──────────────────────────────────────────
  const goNext = () => { setStepDirection(1); setMenuStep((s) => s + 1); };
  const goBack = () => { setStepDirection(-1); setMenuStep((s) => s - 1); };

  const stepVariants = {
    enter: (dir) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
  };

  if (phase === 'menu') {
    return (
      <div className="game-screen" ref={fullscreenRef} aria-label="Pantalla de menú principal">
        <div className="floating-shapes" aria-hidden="true">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>

        <motion.section
          className="menu-container glass-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          aria-label="Configuración de partida"
        >
          {/* ── Header compacto ── */}
          <div className="menu-header menu-header--compact">
            <motion.img
              src={imgMascota}
              alt="Mascota de MathBattle"
              className="menu-logo-img"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <h1 className="game-title">
              <span className="title-math">Math</span>
              <span className="title-battle">Battle</span>
            </h1>
            <p className="game-subtitle">Tira y Afloja Matemático</p>
          </div>

          {/* ── Step indicator ── */}
          <div className="wizard-steps">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`wizard-step-dot${menuStep === n ? ' active' : menuStep > n ? ' done' : ''}`}
              >
                {menuStep > n ? '✓' : n}
              </div>
            ))}
            <span className="wizard-step-label">
              {menuStep === 1 ? 'Jugadores' : menuStep === 2 ? 'Configuración' : '¡A Jugar!'}
            </span>
          </div>

          {/* ── Contenido animado ── */}
          <div className="wizard-content">
            <AnimatePresence mode="wait" custom={stepDirection}>

              {/* ─ PASO 1: Jugadores ─ */}
              {menuStep === 1 && (
                <motion.div
                  key="step1"
                  custom={stepDirection}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                >
                  <div className="menu-players-section" aria-label="Configuración de jugadores">
                    {players.map((p, i) => (
                      <div key={i} className="menu-player-card--v2" style={{ '--player-color': p.color }}>
                        <div className="player-card-top">
                          <div className="player-avatar-lg" style={{ borderColor: p.color }}>
                            <img
                              src={getAvatarSrc(p.avatarId)}
                              alt={`Avatar de ${p.name}`}
                              className="avatar-img-lg"
                            />
                          </div>
                          <div className="player-name-wrap">
                            <span className="player-number-badge" style={{ background: p.color }}>
                              J{i + 1}
                            </span>
                            <input
                              type="text"
                              placeholder={initialPlayers[i].name}
                              value={p.name === initialPlayers[i].name ? '' : p.name}
                              onChange={(e) => {
                                const updated = [...players];
                                updated[i] = { ...updated[i], name: e.target.value || initialPlayers[i].name };
                                setPlayers(updated);
                              }}
                              className="player-name-input player-name-input--v2"
                              aria-label={`Nombre del jugador ${i + 1}`}
                            />
                          </div>
                        </div>
                        <div className="avatar-picker avatar-picker--v2" aria-label="Selector de avatar">
                          {AVATARS.map((av) => (
                            <button
                              key={av.id}
                              className={`avatar-option avatar-option--v2${p.avatarId === av.id ? ' selected' : ''}`}
                              onClick={() => {
                                const updated = [...players];
                                updated[i] = { ...updated[i], avatarId: av.id };
                                setPlayers(updated);
                                if (soundEnabled) sfx.playClick();
                              }}
                              title={av.label}
                              aria-label={`Seleccionar avatar ${av.label}`}
                            >
                              <img src={av.src} alt={av.label} className="avatar-option-img" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="wizard-nav wizard-nav--end">
                    <motion.button
                      className="wizard-btn-next"
                      onClick={goNext}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Configurar →
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ─ PASO 2: Configuración ─ */}
              {menuStep === 2 && (
                <motion.div
                  key="step2"
                  custom={stepDirection}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                >
                  {/* Card Dificultad */}
                  <div className="wizard-card" aria-label="Nivel de dificultad">
                    <p className="wizard-card-title">🎯 Dificultad</p>
                    <input
                      type="range"
                      min={1}
                      max={getMaxDifficulty()}
                      value={difficulty}
                      onChange={(e) => setDifficulty(Number(e.target.value))}
                      className="difficulty-slider"
                      aria-valuenow={difficulty}
                      aria-valuemin={1}
                      aria-valuemax={getMaxDifficulty()}
                      aria-label="Selector de dificultad"
                    />
                    <div className="difficulty-bar">
                      {Array.from({ length: getMaxDifficulty() }, (_, i) => (
                        <div
                          key={i}
                          className={`difficulty-bar-segment${i < difficulty ? ' filled' : ''}`}
                          style={{ '--seg-idx': i, '--seg-total': getMaxDifficulty() }}
                        />
                      ))}
                    </div>
                    <div className="difficulty-info">
                      <span className="difficulty-number">{difficulty}</span>
                      <span className="difficulty-name">{DIFFICULTY_LABELS[difficulty - 1]}</span>
                    </div>
                  </div>

                  {/* Card Tiempo */}
                  <div className="wizard-card" aria-label="Opciones de tiempo">
                    <p className="wizard-card-title">⏱ Tiempo</p>
                    <div className="timer-toggle">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={timerEnabled}
                          onChange={(e) => setTimerEnabled(e.target.checked)}
                          className="toggle-checkbox"
                          aria-label="Activar temporizador por ronda"
                        />
                        <span className="toggle-switch" />
                        <span className="toggle-text">Temporizador por ronda</span>
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
                          {[5, 10, 15, 30, 45, 60].map((s) => (
                            <button
                              key={s}
                              className={`preset-btn${timerSeconds === s ? ' active' : ''}`}
                              onClick={() => setTimerSeconds(s)}
                              aria-label={`Seleccionar ${s} segundos`}
                            >
                              {s}s
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    <div className="timer-toggle" style={{ marginTop: 10 }}>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={globalTimerEnabled}
                          onChange={(e) => setGlobalTimerEnabled(e.target.checked)}
                          className="toggle-checkbox"
                          aria-label="Activar temporizador general"
                        />
                        <span className="toggle-switch" />
                        <span className="toggle-text">Temporizador general</span>
                      </label>
                      <span className="toggle-hint">Tiempo total de la partida</span>
                    </div>
                    {globalTimerEnabled && (
                      <div className="global-timer-row">
                        <label htmlFor="global-timer-input" className="global-timer-label">Duración:</label>
                        <input
                          id="global-timer-input"
                          type="number"
                          min={30}
                          max={900}
                          value={globalTimerSeconds}
                          onChange={(e) => setGlobalTimerSeconds(Number(e.target.value))}
                          className="global-timer-input"
                          aria-label="Segundos del temporizador general"
                        />
                        <span className="global-timer-unit">seg</span>
                      </div>
                    )}
                  </div>

                  {/* Card Extras */}
                  <div className="wizard-card" aria-label="Opciones extra">
                    <p className="wizard-card-title">⚙️ Extras</p>
                    <div className="timer-toggle">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={soundEnabled}
                          onChange={(e) => setSoundEnabled(e.target.checked)}
                          className="toggle-checkbox"
                          aria-label="Activar sonidos"
                        />
                        <span className="toggle-switch" />
                        <span className="toggle-text">Sonidos</span>
                      </label>
                    </div>
                    <div className="timer-toggle" style={{ marginTop: 10 }}>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={tabletMode}
                          onChange={(e) => setTabletMode(e.target.checked)}
                          className="toggle-checkbox"
                          aria-label="Activar teclado en pantalla"
                        />
                        <span className="toggle-switch" />
                        <span className="toggle-text">Teclado en Pantalla</span>
                      </label>
                      <span className="toggle-hint">Tablet / Primaria</span>
                    </div>
                  </div>

                  <div className="wizard-nav">
                    <button className="wizard-btn-back" onClick={goBack}>← Jugadores</button>
                    <motion.button
                      className="wizard-btn-next"
                      onClick={goNext}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      ¡Listo! →
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ─ PASO 3: ¡A Jugar! ─ */}
              {menuStep === 3 && (
                <motion.div
                  key="step3"
                  custom={stepDirection}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                >
                  <div className="vs-screen">
                    {players.map((p, i) => (
                      <div key={i} className="vs-player">
                        <div className="vs-avatar-lg" style={{ borderColor: p.color, boxShadow: `0 0 18px ${p.color}55` }}>
                          <img src={getAvatarSrc(p.avatarId)} alt={p.name} />
                        </div>
                        <span className="vs-player-name" style={{ color: p.color }}>{p.name}</span>
                      </div>
                    ))}
                    <div className="vs-divider">VS</div>
                  </div>

                  <div className="summary-chips">
                    <span className="summary-chip">🎯 {DIFFICULTY_LABELS[difficulty - 1]}</span>
                    {timerEnabled && <span className="summary-chip">⏱ {timerSeconds}s / ronda</span>}
                    {globalTimerEnabled && <span className="summary-chip">🕐 {globalTimerSeconds}s total</span>}
                    {soundEnabled && <span className="summary-chip">🔊 Sonido</span>}
                    {tabletMode && <span className="summary-chip">⌨️ Teclado</span>}
                  </div>

                  <motion.button
                    className="btn-start btn-start--glow"
                    onClick={startGame}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    aria-label="Comenzar la batalla matemática"
                  >
                    ⚔️ ¡Comenzar Batalla!
                  </motion.button>

                  <div className="wizard-nav wizard-nav--center">
                    <button className="wizard-btn-back" onClick={goBack}>← Ajustar config</button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.section>
      </div>
    );
  }

  // ─── GAME ─────────────────────────────────────────────────
  return (
    <div className="game-screen" ref={fullscreenRef} aria-label="Pantalla principal del juego">
      <div className="floating-shapes" aria-hidden="true">
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
            aria-hidden="true"
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

      {/* Top Bar Mejorada */}
      <header className="top-bar glass-card-sm" aria-label="Barra superior de información">
        {globalTimerEnabled && phase === 'playing' && (
          <div style={{marginRight:16,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontWeight:700,color:'var(--yellow-main)'}}>⏰</span>
            <span style={{fontWeight:700,color:'var(--yellow-main)'}}>{formatGameTime(globalTimeLeft)}</span>
          </div>
        )}
        <button
          className="sound-toggle-btn"
          style={{marginRight: 8}}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {theme === 'dark' ? '🌞' : '🌙'}
        </button>
        <div className="top-bar-left">
          <span className="badge" aria-label={`Dificultad: ${DIFFICULTY_LABELS[difficulty - 1]}`}>{DIFFICULTY_LABELS[difficulty - 1]}</span>
          <span className="round-counter" aria-label={`Ronda actual: ${round}`}>Ronda {round}</span>
          <button
            className="sound-toggle-btn"
            onClick={() => setSoundEnabled((s) => !s)}
            title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
            aria-label={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
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
              aria-label={`Racha de aciertos: ${streak}`}
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
              aria-label="Temporizador de ronda"
            />
          )}
        </div>
      </header>

      {/* Main Card Mejorada */}
      <motion.main className="game-container glass-card" layout aria-label="Zona principal de juego">
        {/* Players Header con mejor accesibilidad */}
        <nav className="players-header" aria-label="Jugadores">
          <AnimatePresence initial={false}>
            {players.map((p, i) => {
              // Medallas visuales por racha
              let medal = null;
              if (streak >= 3 && turn === i && phase === 'playing') {
                if (streak >= 7) {
                  medal = { icon: '🏆', label: '¡Racha legendaria!' };
                } else if (streak >= 5) {
                  medal = { icon: '🥇', label: '¡Gran racha!' };
                } else {
                  medal = { icon: '⭐', label: '¡Buena racha!' };
                }
              }
              return (
                <motion.div
                  key={i}
                  className={`player-card ${turn === i && phase === 'playing' ? 'active' : ''}`}
                  animate={turn === i ? { scale: 1.08 } : { scale: 1 }}
                  initial={{ opacity: 0, y: -30 }}
                  animate={{ opacity: 1, y: 0, scale: turn === i ? 1.08 : 1 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  tabIndex={0}
                  aria-label={`Jugador ${i + 1}: ${p.name}, puntaje: ${p.score}`}
                >
                  <motion.div
                    className="player-avatar-game"
                    animate={
                      feedback && turn === i
                        ? feedback.type === 'correct'
                          ? { rotate: [0, -10, 10, -5, 0], scale: [1, 1.18, 1] }
                          : { x: [0, -5, 5, -3, 0] }
                        : {}
                    }
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <img
                      src={getAvatarSrc(p.avatarId)}
                      alt={`Avatar de ${p.name}`}
                      className="player-avatar-img"
                    />
                    {/* Feedback overlay */}
                    {feedback && turn === i && (
                      <motion.div
                        className={`avatar-feedback-badge ${feedback.type}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        aria-label={feedback.type === 'correct' ? 'Respuesta correcta' : 'Respuesta incorrecta'}
                      >
                        {feedback.type === 'correct' ? '✓' : '✗'}
                      </motion.div>
                    )}
                    {/* Medalla visual */}
                    {medal && (
                      <motion.div
                        className="player-medal-badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        title={medal.label}
                        aria-label={medal.label}
                        style={{ position: 'absolute', top: -10, left: -10, fontSize: 28 }}
                      >
                        {medal.icon}
                      </motion.div>
                    )}
                  </motion.div>
                  <span className="player-name">{p.name}</span>
                  <div className="player-score-chip" style={{ background: p.color }}>
                    {p.score}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </nav>

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

        {/* Game Area Mejorada */}
        {phase === 'finished' ? (
          <motion.section
            className="winner-section"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            aria-label="Resultado de la partida"
          >
            <motion.img
              src={getAvatarSrc(players[winner].avatarId)}
              alt="Avatar del ganador"
              className="winner-avatar-img"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ rotate: [0, -5, 5, -3, 0], scale: [0, 1.1, 1], opacity: 1 }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
            />
            {/* Genio appears for winner celebration */}
            <motion.img
              src={imgGenio}
              alt="Genio celebrando"
              className="winner-genio-img"
              initial={{ opacity: 0, x: 60, scale: 0.7 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            />
            <h2 className="winner-text">
              ¡{players[winner].name} gana la batalla!
            </h2>
            <p className="winner-stats">
              Puntuación final: {players[0].score} - {players[1].score}
            </p>
            <div style={{display:'flex',justifyContent:'center',gap:24,margin:'24px 0'}}>
              {players.map((p,i)=>(
                <div key={i} style={{background:'var(--bg-card)',borderRadius:16,padding:'16px 20px',minWidth:140}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <img src={getAvatarSrc(p.avatarId)} alt={p.name} style={{width:36,height:36,borderRadius:'50%'}} />
                    <span style={{fontWeight:700,color:'var(--text-primary)'}}>{p.name}</span>
                  </div>
                  <div style={{fontSize:'0.98rem',color:'var(--text-secondary)'}}>
                    <div>✔️ Aciertos: <b>{stats[i].correct}</b></div>
                    <div>❌ Errores: <b>{stats[i].wrong}</b></div>
                    <div>🔥 Mejor racha: <b>{stats[i].maxStreak}</b></div>
                  </div>
                </div>
              ))}
            </div>
            <motion.button
              className="btn-restart"
              onClick={resetGame}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-label="Jugar de nuevo"
            >
              Jugar de Nuevo
            </motion.button>
          </motion.section>
        ) : (
          <>
            {/* Turn Indicator Mejorado */}
            <motion.div
              className="turn-indicator"
              key={turn}
              initial={{ opacity: 0, x: turn === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              aria-label={`Turno de ${currentPlayer.name}`}
            >
              <img
                src={getAvatarSrc(currentPlayer.avatarId)}
                alt={`Avatar de ${currentPlayer.name}`}
                className="turn-avatar-img"
              />
              <span>Turno de <strong>{currentPlayer.name}</strong></span>
            </motion.div>

            {/* Problem Card Mejorada */}
            {problem && (
              <motion.section
                className="problem-card"
                key={round}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                aria-label="Problema matemático"
              >
                {/* Professor gives the problem */}
                <div className="problem-header">
                  <img src={imgGenio2} alt="Profesor" className="professor-img" />
                  <div className="problem-header-text">
                    <span className="problem-category">{problem.category}</span>
                    {problem.prompt && <p className="problem-prompt">{problem.prompt}</p>}
                  </div>
                </div>

                <div className="problem-equation" tabIndex={0} aria-label="Ecuación a resolver">
                  <MathDisplay latex={problem.latex} displayMode />
                </div>

                {/* Number input */}
                {problem.inputType === 'number' && !feedback && (
                  tabletMode ? (
                    <NumericKeypad
                      value={input}
                      onChange={setInput}
                      onSubmit={handleKeypadSubmit}
                      aria-label="Teclado numérico en pantalla"
                    />
                  ) : (
                    <form onSubmit={handleSubmit} className="answer-form" aria-label="Formulario de respuesta">
                      <input
                        ref={inputRef}
                        type="number"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Tu respuesta..."
                        className="answer-input"
                        required
                        autoFocus
                        aria-label="Campo para ingresar respuesta"
                      />
                      <motion.button
                        type="submit"
                        className="btn-answer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        aria-label="Enviar respuesta"
                      >
                        Responder
                      </motion.button>
                    </form>
                  )
                )}

                {/* Multiple choice */}
                {problem.inputType === 'choice' && !feedback && problem.choices && (
                  <div className="choices-grid" aria-label="Opciones de respuesta">
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
                        aria-label={`Opción ${String.fromCharCode(65 + i)}`}
                      >
                        <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                        <MathDisplay latex={choice.latex} />
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Feedback Mejorado */}
                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      className={`feedback-card ${feedback.type}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      aria-live="polite"
                    >
                      <img
                        src={feedback.type === 'correct' ? imgGenio : imgGenio2}
                        alt={feedback.type === 'correct' ? '¡Correcto!' : 'Incorrecto'}
                        className="feedback-character-img"
                      />
                      <div className="feedback-text">
                        <strong>
                          {feedback.type === 'correct'
                            ? (
                                streak >= 3
                                  ? '¡Racha increíble! Sigue así 🚀'
                                  : ['¡Correcto! Eres un genio 🎉', '¡Bien hecho! 👏', '¡Excelente! Sigue así ⭐️'][Math.floor(Math.random()*3)]
                              )
                            : [
                                'Incorrecto, sigue intentando 💡',
                                'No te rindas, puedes lograrlo!',
                                '¡Ánimo! Intenta de nuevo'
                              ][Math.floor(Math.random()*3)]
                          }
                        </strong>
                        {feedback.type === 'wrong' && (
                          <span className="correct-answer">
                            Respuesta: <MathDisplay latex={feedback.correctAnswer} />
                          </span>
                        )}
                      </div>
                      {/* Micro-animación extra para feedback */}
                      {feedback.type === 'correct' && (
                        <motion.div
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: [0.7, 1.2, 1], opacity: [0, 1, 1] }}
                          transition={{ duration: 0.7 }}
                          style={{ color: '#FFD93D', fontWeight: 900, fontSize: '1.2rem', marginLeft: 8 }}
                          aria-hidden="true"
                        >
                          ✨
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )}
          </>
        )}
      </motion.main>
    </div>
  );
}
