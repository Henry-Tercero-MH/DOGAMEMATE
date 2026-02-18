import { useRef, useCallback } from 'react';

/**
 * Hook de efectos de sonido generados con Web Audio API.
 * No requiere archivos MP3 ni descargas externas.
 * Todos los sonidos se sintetizan en tiempo real.
 */
export default function useSoundEffects() {
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // ─── Utilidades de síntesis ────────────────────────────────

  const playTone = useCallback((freq, duration, type = 'sine', volume = 0.3) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [getCtx]);

  const playNoise = useCallback((duration, volume = 0.15) => {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }, [getCtx]);

  // ─── Efectos de sonido del juego ──────────────────────────

  /** Sonido al hacer click / seleccionar opción */
  const playClick = useCallback(() => {
    playTone(800, 0.08, 'sine', 0.15);
  }, [playTone]);

  /** Respuesta correcta - acorde ascendente alegre */
  const playCorrect = useCallback(() => {
    playTone(523, 0.15, 'sine', 0.25);       // C5
    setTimeout(() => playTone(659, 0.15, 'sine', 0.25), 80);  // E5
    setTimeout(() => playTone(784, 0.25, 'sine', 0.3), 160);  // G5
  }, [playTone]);

  /** Respuesta incorrecta - tono descendente triste */
  const playWrong = useCallback(() => {
    playTone(400, 0.2, 'sawtooth', 0.12);
    setTimeout(() => playTone(300, 0.3, 'sawtooth', 0.1), 150);
  }, [playTone]);

  /** Tiempo agotado - alarma rápida */
  const playTimeUp = useCallback(() => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => playTone(880, 0.1, 'square', 0.15), i * 120);
    }
  }, [playTone]);

  /** Tick del reloj (últimos 5 segundos) */
  const playTick = useCallback(() => {
    playTone(1200, 0.04, 'sine', 0.1);
  }, [playTone]);

  /** Jalar la cuerda - efecto de tensión */
  const playPull = useCallback(() => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(250, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    // Ruido de fricción
    setTimeout(() => playNoise(0.15, 0.08), 50);
  }, [getCtx, playNoise]);

  /** Victoria - fanfarria */
  const playWin = useCallback(() => {
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.25), i * 150);
    });
    // Acorde final
    setTimeout(() => {
      playTone(523, 0.6, 'sine', 0.2);
      playTone(659, 0.6, 'sine', 0.2);
      playTone(784, 0.6, 'sine', 0.2);
      playTone(1047, 0.6, 'sine', 0.2);
    }, 650);
  }, [playTone]);

  /** Inicio del juego - sonido de arranque */
  const playGameStart = useCallback(() => {
    playTone(440, 0.15, 'sine', 0.2);
    setTimeout(() => playTone(554, 0.15, 'sine', 0.2), 120);
    setTimeout(() => playTone(659, 0.2, 'sine', 0.25), 240);
  }, [playTone]);

  /** Cambio de turno */
  const playTurnChange = useCallback(() => {
    playTone(600, 0.1, 'triangle', 0.15);
    setTimeout(() => playTone(750, 0.1, 'triangle', 0.15), 80);
  }, [playTone]);

  /** Racha activa - power up */
  const playStreak = useCallback(() => {
    playTone(880, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(1100, 0.1, 'sine', 0.2), 60);
    setTimeout(() => playTone(1320, 0.15, 'sine', 0.25), 120);
  }, [playTone]);


  /** Hover / navegación menú */
  const playHover = useCallback(() => {
    playTone(1000, 0.04, 'sine', 0.06);
  }, [playTone]);

  /** Reproducir sonido de menú (mp3) */
  // Referencias para controlar la música
  const menuAudioRef = useRef(null);
  const battleAudioRef = useRef(null);

  /** Reproducir música de menú (mp3) */
  const playMenu = useCallback(() => {
    if (!menuAudioRef.current) {
      menuAudioRef.current = new Audio('/src/assets/menu.mp3');
      menuAudioRef.current.loop = true;
      menuAudioRef.current.volume = 0.5;
    }
    menuAudioRef.current.play();
  }, []);

  /** Pausar música de menú */
  const pauseMenu = useCallback(() => {
    if (menuAudioRef.current) menuAudioRef.current.pause();
  }, []);

  /** Reproducir música de batalla (mp3) */
  const playBattle = useCallback(() => {
    if (!battleAudioRef.current) {
      battleAudioRef.current = new Audio('/src/assets/batalla.mp3');
      battleAudioRef.current.loop = true;
      battleAudioRef.current.volume = 0.7;
    }
    battleAudioRef.current.play();
  }, []);

  /** Pausar música de batalla */
  const pauseBattle = useCallback(() => {
    if (battleAudioRef.current) battleAudioRef.current.pause();
  }, []);

  return {
    playClick,
    playCorrect,
    playWrong,
    playTimeUp,
    playTick,
    playPull,
    playWin,
    playGameStart,
    playTurnChange,
    playStreak,
    playHover,
    playMenu,
    pauseMenu,
    playBattle,
    pauseBattle,
  };
}
