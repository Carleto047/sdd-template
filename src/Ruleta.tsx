import { useState, useEffect, useRef } from 'react';
import { Wheel } from 'react-custom-roulette';
import confetti from 'canvas-confetti';
import Multijugador from './Multijugador';
import { obtenerPregunta, despertarServidor } from './servicioPreguntas';
import type { EstadoServidor } from './servicioPreguntas';

const VIDAS_INICIALES = 3;
const MINUTOS_BLOQUEO = 20;
const CLAVE_BLOQUEO = 'preguntados_bloqueo_hasta';
const CLAVE_RECORD = 'preguntados_record';

// URL del backend desplegado en Render
const API_BASE_URL = 'https://preguntados-backend-ppdb.onrender.com';

const PISTAS_MUSICA = ['/sounds/musica1.wav'];
const SONIDOS_GIRO = ['/sounds/giro-1.wav', '/sounds/giro-2.wav'];
const SONIDOS_CORRECTO = ['/sounds/correcto-1.wav', '/sounds/correcto-2.wav', '/sounds/correcto-3.wav'];
const SONIDOS_INCORRECTO = ['/sounds/incorrecto-1.wav', '/sounds/incorrecto-2.wav', '/sounds/incorrecto-3.wav', '/sounds/incorrecto-4.wav'];
const SONIDOS_TIEMPO_AGOTADO = ['/sounds/tiempo-agotado-1.wav', '/sounds/tiempo-agotado-2.wav'];
const SONIDOS_PERDER = ['/sounds/perder-1.wav', '/sounds/perder-2.wav'];
const SONIDO_COMODIN = '/sounds/comodin-disponible.wav';
const SONIDO_TIC = '/sounds/tiempo-restante.wav';
const SONIDO_VICTORIA = '/sounds/correcto-1.wav';

const reproducirAleatorio = (lista: string[]) => {
  if (lista.length === 0) return;
  const archivo = lista[Math.floor(Math.random() * lista.length)];
  new Audio(archivo).play().catch(() => {});
};

const reproducir = (ruta: string) => {
  new Audio(ruta).play().catch(() => {});
};

const data = [
  { option: '🌍 Geografía', style: { backgroundColor: '#ff5252', textColor: 'white' } },
  { option: '🔬 Ciencia', style: { backgroundColor: '#4caf50', textColor: 'white' } },
  { option: '📜 Historia', style: { backgroundColor: '#ffeb3b', textColor: '#212121' } },
  { option: '🎨 Arte', style: { backgroundColor: '#ab47bc', textColor: 'white' } },
  { option: '⚽ Deportes', style: { backgroundColor: '#ff9800', textColor: 'white' } },
  { option: '🎬 Entretenimiento', style: { backgroundColor: '#29b6f6', textColor: 'white' } },
  { option: '🎓 IESETyFP', style: { backgroundColor: '#26a69a', textColor: 'white' } },
];

const CATEGORIAS = ['Geografía', 'Ciencia', 'Historia', 'Arte', 'Deportes', 'Entretenimiento', 'IESETyFP'];

const STICKERS_CATEGORIA: Record<string, string> = {
  'Geografía': '🌍',
  'Ciencia': '🔬',
  'Historia': '📜',
  'Arte': '🎨',
  'Deportes': '⚽',
  'Entretenimiento': '🎬',
  'IESETyFP': '🎓'
};

type Modo = 'solo' | 'duelo' | 'desafio' | 'online';

