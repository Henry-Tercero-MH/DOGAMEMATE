import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { registerPlayer, createRoom, listPlayers, startGame as startGameAPI, getGameState, updateGameState, submitAnswer, savePlayerData } from '../utils/multiplayerAPI';
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
import Lobby from './Lobby';
import Ball from '../components/Ball';

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
  const [gameDuration, _setGameDuration] = useState(0); // 0 = libre
  const [gameTimeLeft, setGameTimeLeft] = useState(0);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false); // true si se unió vía QR
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('playerId') || '');
  const [isHost, setIsHost] = useState(false);
  const [teamId, setTeamId] = useState('A'); // Equipo del jugador ('A' o 'B')
  // Estado del balón para modo equipos
  const [ballPosition, setBallPosition] = useState('A'); // 'A' o 'B' - en qué equipo está el balón
  const [ballMoving, setBallMoving] = useState(false); // Si el balón está en movimiento
  const [ballFalling, setBallFalling] = useState(false); // Si el balón está cayendo
  const [teamScores, setTeamScores] = useState({ A: 0, B: 0 }); // Puntos por equipo
  const [gameStartTime, setGameStartTime] = useState(null); // Tiempo de inicio del juego
  const inputRef = useRef(null);
  const fullscreenRef = useRef(null);
  const sfx = useSoundEffects();

  // Detectar si la URL contiene un roomId para unirse automáticamente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('roomId');
    const urlTeamId = params.get('teamId'); // Detectar equipo del QR
    
    if (urlRoomId && !isMultiplayer && phase === 'menu') {
      console.log('🔗 Detectado roomId en URL:', urlRoomId, 'Equipo:', urlTeamId || 'A');
      setIsMultiplayer(true);
      setRoomId(urlRoomId);
      setIsJoiningRoom(true); // Marcamos que se está uniendo
      setIsHost(false); // Si se une vía URL, no es host
      setTeamId(urlTeamId || 'A'); // Asignar equipo del QR
      setPhase('lobby');
    }
  }, []); // Solo al montar el componente

  // Restaurar estado del juego desde localStorage al recargar
  useEffect(() => {
    const gameState = localStorage.getItem('gameState');
    if (gameState) {
      try {
        const { roomId: savedRoomId, playerId: savedPlayerId, isHost: savedIsHost, teamId: savedTeamId, phase: savedPhase } = JSON.parse(gameState);
        if (savedRoomId && savedPlayerId) {
          console.log('🔄 Restaurando estado del juego:', { savedRoomId, savedPlayerId, savedIsHost, savedTeamId });
          
          // Detectar si se está uniendo via URL/QR
          const urlParams = new URLSearchParams(window.location.search);
          const isJoiningViaURL = !!(urlParams.get('roomId') && urlParams.get('teamId'));
          
          console.log('👤 Determinando rol:', { isJoiningViaURL, savedIsHost, finalIsHost: isJoiningViaURL ? false : (savedIsHost || false) });
          
          setRoomId(savedRoomId);
          setPlayerId(savedPlayerId);
          // CRUCIAL: Si se une via URL/QR, NUNCA debe ser anfitrión, ignore localStorage
          setIsHost(isJoiningViaURL ? false : (savedIsHost || false));
          setTeamId(savedTeamId || 'A');
          setIsMultiplayer(true);
          if (savedPhase === 'lobby' || savedPhase === 'playing') {
            setPhase(savedPhase);
          }
        }
      } catch (err) {
        console.error('Error restaurando estado:', err);
        localStorage.removeItem('gameState');
      }
    }
  }, []);

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

  // Registrar jugadores en la sala cuando se entra al lobby
  useEffect(() => {
    if (phase === 'lobby' && roomId && isMultiplayer && playerId) {
      console.log('📝 Registrando en sala:', { roomId, playerId, isHost, teamId });
      
      // Crear la sala (solo si es host)
      if (isHost) {
        createRoom(roomId, 'Sala de Matemáticas', 100)
          .then(() => console.log('✅ Sala creada exitosamente'))
          .catch(err => console.error('❌ Error creando sala:', err));
      }
      
      // Registrar al jugador actual con su equipo
      const currentPlayerData = players[0]; // Usamos el primer jugador como base
      registerPlayer(playerId, currentPlayerData.name, currentPlayerData.avatarId, roomId, teamId)
        .then(() => console.log('✅ Jugador registrado exitosamente en equipo:', teamId))
        .catch(err => console.error('❌ Error registrando jugador:', err));
    }
  }, [phase, roomId, isMultiplayer, playerId, isHost, teamId]);

  // Polling en el lobby para detectar cuando el host inicia el juego
  useEffect(() => {
    if (!isMultiplayer || phase !== 'lobby' || !roomId || isHost) return;

    const checkGameStart = async () => {
      try {
        const response = await getGameState(roomId);
        if (response.success && response.data) {
          const state = response.data;
          
          // Si el estado cambió a 'playing', iniciar el juego en este dispositivo
          if (state.status === 'playing') {
            console.log('🎮 El host ha iniciado el juego, cambiando a modo playing...');
            
            // Actualizar localStorage
            localStorage.setItem('gameState', JSON.stringify({
              roomId,
              playerId,
              isHost: false,
              teamId,
              phase: 'playing'
            }));
            
            // Generar un problema local (temporal hasta implementar sincronización)
            setProblem(generateProblem(difficulty));
            
            // Inicializar estado del balón
            setBallPosition(state.ballPosition || 'A');
            setTeamScores({ A: state.scoreTeamA || 0, B: state.scoreTeamB || 0 });
            
            // Cambiar a fase de juego
            setPhase('playing');
          }
        }
      } catch (err) {
        console.error('Error verificando inicio del juego:', err);
      }
    };

    // Verificar cada 2 segundos
    checkGameStart();
    const interval = setInterval(checkGameStart, 2000);

    return () => clearInterval(interval);
  }, [isMultiplayer, phase, roomId, isHost, playerId, teamId, difficulty]);

  // Polling en tiempo real para sincronizar estado del juego (multijugador)
  useEffect(() => {
    if (!isMultiplayer || phase !== 'playing' || !roomId) return;

    const syncGameState = async () => {
      try {
        const response = await getGameState(roomId);
        if (response.success && response.data) {
          const state = response.data;
          
          // Actualizar posición del balón y scores
          if (state.ballPosition !== ballPosition) {
            setBallPosition(state.ballPosition);
          }
          if (state.scoreTeamA !== teamScores.A || state.scoreTeamB !== teamScores.B) {
            setTeamScores({ A: state.scoreTeamA, B: state.scoreTeamB });
          }
          
          // Verificar si hay un ganador (solo si aún no se ha establecido)
          if ((state.scoreTeamA >= 5 || state.scoreTeamB >= 5) && winner === null) {
            const winningTeam = state.scoreTeamA >= 5 ? 'A' : 'B';
            
            // Guardar resultados del juego (solo el host)
            if (isHost && gameStartTime) {
              const endTime = new Date();
              const duration = Math.floor((endTime - gameStartTime) / 1000); // duración en segundos
              
              try {
                const playersResponse = await listPlayers(roomId);
                const totalPlayers = playersResponse.success ? playersResponse.data.length : 0;
                
                await savePlayerData(
                  roomId,
                  winningTeam,
                  state.scoreTeamA,
                  state.scoreTeamB,
                  totalPlayers,
                  gameStartTime,
                  duration
                );
                console.log('✅ Datos del juego guardados exitosamente');
              } catch (err) {
                console.error('❌ Error guardando datos del juego:', err);
              }
            }
            
            setWinner(winningTeam); // Actualizar estado del ganador
            alert(`🏆 ¡Equipo ${winningTeam} gana!`);
            setPhase('finished');
            if (soundEnabled) sfx.playWin();
          }
        }
      } catch (err) {
        console.error('Error sincronizando estado:', err);
      }
    };

    // Sincronizar cada 2 segundos
    syncGameState();
    const interval = setInterval(syncGameState, 2000);

    return () => clearInterval(interval);
  }, [isMultiplayer, phase, roomId, ballPosition, teamScores, soundEnabled, sfx, isHost, gameStartTime, winner]);

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

  const processAnswer = useCallback(async (isCorrect, userAnswer = '') => {
    // MODO MULTIJUGADOR CON EQUIPOS Y BALÓN
    if (isMultiplayer) {
      const currentTeam = ballPosition; // El equipo que tiene el balón
      const oppositeTeam = currentTeam === 'A' ? 'B' : 'A';
      
      // Mostrar feedback INMEDIATAMENTE (no esperar al Excel)
      setFeedback({ type: isCorrect ? 'correct' : 'wrong', correctAnswer: problem?.answerLatex || '' });
      
      if (isCorrect) {
        // Respuesta correcta: lanzar balón al otro equipo
        setBallMoving(true);
        if (soundEnabled) sfx.playCorrect();
        
        // Actualizar en la base de datos EN BACKGROUND (no bloquear UI)
        updateGameState(roomId, null, oppositeTeam, teamScores.A, teamScores.B, oppositeTeam)
          .catch(err => console.error('Error actualizando estado:', err));
        
        setTimeout(() => {
          setBallPosition(oppositeTeam);
          setBallMoving(false);
          setFeedback(null);
          setRound((r) => r + 1);
          if (soundEnabled) sfx.playPull();
        }, 800);
      } else {
        // Respuesta incorrecta: balón cae, punto para el otro equipo
        setBallFalling(true);
        if (soundEnabled) sfx.playWrong();
        
        const newScores = { ...teamScores };
        newScores[oppositeTeam] += 1;
        setTeamScores(newScores);
        
        // Actualizar en la base de datos EN BACKGROUND
        updateGameState(roomId, null, currentTeam, newScores.A, newScores.B, currentTeam)
          .catch(err => console.error('Error actualizando estado:', err));
        
        setTimeout(() => {
          setBallFalling(false);
          // El balón vuelve al equipo que falló
          setBallPosition(currentTeam);
          setFeedback(null);
          setRound((r) => r + 1);
        }, 2000);
        
        // Verificar victoria (primer equipo en llegar a 5 puntos)
        if (newScores[oppositeTeam] >= 5 && winner === null) {
          setTimeout(() => {
            setWinner(oppositeTeam); // Establecer ganador ANTES del alert
            alert(`¡Equipo ${oppositeTeam} gana!`);
            setPhase('finished');
            if (soundEnabled) sfx.playWin();
          }, 2200);
          return;
        }
      }
      
      // Guardar la respuesta en la base de datos EN BACKGROUND (fire-and-forget)
      // No usar await para no bloquear la UI
      const problemId = `prob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const playerName = players[0]?.name || 'Jugador';
      const points = isCorrect ? 1 : 0;
      
      submitAnswer(
        roomId,
        problemId,
        playerId,
        playerName,
        teamId,
        userAnswer,
        isCorrect,
        points
      ).then(() => {
        console.log('✅ Respuesta guardada en Excel:', { problemId, playerName, teamId, answer: userAnswer, isCorrect });
      }).catch(err => {
        console.error('❌ Error guardando respuesta:', err);
      });
      
      return; // Salir del callback en modo multijugador
    }
    
    // MODO LOCAL (tira y afloja tradicional)
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
      setPulling((turn + 1) % players.length);
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

    // Verificar victoria en modo local
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
      setTurn((t) => (t + 1) % players.length);
      setRound((r) => r + 1);
      if (soundEnabled) sfx.playTurnChange();
    }, 2200);
  }, [ropePos, players, turn, problem, soundEnabled, sfx, stats, isMultiplayer, ballPosition, teamScores, roomId, playerId, teamId]);

  const handleAnswer = (answer, isCorrectChoice = null) => {
    if (feedback || winner !== null) return; // Prevenir respuestas múltiples
    let isCorrect;
    let userAnswer = answer;
    
    if (isCorrectChoice !== null) {
      isCorrect = isCorrectChoice;
      // Si no hay respuesta de texto, usar el valor booleano como indicador
      userAnswer = answer || (isCorrect ? 'Correcto' : 'Incorrecto');
    } else {
      isCorrect = answer.trim() === problem.answer;
      userAnswer = answer;
    }
    
    processAnswer(isCorrect, userAnswer);
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
    // Pasar el latex de la opción como respuesta
    handleAnswer(choice.latex || '', choice.correct);
  };

  const handleChoiceSubmit = () => {
    if (selectedChoice === null || !problem || !problem.choices) return;
    const choice = problem.choices[selectedChoice];
    if (soundEnabled) sfx.playClick();
    handleAnswer(choice.latex, choice.correct);
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

  // Función para iniciar el juego (solo host)
  const handleStartGame = async () => {
    if (soundEnabled) sfx.playClick();
    
    try {
      // Cargar jugadores conectados del lobby
      const response = await listPlayers(roomId);
      const connectedPlayers = response.success ? response.data : [];
      
      if (!connectedPlayers || connectedPlayers.length === 0) {
        alert('No hay jugadores conectados. Espera a que se unan jugadores.');
        return;
      }
      
      // Generar primer problema
      const firstProblem = generateProblem(difficulty);
      const problemId = `prob_${Date.now()}`;
      
      // Llamar a API para iniciar el juego
      await startGameAPI(roomId, problemId, playerId);
      
      // Convertir jugadores del lobby al formato del juego
      const colors = ['#7C6BF0', '#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#F97316', '#EC4899', '#8B5CF6'];
      const gamePlayers = connectedPlayers.map((player, idx) => ({
        name: player.playerName || `Jugador ${idx + 1}`,
        score: 0,
        color: colors[idx % colors.length],
        avatarId: player.avatar || 'nino',
        playerId: player.playerId,
      }));
      
      // Actualizar jugadores y empezar el juego
      setPlayers(gamePlayers);
      setStats(gamePlayers.map(() => ({ correct: 0, wrong: 0, maxStreak: 0, currentStreak: 0 })));
      setProblem(firstProblem);
      
      // Inicializar estado del balón (empieza en equipo A)
      setBallPosition('A');
      setBallMoving(false);
      setBallFalling(false);
      setTeamScores({ A: 0, B: 0 });
      
      // Guardar tiempo de inicio del juego
      setGameStartTime(new Date());
      
      // Actualizar localStorage
      localStorage.setItem('gameState', JSON.stringify({
        roomId,
        playerId,
        isHost,
        teamId,
        phase: 'playing'
      }));
      
      setPhase('playing');
    } catch (err) {
      console.error('Error iniciando juego:', err);
      alert('Error al iniciar el juego. Intenta de nuevo.');
    }
  };

  const stepVariants = {
    enter: (dir) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
  };

  // ─── LOBBY (Sala de espera multijugador) ─────────────────
  if (phase === 'lobby') {
    return (
      <div className="game-screen" ref={fullscreenRef} aria-label="Sala de espera multijugador">
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
        >
          <Lobby 
            roomId={roomId} 
            isJoining={isJoiningRoom} 
            isHost={isHost}
            onStartGame={handleStartGame}
          />
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              className="wizard-btn-back"
              onClick={() => {
                // Limpiar estado al salir
                localStorage.removeItem('gameState');
                setPhase('menu');
                setMenuStep(1);
                setIsMultiplayer(false);
                setRoomId('');
                setIsHost(false);
              }}
            >
              ← Volver al Menú
            </button>
          </div>
        </motion.section>
      </div>
    );
  }

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
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`wizard-step-dot${menuStep === n ? ' active' : menuStep > n ? ' done' : ''}`}
              >
                {menuStep > n ? '✓' : n}
              </div>
            ))}
            <span className="wizard-step-label">
              {menuStep === 1 ? 'Modo de Juego' : menuStep === 2 ? 'Jugadores' : menuStep === 3 ? 'Configuración' : '¡A Jugar!'}
            </span>
          </div>

          {/* ── Contenido animado ── */}
          <div className="wizard-content">
            <AnimatePresence mode="wait" custom={stepDirection}>

              {/* ─ PASO 1: Modo de Juego ─ */}
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
                  <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                    <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: '#fff' }}>Selecciona el modo de juego</h2>
                    <p style={{ color: '#aaa', marginBottom: '1.5rem', fontSize: '0.9rem' }}>¿Cómo quieres jugar?</p>
                    
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '500px', margin: '0 auto' }}>
                      <motion.div
                        className={`mode-card ${!isMultiplayer ? 'selected' : ''}`}
                        onClick={() => {
                          setIsMultiplayer(false);
                          if (soundEnabled) sfx.playClick();
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          padding: '1.2rem 1.5rem',
                          background: !isMultiplayer ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.05)',
                          border: !isMultiplayer ? '3px solid #667eea' : '2px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          minWidth: '200px',
                          flex: 1,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎮</div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Modo Local</h3>
                        <p style={{ fontSize: '0.8rem', color: !isMultiplayer ? '#fff' : '#888', opacity: 0.9 }}>Dos jugadores, mismo dispositivo</p>
                      </motion.div>

                      <motion.div
                        className={`mode-card ${isMultiplayer ? 'selected' : ''}`}
                        onClick={() => {
                          setIsMultiplayer(true);
                          if (soundEnabled) sfx.playClick();
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          padding: '1.2rem 1.5rem',
                          background: isMultiplayer ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.05)',
                          border: isMultiplayer ? '3px solid #667eea' : '2px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          minWidth: '200px',
                          flex: 1,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌐</div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Multijugador</h3>
                        <p style={{ fontSize: '0.8rem', color: isMultiplayer ? '#fff' : '#888', opacity: 0.9 }}>En línea con otros jugadores</p>
                      </motion.div>
                    </div>
                  </div>
                  
                  <div className="wizard-nav wizard-nav--end">
                    <motion.button
                      className="wizard-btn-next"
                      onClick={() => {
                        if (isMultiplayer) {
                          // Si es multijugador, crear sala e ir directo al lobby
                          const newRoomId = 'room_' + Date.now();
                          const newPlayerId = playerId || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                          
                          setRoomId(newRoomId);
                          setPlayerId(newPlayerId);
                          setIsHost(true); // El que crea la sala es el anfitrión
                          setIsJoiningRoom(false); // No se está uniendo, está creando
                          
                          // Guardar en localStorage para persistencia
                          localStorage.setItem('playerId', newPlayerId);
                          localStorage.setItem('gameState', JSON.stringify({
                            roomId: newRoomId,
                            playerId: newPlayerId,
                            isHost: true,
                            teamId: 'A', // Host no tiene equipo específico
                            phase: 'lobby'
                          }));
                          
                          setPhase('lobby');
                          if (soundEnabled) sfx.playClick();
                        } else {
                          // Si es local, seguir al siguiente paso
                          goNext();
                        }
                      }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isMultiplayer ? '🌐 Crear Sala →' : 'Continuar →'}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ─ PASO 2: Jugadores ─ */}
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
                  <div className="wizard-nav">
                    <button className="wizard-btn-back" onClick={goBack}>← Modo</button>
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

              {/* ─ PASO 3: Configuración ─ */}
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

              {/* ─ PASO 4: ¡A Jugar! ─ */}
              {menuStep === 4 && (
                <motion.div
                  key="step4"
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
                    <span className="summary-chip">{isMultiplayer ? '🌐 Multijugador' : '🎮 Local'}</span>
                    <span className="summary-chip">🎯 {DIFFICULTY_LABELS[difficulty - 1]}</span>
                    {timerEnabled && <span className="summary-chip">⏱ {timerSeconds}s / ronda</span>}
                    {globalTimerEnabled && <span className="summary-chip">🕐 {globalTimerSeconds}s total</span>}
                    {soundEnabled && <span className="summary-chip">🔊 Sonido</span>}
                    {tabletMode && <span className="summary-chip">⌨️ Teclado</span>}
                  </div>

                  <motion.button
                    className="btn-start btn-start--glow"
                    onClick={() => {
                      if (isMultiplayer) {
                        const newRoomId = 'room_' + Date.now();
                        setRoomId(newRoomId);
                        setPhase('lobby');
                      } else {
                        startGame();
                      }
                      if (soundEnabled) sfx.playClick();
                    }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    aria-label="Comenzar la batalla matemática"
                  >
                    {isMultiplayer ? '🌐 Crear Sala' : '⚔️ ¡Comenzar Batalla!'}
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
        {isMultiplayer && phase === 'playing' && (
          <div style={{marginRight:16,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontWeight:700,color:'var(--purple-main)'}}>🎯</span>
            <span style={{fontWeight:600,color:'var(--text-primary)',fontSize:'0.9rem'}}>Meta: 10 puntos</span>
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
        {isMultiplayer && phase === 'playing' && (
          <button
            className="wizard-btn-back"
            style={{
              marginRight: 8,
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444'
            }}
            onClick={() => {
              if (confirm('¿Estás seguro de que quieres abandonar la partida?')) {
                // Limpiar estado y volver al menú
                localStorage.removeItem('gameState');
                setPhase('menu');
                setMenuStep(1);
                setIsMultiplayer(false);
                setRoomId('');
                setIsHost(false);
                setIsJoiningRoom(false);
                if (soundEnabled) sfx.playClick();
              }
            }}
            title="Abandonar partida"
            aria-label="Abandonar partida"
          >
            🚪 Abandonar
          </button>
        )}
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
                  initial={{ opacity: 0, y: -30 }}
                  animate={{ opacity: 1, y: 0, scale: turn === i ? 1.08 : 1 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  tabIndex={0}
                  aria-label={`Jugador ${i + 1}: ${p.name}, puntaje: ${p.score}`}
                >
                  <motion.div
                    className="player-avatar-game"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={
                      feedback && turn === i
                        ? feedback.type === 'correct'
                          ? { rotate: [0, -10, 10, -5, 0], scale: [1, 1.18, 1], opacity: 1 }
                          : { x: [0, -5, 5, -3, 0], scale: 1, opacity: 1 }
                        : { scale: 1, opacity: 1 }
                    }
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

        {/* Balón animado - Solo en modo multijugador */}
        {isMultiplayer && (
          <Ball 
            position={ballPosition} 
            isMoving={ballMoving} 
            isFalling={ballFalling}
          />
        )}

        {/* Marcador de equipos en modo multijugador */}
        {isMultiplayer && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '3rem', 
            margin: '1rem 0',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            <div style={{ color: '#FF6B9D' }}>
              🔴 Equipo A: {teamScores.A}
            </div>
            <div style={{ color: '#7C6BF0' }}>
              🔵 Equipo B: {teamScores.B}
            </div>
          </div>
        )}

        {/* Tug Characters pulling rope - Solo en modo local (2 jugadores) */}
        {!isMultiplayer && players.length === 2 && (
          <>
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
          </>
        )}

        {/* Game Area Mejorada */}
        {phase === 'finished' ? (
          <motion.section
            className="winner-section"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            aria-label="Resultado de la partida"
          >
            {/* Mostrar diferentes pantallas de ganador según el modo */}
            {isMultiplayer ? (
              /* Modo Multijugador - Mostrar equipo ganador */
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  style={{
                    fontSize: '8rem',
                    marginBottom: '1rem'
                  }}
                >
                  {winner === 'A' ? '🔴' : '🔵'}
                </motion.div>
                <motion.img
                  src={imgGenio}
                  alt="Genio celebrando"
                  className="winner-genio-img"
                  initial={{ opacity: 0, x: 60, scale: 0.7 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                />
                <h2 className="winner-text" style={{ color: winner === 'A' ? '#FF6B9D' : '#7C6BF0' }}>
                  ¡Equipo {winner} gana la batalla!
                </h2>
                <p className="winner-stats" style={{ fontSize: '1.3rem', marginTop: '1rem' }}>
                  Puntuación final: <span style={{ color: '#FF6B9D' }}>Equipo A: {teamScores.A}</span> - <span style={{ color: '#7C6BF0' }}>Equipo B: {teamScores.B}</span>
                </p>
              </>
            ) : (
              /* Modo Local - Mostrar jugador ganador */
              winner !== null && typeof winner === 'number' && players[winner] ? (
                <>
                  <motion.img
                    src={getAvatarSrc(players[winner].avatarId)}
                    alt="Avatar del ganador"
                    className="winner-avatar-img"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ rotate: [0, -5, 5, -3, 0], scale: [0, 1.1, 1], opacity: 1 }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                  />
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
                </>
              ) : (
                /* Fallback si hay error con winner */
                <>
                  <motion.img
                    src={imgGenio}
                    alt="Genio celebrando"
                    className="winner-genio-img"
                  />
                  <h2 className="winner-text">
                    ¡Juego terminado!
                  </h2>
                  <p className="winner-stats">
                    Revisa los resultados arriba
                  </p>
                </>
              )
            )}
            {/* Estadísticas solo en modo local */}
            {!isMultiplayer && (
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
            )}
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
            {/* VISTA SEPARADA PARA MULTIJUGADOR */}
            {isMultiplayer ? (
              <>
                {/* VISTA DEL ANFITRIÓN - Solo ve el dashboard */}
                {isHost ? (
                  <motion.section
                    className="host-dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      maxWidth: '900px',
                      margin: '0 auto'
                    }}
                  >
                    <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>
                      🎮 Dashboard del Anfitrión
                    </h2>
                    <p style={{ color: '#aaa', marginBottom: '2rem' }}>
                      Los jugadores están respondiendo desde sus dispositivos
                    </p>
                    
                    {/* Mostrar el problema actual (solo la ecuación, sin opciones) */}
                    {problem && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                          border: '2px solid rgba(102, 126, 234, 0.3)',
                          borderRadius: '20px',
                          padding: '2rem',
                          marginBottom: '2rem',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ marginBottom: '1rem', color: '#aaa', fontSize: '0.9rem' }}>
                          {problem.category}
                        </div>
                        {problem.prompt && (
                          <p style={{ marginBottom: '1.5rem', fontSize: '1rem', color: '#ccc' }}>
                            {problem.prompt}
                          </p>
                        )}
                        <div style={{ fontSize: '2.5rem', padding: '1.5rem 0' }}>
                          <MathDisplay latex={problem.latex} displayMode />
                        </div>
                        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#888', fontStyle: 'italic' }}>
                          ⏳ Esperando respuestas de los jugadores...
                        </p>
                      </motion.div>
                    )}
                    
                    {/* Lista de jugadores por equipo */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '2rem',
                      marginBottom: '2rem'
                    }}>
                      {/* Jugadores Equipo A */}
                      <div style={{
                        background: 'rgba(255,107,157,0.1)',
                        border: '2px solid rgba(255,107,157,0.3)',
                        borderRadius: '16px',
                        padding: '1.5rem'
                      }}>
                        <h3 style={{ color: '#FF6B9D', marginBottom: '1rem' }}>🔴 Equipo A</h3>
                        <p style={{ fontSize: '0.9rem', color: '#aaa' }}>Esperando respuesta...</p>
                      </div>
                      
                      {/* Jugadores Equipo B */}
                      <div style={{
                        background: 'rgba(124,107,240,0.1)',
                        border: '2px solid rgba(124,107,240,0.3)',
                        borderRadius: '16px',
                        padding: '1.5rem'
                      }}>
                        <h3 style={{ color: '#7C6BF0', marginBottom: '1rem' }}>🔵 Equipo B</h3>
                        <p style={{ fontSize: '0.9rem', color: '#aaa' }}>Esperando respuesta...</p>
                      </div>
                    </div>
                  </motion.section>
                ) : (
                  /* VISTA DEL JUGADOR - Ve el problema y puede responder */
                  <>
                    {/* Badge del equipo más grande y visible */}
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                        padding: '1rem 1.5rem',
                        background: teamId === 'A' ? 'linear-gradient(135deg, rgba(255,107,157,0.3) 0%, rgba(255,107,157,0.1) 100%)' : 'linear-gradient(135deg, rgba(124,107,240,0.3) 0%, rgba(124,107,240,0.1) 100%)',
                        border: `3px solid ${teamId === 'A' ? '#FF6B9D' : '#7C6BF0'}`,
                        borderRadius: '16px',
                        fontSize: '1.8rem',
                        fontWeight: 'bold',
                        color: teamId === 'A' ? '#FF6B9D' : '#7C6BF0',
                        boxShadow: `0 8px 24px ${teamId === 'A' ? 'rgba(255,107,157,0.3)' : 'rgba(124,107,240,0.3)'}`
                      }}
                    >
                      {teamId === 'A' ? '🔴 Equipo A' : '🔵 Equipo B'}
                    </motion.div>

                    {/* Scoreboard visible para el jugador */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      gap: '2rem', 
                      marginBottom: '2rem',
                      fontSize: '1.5rem',
                      fontWeight: 'bold'
                    }}>
                      <div style={{ color: '#FF6B9D' }}>
                        🔴 {teamScores.A}
                      </div>
                      <div style={{ color: '#7C6BF0' }}>
                        🔵 {teamScores.B}
                      </div>
                    </div>

                    {/* Problem Card para Jugador - Simplificado y más grande */}
                    {problem && (
                      <motion.section
                        key={round}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          background: 'var(--bg-card)',
                          borderRadius: '20px',
                          padding: '2rem 1.5rem',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                          border: '2px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        {/* Ecuación más grande y centrada */}
                        <div style={{ 
                          textAlign: 'center',
                          marginBottom: '2rem',
                          fontSize: '2rem',
                          padding: '1.5rem',
                          background: 'rgba(102, 126, 234, 0.1)',
                          borderRadius: '12px',
                          minHeight: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <MathDisplay latex={problem.latex} displayMode />
                        </div>

                        {/* Number input - Teclado más grande */}
                        {problem.inputType === 'number' && !feedback && (
                          <div style={{ marginTop: '1.5rem' }}>
                            <NumericKeypad
                              value={input}
                              onChange={setInput}
                              onSubmit={handleKeypadSubmit}
                              aria-label="Teclado numérico en pantalla"
                            />
                          </div>
                        )}

                        {/* Multiple choice - Botones optimizados para móvil */}
                        {problem.inputType === 'choice' && !feedback && (
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.8rem',
                            marginTop: '1rem',
                            padding: '0 0.5rem'
                          }}>
                            {problem.choices.map((choice, idx) => (
                              <motion.button
                                key={idx}
                                onClick={() => handleChoiceClick(choice)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                  padding: '1rem 1.2rem',
                                  fontSize: '1.1rem',
                                  background: selectedChoice === idx ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.05)',
                                  border: `3px solid ${selectedChoice === idx ? '#667eea' : 'rgba(255,255,255,0.1)'}`,
                                  borderRadius: '12px',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  minHeight: '60px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textAlign: 'center',
                                  width: '100%',
                                  maxWidth: '100%'
                                }}
                              >
                                <MathDisplay latex={choice.latex} />
                              </motion.button>
                            ))}
                          </div>
                        )}

                        {/* Feedback más grande y visible */}
                        {feedback && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                              marginTop: '2rem',
                              padding: '2rem',
                              background: feedback.type === 'correct' 
                                ? 'linear-gradient(135deg, rgba(107, 203, 119, 0.2) 0%, rgba(107, 203, 119, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)',
                              border: `3px solid ${feedback.type === 'correct' ? '#6BCB77' : '#ef4444'}`,
                              borderRadius: '16px',
                              textAlign: 'center',
                              fontSize: '1.5rem',
                              fontWeight: 'bold',
                              color: feedback.type === 'correct' ? '#6BCB77' : '#ef4444'
                            }}
                          >
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                              {feedback.type === 'correct' ? '🎉' : '😅'}
                            </div>
                            <div>
                              {feedback.type === 'correct' ? (
                                <span>¡Correcto! 🎊</span>
                              ) : (
                                <>
                                  <p style={{ marginBottom: '1rem' }}>No es correcto</p>
                                  <div style={{ 
                                    fontSize: '1.2rem',
                                    padding: '1rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '8px'
                                  }}>
                                    Respuesta: <MathDisplay latex={feedback.correctAnswer} />
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.section>
                    )}
                  </>
                )}
              </>
            ) : (
              /* VISTA MODO LOCAL (sin cambios) */
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
          </>
        )}
      </motion.main>
    </div>
  );
}