export default function Ruleta() {
  const [modo, setModo] = useState<Modo>(() => {
    const parametros = new URLSearchParams(window.location.search);

    return (
      parametros.has('sala') ||
      parametros.has('desafio')
    )
      ? 'online'
      : 'solo';
  });

  // --- Estado compartido ---
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [pregunta, setPregunta] = useState<any>(null);
  const [opcionesMezcladas, setOpcionesMezcladas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'correcto' | 'incorrecto' | null, msg: string }>({ tipo: null, msg: '' });
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<string | null>(null);
  const [tiempoInicio, setTiempoInicio] = useState<number | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState<number>(30);
  const [timerActivo, setTimerActivo] = useState<boolean>(false);
  const [opcionesOcultas, setOpcionesOcultas] = useState<string[]>([]);
  const preguntasRecientesRef = useRef<number[]>([]);
  const ticReproducidoRef = useRef<boolean>(false);
  const origenPreguntaRef = useRef<'servidor' | 'local'>('servidor');
  const tarjetaPreguntaRef = useRef<HTMLDivElement | null>(null);
  const [estadoServidor, setEstadoServidor] = useState<EstadoServidor>('conectando');
  const [errorCarga, setErrorCarga] = useState<string>('');

  // --- Estado 1 Jugador ---
  const [rachaCorrectas, setRachaCorrectas] = useState<number>(0);
  const [rachaIncorrectas, setRachaIncorrectas] = useState<number>(0);
  const [vidas, setVidas] = useState<number>(VIDAS_INICIALES);
  const [puntaje, setPuntaje] = useState<number>(0);
  const [record, setRecord] = useState<number>(0);
  const [juegoTerminado, setJuegoTerminado] = useState<boolean>(false);
  const [comodinDisponible, setComodinDisponible] = useState<boolean>(false);
  const [comodinUsado, setComodinUsado] = useState<boolean>(false);
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(null);
  const [tiempoRestanteBloqueo, setTiempoRestanteBloqueo] = useState<string>('');

  // --- Estado 1vs1 (Clásico de Coronas) ---
  const [turno, setTurno] = useState<1 | 2>(1);
  const [progreso, setProgreso] = useState<Record<1 | 2, Record<string, number>>>({
    1: Object.fromEntries(CATEGORIAS.map((c) => [c, 0])),
    2: Object.fromEntries(CATEGORIAS.map((c) => [c, 0])),
  });
  const [coronas, setCoronas] = useState<Record<1 | 2, string[]>>({ 1: [], 2: [] });
  const [rachaTurno, setRachaTurno] = useState<{ 1: number; 2: number }>({ 1: 0, 2: 0 });
  const [comodinDuelo, setComodinDuelo] = useState<{ 1: boolean; 2: boolean }>({ 1: false, 2: false });
  const [esRetoCorona, setEsRetoCorona] = useState<boolean>(false);
  const [categoriaRetada, setCategoriaRetada] = useState<string | null>(null);
  const [ganadorDuelo, setGanadorDuelo] = useState<1 | 2 | null>(null);

  // --- Estado Modo Desafío (14 preguntas, 2 por categoría) ---
  const [turnoDesafio, setTurnoDesafio] = useState<1 | 2>(1);
  const [preguntaNumeroDesafio, setPreguntaNumeroDesafio] = useState<number>(1);
  const [statsDesafio, setStatsDesafio] = useState({
    1: { correctas: 0, tiempoTotal: 0 },
    2: { correctas: 0, tiempoTotal: 0 }
  });
  const [desafioTerminado, setDesafioTerminado] = useState<boolean>(false);

  // --- Música y pantalla completa ---
  const musicaRef = useRef<HTMLAudioElement | null>(null);
  const [musicaSilenciada, setMusicaSilenciada] = useState<boolean>(false);
  const [pantallaCompleta, setPantallaCompleta] = useState<boolean>(false);

  // Despierta al servidor apenas se abre el juego y muestra su estado
  useEffect(() => despertarServidor(API_BASE_URL, setEstadoServidor), []);

  // En el celular la pregunta aparece debajo de la ruleta: se baja sola hasta ella (y vuelve arriba al continuar)
  useEffect(() => {
    if (window.innerWidth >= 900) return;
    if (pregunta && tarjetaPreguntaRef.current) {
      tarjetaPreguntaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (!pregunta) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pregunta]);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.25;
    musicaRef.current = audio;

    const reproducirSiguiente = () => {
      const pista = PISTAS_MUSICA[Math.floor(Math.random() * PISTAS_MUSICA.length)];
      audio.src = pista;
      audio.play().catch(() => {});
    };

    audio.addEventListener('ended', reproducirSiguiente);
    reproducirSiguiente();

    return () => {
      audio.removeEventListener('ended', reproducirSiguiente);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (musicaRef.current) musicaRef.current.muted = musicaSilenciada;
  }, [musicaSilenciada]);

  const alternarPantallaCompleta = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setPantallaCompleta(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setPantallaCompleta(false);
    }
  };

  const lanzarConfettiCorona = () => {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  const lanzarConfettiVictoria = () => {
    reproducir(SONIDO_VICTORIA);
    const finEn = Date.now() + 3000;
    (function disparo() {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 } });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 } });
      if (Date.now() < finEn) requestAnimationFrame(disparo);
    })();
  };

  useEffect(() => {
    const recordGuardado = localStorage.getItem(CLAVE_RECORD);
    if (recordGuardado) setRecord(parseInt(recordGuardado, 10));

    const bloqueoGuardado = localStorage.getItem(CLAVE_BLOQUEO);
    if (bloqueoGuardado) {
      const hasta = parseInt(bloqueoGuardado, 10);
      if (hasta > Date.now()) setBloqueadoHasta(hasta);
      else localStorage.removeItem(CLAVE_BLOQUEO);
    }
  }, []);

  useEffect(() => {
    if (!bloqueadoHasta) return;
    const intervalo = setInterval(() => {
      const restante = bloqueadoHasta - Date.now();
      if (restante <= 0) {
        setBloqueadoHasta(null);
        localStorage.removeItem(CLAVE_BLOQUEO);
        setTiempoRestanteBloqueo('');
        clearInterval(intervalo);
      } else {
        const minutos = Math.floor(restante / 60000);
        const segundos = Math.floor((restante % 60000) / 1000);
        setTiempoRestanteBloqueo(`${minutos}:${segundos.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(intervalo);
  }, [bloqueadoHasta]);

  useEffect(() => {
    let intervalo: any = null;
    if (timerActivo) {
      intervalo = setInterval(() => {
        setTiempoRestante((prev) => {
          if (prev === 6 && !ticReproducidoRef.current) {
            ticReproducidoRef.current = true;
            reproducir(SONIDO_TIC);
          }
          if (prev <= 1) {
            clearInterval(intervalo);
            setTimeout(() => manejarTiempoAgotado(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalo) clearInterval(intervalo); };
  }, [timerActivo]);

  const mezclarOpciones = (array: string[]) => {
    const lista = [...array];
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  };

  const enviarRespuestaAlBackend = async (idPregunta: number, esCorrecta: boolean) => {
    if (origenPreguntaRef.current !== 'servidor') return; // las preguntas guardadas en el dispositivo no suman estadísticas
    try {
      await fetch(`${API_BASE_URL}/api/v1/question/${idPregunta}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correcta: esCorrecta })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const siguienteTurno = () => {
    setPregunta(null);
    setOpcionesMezcladas([]);
    setResultado({ tipo: null, msg: '' });
    setOpcionSeleccionada(null);
    setOpcionesOcultas([]);
    setEsRetoCorona(false);
    setCategoriaRetada(null);
  };

  const cambiarModo = (nuevoModo: Modo) => {
    setModo(nuevoModo);
    siguienteTurno();
    if (nuevoModo === 'duelo') {
      setTurno(1);
      setProgreso({
        1: Object.fromEntries(CATEGORIAS.map((c) => [c, 0])),
        2: Object.fromEntries(CATEGORIAS.map((c) => [c, 0])),
      });
      setCoronas({ 1: [], 2: [] });
      setRachaTurno({ 1: 0, 2: 0 });
      setComodinDuelo({ 1: false, 2: false });
      setGanadorDuelo(null);
    } else if (nuevoModo === 'desafio') {
      setTurnoDesafio(1);
      setPreguntaNumeroDesafio(1);
      setStatsDesafio({
        1: { correctas: 0, tiempoTotal: 0 },
        2: { correctas: 0, tiempoTotal: 0 }
      });
      setDesafioTerminado(false);
    }
  };

  const handleSpinClick = () => {
    const bloqueado = modo === 'solo' ? (juegoTerminado || !!bloqueadoHasta) : modo === 'duelo' ? !!ganadorDuelo : desafioTerminado;
    if (!mustSpin && !bloqueado && !pregunta) {
      reproducirAleatorio(SONIDOS_GIRO);
      setPrizeNumber(Math.floor(Math.random() * data.length));
      setMustSpin(true);
      siguienteTurno();
      setComodinUsado(false);
      ticReproducidoRef.current = false;
    }
  };

  const iniciarRetoCorona = (cat: string) => {
    if (ganadorDuelo) return;
    setEsRetoCorona(true);
    setCategoriaRetada(cat);
    cargarPregunta(cat);
  };

  const handleStopSpinning = async () => {
    setMustSpin(false);
    const opcionTexto = data[prizeNumber].option;
    const categoriaElegida = CATEGORIAS.find((c) => opcionTexto.includes(c)) || opcionTexto;
    cargarPregunta(categoriaElegida);
  };

  // --- Pregunta del servidor; si falla, pregunta REAL guardada en el dispositivo ---
  const cargarPregunta = async (categoriaElegida: string) => {
    setCargando(true);
    setErrorCarga('');
    try {
      const p = await obtenerPregunta(API_BASE_URL, categoriaElegida, preguntasRecientesRef.current, setEstadoServidor);
      origenPreguntaRef.current = p.origen;
      preguntasRecientesRef.current = [p.id, ...preguntasRecientesRef.current].slice(0, 15);
      setPregunta(p);
      setOpcionesMezcladas(mezclarOpciones(p.opciones));
      setTiempoInicio(Date.now());
      setTiempoRestante(p.tiempo_limite);
      setTimerActivo(true);
    } catch (error) {
      console.error(error);
      setErrorCarga('No se pudo cargar la pregunta. Revisá tu conexión y volvé a girar.');
    } finally {
      setCargando(false);
    }
  };

  const perderVida = () => {
    setVidas((v) => {
      const nuevasVidas = v - 1;
      if (nuevasVidas <= 0) finalizarPartida();
      return Math.max(nuevasVidas, 0);
    });
  };

  const finalizarPartida = () => {
    setJuegoTerminado(true);
    reproducirAleatorio(SONIDOS_PERDER);
    setPuntaje((puntajeActual) => {
      if (puntajeActual > record) {
        setRecord(puntajeActual);
        localStorage.setItem(CLAVE_RECORD, String(puntajeActual));
      }
      return puntajeActual;
    });
    const hasta = Date.now() + MINUTOS_BLOQUEO * 60 * 1000;
    localStorage.setItem(CLAVE_BLOQUEO, String(hasta));
    setBloqueadoHasta(hasta);
  };

  const usarComodinSolo = () => {
    if (!comodinDisponible || comodinUsado || !pregunta) return;
    const incorrectas = opcionesMezcladas.filter((o) => o !== pregunta.respuesta_correcta);
    setOpcionesOcultas(mezclarOpciones(incorrectas).slice(0, 2));
    setComodinUsado(true);
    setComodinDisponible(false);
  };

  const verificarRespuestaSolo = (opcion: string) => {
    if (opcionSeleccionada || !tiempoInicio || tiempoRestante === 0 || juegoTerminado) return;
    setTimerActivo(false);
    setOpcionSeleccionada(opcion);
    const segundosTardados = (Date.now() - tiempoInicio) / 1000;
    const esCorrecta = opcion === pregunta.respuesta_correcta;
    enviarRespuestaAlBackend(pregunta.id, esCorrecta);

    if (esCorrecta) {
      reproducirAleatorio(SONIDOS_CORRECTO);
      const nueva = rachaCorrectas + 1;
      setRachaCorrectas(nueva);
      setRachaIncorrectas(0);
      setPuntaje((p) => p + 1);
      if (nueva % 5 === 0) {
        setComodinDisponible(true);
        reproducir(SONIDO_COMODIN);
      }
      setResultado({ tipo: 'correcto', msg: segundosTardados < 8 ? "¡Sos una luz! ⚡" : "¡Excelente respuesta! 🎉" });
    } else {
      reproducirAleatorio(SONIDOS_INCORRECTO);
      setRachaIncorrectas((r) => r + 1);
      setRachaCorrectas(0);
      setResultado({ tipo: 'incorrecto', msg: "Casi, casi... pero no. 🏟️" });
      perderVida();
    }
  };

  const usarComodinDuelo = () => {
    if (!comodinDuelo[turno] || comodinUsado || !pregunta) return;
    const incorrectas = opcionesMezcladas.filter((o) => o !== pregunta.respuesta_correcta);
    setOpcionesOcultas(mezclarOpciones(incorrectas).slice(0, 2));
    setComodinUsado(true);
    setComodinDuelo((c) => ({ ...c, [turno]: false }));
  };

  const verificarRespuestaDuelo = (opcion: string) => {
    if (opcionSeleccionada || !tiempoInicio || tiempoRestante === 0 || ganadorDuelo) return;
    setTimerActivo(false);
    setOpcionSeleccionada(opcion);
    const esCorrecta = opcion === pregunta.respuesta_correcta;
    enviarRespuestaAlBackend(pregunta.id, esCorrecta);

    const jugadorActual = turno;
    const oponente = jugadorActual === 1 ? 2 : 1;
    const categoriaActual = esRetoCorona ? categoriaRetada! : pregunta.categoria;

    if (esCorrecta) {
      reproducirAleatorio(SONIDOS_CORRECTO);
      let tieneCorona = coronas[jugadorActual].includes(categoriaActual);

      if (esRetoCorona) {
        if (!tieneCorona) {
          setCoronas((prev) => ({
            ...prev,
            [jugadorActual]: [...prev[jugadorActual], categoriaActual],
            [oponente]: prev[oponente].filter((c) => c !== categoriaActual),
          }));
        }
      } else {
        const nivelActual = progreso[jugadorActual][categoriaActual] || 0;
        if (nivelActual === 2 && !tieneCorona) {
          lanzarConfettiCorona();
          setCoronas((prev) => ({
            ...prev,
            [jugadorActual]: [...prev[jugadorActual], categoriaActual],
          }));
          setProgreso((prev) => ({
            ...prev,
            [jugadorActual]: { ...prev[jugadorActual], [categoriaActual]: 3 },
          }));
        } else if (nivelActual < 2) {
          setProgreso((prev) => ({
            ...prev,
            [jugadorActual]: { ...prev[jugadorActual], [categoriaActual]: nivelActual + 1 },
          }));
        }
      }

      const totalCoronasActualizadas = [...coronas[jugadorActual], ...(esRetoCorona && !coronas[jugadorActual].includes(categoriaActual) ? [categoriaActual] : [])];
      if (totalCoronasActualizadas.length >= 7) {
        setGanadorDuelo(jugadorActual);
        lanzarConfettiVictoria();
        setResultado({ tipo: 'correcto', msg: `🏆 ¡Jugador ${jugadorActual} ganó el duelo!` });
        return;
      }

      const nuevaRacha = rachaTurno[jugadorActual] + 1;
      setRachaTurno((r) => ({ ...r, [jugadorActual]: nuevaRacha }));
      if (nuevaRacha % 5 === 0) {
        setComodinDuelo((c) => ({ ...c, [jugadorActual]: true }));
        reproducir(SONIDO_COMODIN);
      }

      setResultado({
        tipo: 'correcto',
        msg: esRetoCorona
          ? `¡Robaste la corona de ${categoriaActual}! ¡Seguís jugando!`
          : `¡Correcto! Avanzás en ${categoriaActual}. ¡Mantenés el turno y volvés a girar!`
      });
    } else {
      reproducirAleatorio(SONIDOS_INCORRECTO);
      setRachaTurno((r) => ({ ...r, [jugadorActual]: 0 }));

      if (esRetoCorona || (progreso[jugadorActual][categoriaActual] === 2)) {
        setProgreso((prev) => ({
          ...prev,
          [jugadorActual]: { ...prev[jugadorActual], [categoriaActual]: 0 },
        }));
      }

      setResultado({ 
        tipo: 'incorrecto', 
        msg: `Fallaste. Turno pasa al Jugador ${oponente}.` 
      });
      setTurno(oponente);
    }
  };

  const verificarRespuestaDesafio = (opcion: string) => {
    if (opcionSeleccionada || !tiempoInicio || tiempoRestante === 0 || desafioTerminado) return;
    setTimerActivo(false);
    setOpcionSeleccionada(opcion);
    const tiempoTardado = (Date.now() - tiempoInicio) / 1000;
    const esCorrecta = opcion === pregunta.respuesta_correcta;
    enviarRespuestaAlBackend(pregunta.id, esCorrecta);

    const jugadorActual = turnoDesafio;
    
    setStatsDesafio((prev) => {
      const actual = prev[jugadorActual];
      return {
        ...prev,
        [jugadorActual]: {
          correctas: actual.correctas + (esCorrecta ? 1 : 0),
          tiempoTotal: Number((actual.tiempoTotal + tiempoTardado).toFixed(2))
        }
      };
    });

    if (esCorrecta) {
      reproducirAleatorio(SONIDOS_CORRECTO);
      setResultado({ tipo: 'correcto', msg: `¡Correcto! (+${tiempoTardado.toFixed(1)}s)` });
    } else {
      reproducirAleatorio(SONIDOS_INCORRECTO);
      setResultado({ tipo: 'incorrecto', msg: `Incorrecto. La respuesta era: ${pregunta.respuesta_correcta}` });
    }
  };

  const avanzarSiguientePasoDesafio = () => {
    if (preguntaNumeroDesafio >= 14) {
      setDesafioTerminado(true);
      lanzarConfettiVictoria();
    } else {
      setPreguntaNumeroDesafio((p) => p + 1);
      setTurnoDesafio((t) => (t === 1 ? 2 : 1));
      siguienteTurno();
    }
  };

  const manejarTiempoAgotado = () => {
    setTimerActivo(false);
    setOpcionSeleccionada("TIEMPO_AGOTADO");
    reproducirAleatorio(SONIDOS_TIEMPO_AGOTADO);

    if (modo === 'solo') {
      setRachaIncorrectas((r) => r + 1);
      setRachaCorrectas(0);
      setResultado({ tipo: 'incorrecto', msg: "¡Tiempo agotado! ⏱️" });
      if (pregunta) enviarRespuestaAlBackend(pregunta.id, false);
      perderVida();
    } else if (modo === 'duelo') {
      if (pregunta) enviarRespuestaAlBackend(pregunta.id, false);
      const jugadorActual = turno;
      const oponente = jugadorActual === 1 ? 2 : 1;
      setRachaTurno((r) => ({ ...r, [jugadorActual]: 0 }));
      setResultado({ tipo: 'incorrecto', msg: `¡Se agotó el tiempo! Turno para Jugador ${oponente}.` });
      setTurno(oponente);
    } else if (modo === 'desafio') {
      if (pregunta) enviarRespuestaAlBackend(pregunta.id, false);
      setResultado({ tipo: 'incorrecto', msg: "¡Se agotó el tiempo! 0 aciertos sumados." });
    }
  };

  const verificarRespuesta = (opcion: string) => {
    if (modo === 'solo') verificarRespuestaSolo(opcion);
    else if (modo === 'duelo') verificarRespuestaDuelo(opcion);
    else if (modo === 'desafio') verificarRespuestaDesafio(opcion);
  };

  const reiniciarDuelo = () => cambiarModo('duelo');

  const BarraSuperior = (
    <div className="barra-superior-animada">
      <button
        onClick={() => cambiarModo('solo')}
        className={`nav-btn ${modo === 'solo' ? 'active' : ''}`}
      >
        👤 1 Jugador
      </button>
      <button
        onClick={() => cambiarModo('duelo')}
        className={`nav-btn ${modo === 'duelo' ? 'active' : ''}`}
      >
        ⚔️ 1 vs 1
      </button>
      <button
        onClick={() => cambiarModo('desafio')}
        className={`nav-btn ${modo === 'desafio' ? 'active' : ''}`}
      >
        🎯 Desafío (14 Preg.)
      </button>
      <button
        onClick={() => cambiarModo('online')}
        className={`nav-btn ${modo === 'online' ? 'active' : ''}`}
      >
        📱 Desafío online
      </button>
      <button
        onClick={() => setMusicaSilenciada((m) => !m)}
        title={musicaSilenciada ? 'Activar música' : 'Silenciar música'}
        className="icon-btn"
      >
        {musicaSilenciada ? '🔇' : '🔊'}
      </button>
      <button
        onClick={alternarPantallaCompleta}
        title="Pantalla completa"
        className="icon-btn"
      >
        {pantallaCompleta ? '🡼' : '⛶'}
      </button>
    </div>
  );

if (modo === 'online') {
  return (
    <div className="game-container">
      {BarraSuperior}
      <Multijugador />
    </div>
  );
}

  if (modo === 'solo' && bloqueadoHasta) {
    return (
      <div className="game-container">
        {BarraSuperior}
        <div className="card-bloqueo">
          <h2>🔒 Has agotado tus vidas</h2>
          <p style={{ fontSize: '18px' }}>Podés volver a jugar en:</p>
          <div className="cronometro-bloqueo">{tiempoRestanteBloqueo}</div>
          <p style={{ marginTop: '20px' }}>Puntaje: <strong>{puntaje}</strong></p>
          <p>Récord: <strong>{record}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap');

        .game-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%);
          background-size: 200% 200%;
          animation: gradientShift 12s ease infinite;
          padding: 24px;
          font-family: 'Fredoka', system-ui, sans-serif;
          color: #1e293b;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .barra-superior-animada {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 14px;
          margin-bottom: 25px;
          flex-wrap: wrap;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(12px);
          padding: 12px 24px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .nav-btn {
          padding: 10px 24px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 16px;
          background: rgba(255, 255, 255, 0.4);
          color: #fff;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .nav-btn.active {
          background: #ffffff;
          color: #4f46e5;
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(255,255,255,0.4);
        }

        .nav-btn:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.7);
          color: #312e81;
        }

        .icon-btn {
          padding: 10px 14px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.3);
          color: #fff;
          font-size: 16px;
          transition: all 0.2s ease;
        }
        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.7);
          transform: translateY(-2px);
        }

        .ruleta-glow-wrapper {
          position: relative;
          padding: 12px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(5px);
          animation: floatPulse 4s ease-in-out infinite;
        }

        @keyframes floatPulse {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.01); }
        }

        .capibara-img {
          width: 190px;
          max-height: 230px;
          object-fit: contain;
          filter: drop-shadow(0 12px 24px rgba(0,0,0,0.25));
          animation: bounceGentle 3s ease-in-out infinite;
        }

        @keyframes bounceGentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .main-card-game {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(16px);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          border: 2px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
        }

        .opcion-btn {
          padding: 16px;
          text-align: left;
          border-radius: 14px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }
        .opcion-btn:not(:disabled):hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }

        .girar-btn {
          padding: 16px 40px;
          font-size: 20px;
          border-radius: 16px;
          font-weight: 700;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
          border: none;
          box-shadow: 0 8px 24px rgba(34,197,94,0.4);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .girar-btn:not(:disabled):hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 12px 30px rgba(34,197,94,0.6);
        }
        .girar-btn:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .card-bloqueo {
          text-align: center;
          margin-top: 40px;
          color: #1e293b;
          background: rgba(255, 255, 255, 0.9);
          padding: 40px;
          border-radius: 24px;
          max-width: 500px;
          margin: 40px auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .cronometro-bloqueo {
          font-size: 52px;
          font-weight: bold;
          color: #e11d48;
          text-shadow: 0 4px 12px rgba(225,29,72,0.2);
        }

        .player-panel {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          padding: 22px;
          border-radius: 22px;
          width: 240px;
          color: #1e293b;
          border: 2px solid rgba(255,255,255,0.6);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }
        .player-panel.active-turn {
          border: 2px solid #6366f1;
          box-shadow: 0 0 25px rgba(99, 102, 241, 0.4);
          transform: scale(1.02);
        }

        .estado-servidor {
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 20px;
          margin: -10px auto 16px auto;
          width: fit-content;
          max-width: 92%;
          background: rgba(255, 255, 255, 0.92);
          color: #1e293b;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        @media (max-width: 640px) {
          .game-container { padding: 12px; }
          .barra-superior-animada { padding: 10px 12px; gap: 8px; }
          .nav-btn { padding: 8px 12px; font-size: 14px; }
          .capibara-img { width: 110px; max-height: 140px; }
          .player-panel { width: 100%; box-sizing: border-box; }
          .main-card-game { padding: 18px; }
          .opcion-btn { font-size: 15px; padding: 14px; }
        }
      `}</style>
      {BarraSuperior}

      <div className="estado-servidor">
        {estadoServidor === 'en_linea' && '🟢 Servidor en línea'}
        {estadoServidor === 'conectando' && '🟡 Conectando con el servidor… (la primera vez puede tardar hasta 1 minuto)'}
        {estadoServidor === 'sin_conexion' && '📴 Sin servidor: jugás con las preguntas guardadas en este dispositivo'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: '30px', marginTop: '10px', flexWrap: 'wrap', padding: '0 16px' }}>
        
        {/* Panel Jugador 1 (Modo Duelo) */}
        {modo === 'duelo' && (
          <div className={`player-panel ${turno === 1 ? 'active-turn' : ''}`}>
            <h4 style={{ margin: '0 0 15px 0', color: '#4f46e5', fontSize: '18px', textAlign: 'center' }}>👤 Jugador 1 {turno === 1 && '◀'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CATEGORIAS.map((cat) => {
                const nivel = progreso[1][cat] || 0;
                const tieneCorona = coronas[1].includes(cat);
                const oponenteTieneCorona = coronas[2].includes(cat);
                return (
                  <div key={cat} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span>{STICKERS_CATEGORIA[cat]} {cat}</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{tieneCorona ? '👑' : `${nivel}/3`}</span>
                      {nivel === 2 && !tieneCorona && oponenteTieneCorona && turno === 1 && !mustSpin && !pregunta && (
                        <button onClick={() => iniciarRetoCorona(cat)} style={{ fontSize: '10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '4px 8px', fontWeight: 'bold' }}>
                          ⚔️ Reto
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px' }}>

          {modo === 'solo' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ fontSize: '18px', backgroundColor: 'rgba(255,255,255,0.9)', color: '#1e293b', padding: '8px 18px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontWeight: '600' }}>
                  {Array.from({ length: VIDAS_INICIALES }).map((_, i) => (
                    <span key={i}>{i < vidas ? '❤️' : '🖤'}</span>
                  ))}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.9)', color: '#1e293b', padding: '8px 18px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
                  🏆 {puntaje} | Récord: {record}
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.9)', color: '#1e293b', padding: '6px 16px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
                🔥 Racha: {rachaCorrectas} | ❌ Errores: {rachaIncorrectas}
              </div>
              {timerActivo && (
                <div style={{ fontSize: '22px', fontWeight: 'bold', backgroundColor: tiempoRestante <= 10 ? '#ef4444' : '#f59e0b', color: '#fff', padding: '8px 24px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
                  ⏱️ {tiempoRestante}s
                </div>
              )}
              {comodinDisponible && (
                <button onClick={usarComodinSolo} style={{ padding: '10px 20px', backgroundColor: '#a855f7', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(168,85,247,0.4)' }}>
                  🃏 Usar comodín (50/50)
                </button>
              )}
            </div>
          ) : modo === 'duelo' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <div style={{ padding: '10px 26px', borderRadius: '20px', fontWeight: 'bold', backgroundColor: '#4f46e5', color: '#fff', boxShadow: '0 4px 15px rgba(79,70,229,0.4)', fontSize: '16px' }}>
                Turno Actual: Jugador {turno}
              </div>

              {timerActivo && (
                <div style={{ fontSize: '22px', fontWeight: 'bold', backgroundColor: tiempoRestante <= 10 ? '#ef4444' : '#f59e0b', color: '#fff', padding: '8px 24px', borderRadius: '20px', textAlign: 'center' }}>
                  ⏱️ {tiempoRestante}s
                </div>
              )}
              {comodinDuelo[turno] && (
                <button onClick={usarComodinDuelo} style={{ padding: '10px 20px', backgroundColor: '#a855f7', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  🃏 Jugador {turno}: usar comodín (50/50)
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <div style={{ padding: '10px 26px', borderRadius: '20px', fontWeight: 'bold', backgroundColor: '#0284c7', color: '#fff', boxShadow: '0 4px 15px rgba(2,132,199,0.4)', fontSize: '16px' }}>
                🎯 Desafío | Pregunta {preguntaNumeroDesafio} de 14 (Turno Jugador {turnoDesafio})
              </div>
              {timerActivo && (
                <div style={{ fontSize: '22px', fontWeight: 'bold', backgroundColor: tiempoRestante <= 10 ? '#ef4444' : '#f59e0b', color: '#fff', padding: '8px 24px', borderRadius: '20px', textAlign: 'center' }}>
                  ⏱️ {tiempoRestante}s
                </div>
              )}
            </div>
          )}

          {(modo === 'solo' && juegoTerminado) ? (
            <div className="card-bloqueo">
              <h2>💀 Perdiste tus 3 vidas</h2>
              <p>Puntaje final: <strong>{puntaje}</strong></p>
              <p>Récord: <strong>{record}</strong></p>
            </div>
          ) : (modo === 'duelo' && ganadorDuelo) ? (
            <div className="card-bloqueo">
              <h2>🏆 ¡Jugador {ganadorDuelo} ganó el duelo!</h2>
              <button onClick={reiniciarDuelo} className="girar-btn" style={{ marginTop: '15px' }}>
                Jugar de nuevo
              </button>
            </div>
          ) : (modo === 'desafio' && desafioTerminado) ? (
            <div className="card-bloqueo" style={{ maxWidth: '600px' }}>
              <h2>📊 Informe Final del Desafío</h2>
              <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0', gap: '15px' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', flex: 1, border: '1px solid #cbd5e1' }}>
                  <h3 style={{ color: '#4f46e5', margin: '0 0 10px 0' }}>Jugador 1</h3>
                  <p>Aciertos: <strong>{statsDesafio[1].correctas} / 7</strong></p>
                  <p>Tiempo Total: <strong>{statsDesafio[1].tiempoTotal}s</strong></p>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', flex: 1, border: '1px solid #cbd5e1' }}>
                  <h3 style={{ color: '#0284c7', margin: '0 0 10px 0' }}>Jugador 2</h3>
                  <p>Aciertos: <strong>{statsDesafio[2].correctas} / 7</strong></p>
                  <p>Tiempo Total: <strong>{statsDesafio[2].tiempoTotal}s</strong></p>
                </div>
              </div>
              <h3 style={{ color: '#16a34a', margin: '15px 0' }}>
                {statsDesafio[1].correctas > statsDesafio[2].correctas ? "🏆 ¡Ganó el Jugador 1 por más aciertos!" :
                 statsDesafio[2].correctas > statsDesafio[1].correctas ? "🏆 ¡Ganó el Jugador 2 por más aciertos!" :
                 statsDesafio[1].tiempoTotal < statsDesafio[2].tiempoTotal ? "🏆 ¡Empate en aciertos! Gana Jugador 1 por velocidad." :
                 statsDesafio[2].tiempoTotal < statsDesafio[1].tiempoTotal ? "🏆 ¡Empate en aciertos! Gana Jugador 2 por velocidad." :
                 "🤝 ¡Empate total en aciertos y tiempo!"}
              </h3>
              <button onClick={() => cambiarModo('desafio')} className="girar-btn" style={{ marginTop: '15px', fontSize: '16px', padding: '12px 24px' }}>
                Volver a Desafiar
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ color: '#ffffff', margin: '0', textShadow: '0 2px 10px rgba(0,0,0,0.2)', fontSize: '28px' }}>
                {modo === 'solo' ? '¡Girá la Ruleta!' : modo === 'duelo' ? `Turno del Jugador ${turno}` : `Desafío - Jugador ${turnoDesafio}`}
              </h2>
              {esRetoCorona && (
                <div style={{ backgroundColor: '#ea580c', color: '#fff', padding: '8px 18px', borderRadius: '14px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(234,88,12,0.3)' }}>
                  ⚔️ Reto por la corona de {categoriaRetada}
                </div>
              )}

              {/* RULETA 2D MEJORADA CON GLOW Y CAPIBARA ANIMADO */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div className="ruleta-glow-wrapper">
                  <Wheel
                    mustStartSpinning={mustSpin}
                    prizeNumber={prizeNumber}
                    data={data}
                    onStopSpinning={handleStopSpinning}
                    outerBorderColor="#ffffff"
                    outerBorderWidth={8}
                    innerRadius={25}
                    innerBorderColor="#ffffff"
                    innerBorderWidth={5}
                    radiusLineWidth={3}
                    radiusLineColor="#ffffff"
                    fontSize={17}
                    textColors={['#ffffff']}
                  />
                </div>
                
                <img 
                  src="/capibara.png" 
                  alt="Modo Capibara: Cero Estrés" 
                  className="capibara-img" 
                />
              </div>

              <button onClick={handleSpinClick} disabled={mustSpin || !!pregunta} className="girar-btn">
                {mustSpin ? 'Girando ruleta...' : '¡Girar Ruleta!'}
              </button>
              {cargando && <p style={{ color: '#ffffff', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Cargando pregunta...</p>}
              {errorCarga && <p style={{ color: '#ffffff', background: '#dc2626', padding: '8px 14px', borderRadius: '12px', fontWeight: 'bold', maxWidth: '320px', textAlign: 'center' }}>{errorCarga}</p>}
            </>
          )}
        </div>

        {/* Panel Jugador 2 (Modo Duelo) */}
        {modo === 'duelo' && (
          <div className={`player-panel ${turno === 2 ? 'active-turn' : ''}`}>
            <h4 style={{ margin: '0 0 15px 0', color: '#4f46e5', fontSize: '18px', textAlign: 'center' }}>👤 Jugador 2 {turno === 2 && '◀'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CATEGORIAS.map((cat) => {
                const nivel = progreso[2][cat] || 0;
                const tieneCorona = coronas[2].includes(cat);
                const oponenteTieneCorona = coronas[1].includes(cat);
                return (
                  <div key={cat} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span>{STICKERS_CATEGORIA[cat]} {cat}</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{tieneCorona ? '👑' : `${nivel}/3`}</span>
                      {nivel === 2 && !tieneCorona && oponenteTieneCorona && turno === 2 && !mustSpin && !pregunta && (
                        <button onClick={() => iniciarRetoCorona(cat)} style={{ fontSize: '10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '4px 8px', fontWeight: 'bold' }}>
                          ⚔️ Reto
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CARD DE PREGUNTAS MODERNA Y FLUIDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 'min(320px, 100%)', maxWidth: '450px', width: '100%', marginTop: '30px' }}>
          {pregunta && !((modo === 'solo' && juegoTerminado) || (modo === 'duelo' && ganadorDuelo) || (modo === 'desafio' && desafioTerminado)) && (
            <div className="main-card-game" ref={tarjetaPreguntaRef}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ backgroundColor: '#e0e7ff', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: '700', color: '#3730a3' }}>
                  {STICKERS_CATEGORIA[pregunta.categoria]} {pregunta.categoria}
                </span>
                <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                  Dificultad: {pregunta.dificultad}
                </span>
              </div>
              <h3 style={{ margin: '12px 0 22px 0', fontSize: '20px', color: '#1e293b', fontWeight: '700', lineHeight: '1.4' }}>{pregunta.pregunta}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {opcionesMezcladas.filter((o) => !opcionesOcultas.includes(o)).map((opcion, index) => {
                  const esSeleccionada = opcionSeleccionada === opcion;
                  const esCorrecta = opcion === pregunta.respuesta_correcta;
                  let bg = '#ffffff';
                  let bc = '#e2e8f0';
                  let colorTexto = '#1e293b';
                  if (opcionSeleccionada && esSeleccionada) {
                    if (esCorrecta) { bg = '#dcfce7'; bc = '#22c55e'; colorTexto = '#166534'; }
                    else { bg = '#fee2e2'; bc = '#ef4444'; colorTexto = '#991b1b'; }
                  }
                  return (
                    <button key={index} onClick={() => verificarRespuesta(opcion)} disabled={!!opcionSeleccionada} className="opcion-btn" style={{ backgroundColor: bg, border: `2px solid ${bc}`, color: colorTexto }}>
                      {opcion}
                    </button>
                  );
                })}
              </div>
              
              {resultado.tipo && (
                <div style={{ marginTop: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    padding: '14px', borderRadius: '14px',
                    backgroundColor: resultado.tipo === 'correcto' ? '#dcfce7' : '#fee2e2',
                    color: resultado.tipo === 'correcto' ? '#166534' : '#991b1b',
                    fontWeight: 'bold', textAlign: 'center', fontSize: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    {resultado.msg}
                  </div>
                  
                  <button 
                    onClick={modo === 'desafio' ? avanzarSiguientePasoDesafio : siguienteTurno}
                    className="girar-btn"
                    style={{ fontSize: '16px', padding: '14px' }}
                  >
                    ▶ Continuar / Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
