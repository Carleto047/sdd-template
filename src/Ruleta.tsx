import { useState, useEffect, useRef } from 'react';
import { Wheel } from 'react-custom-roulette';
import confetti from 'canvas-confetti';

const VIDAS_INICIALES = 3;
const MINUTOS_BLOQUEO = 20;
const CLAVE_BLOQUEO = 'preguntados_bloqueo_hasta';
const CLAVE_RECORD = 'preguntados_record';

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
  { option: 'Geografía', style: { backgroundColor: '#e74c3c', textColor: 'white' } },
  { option: 'Ciencia', style: { backgroundColor: '#2ecc71', textColor: 'white' } },
  { option: 'Historia', style: { backgroundColor: '#f1c40f', textColor: 'black' } },
  { option: 'Arte', style: { backgroundColor: '#9b59b6', textColor: 'white' } },
  { option: 'Deportes', style: { backgroundColor: '#e67e22', textColor: 'white' } },
  { option: 'Entretenimiento', style: { backgroundColor: '#3498db', textColor: 'white' } },
  { option: 'IESETyFP', style: { backgroundColor: '#1abc9c', textColor: 'white' } },
];

const CATEGORIAS = data.map((d) => d.option);

type Modo = 'solo' | 'duelo';

export default function Ruleta() {
  const [modo, setModo] = useState<Modo>('solo');

  // --- Estado compartido de la ruleta/pregunta ---
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

  // --- Estado del modo 1 Jugador ---
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

  // --- Estado del modo 1vs1 ---
  const [turno, setTurno] = useState<1 | 2>(1);
  const [coronas, setCoronas] = useState<Record<string, 1 | 2 | null>>(
    Object.fromEntries(CATEGORIAS.map((c) => [c, null]))
  );
  const [rachaTurno, setRachaTurno] = useState<{ 1: number; 2: number }>({ 1: 0, 2: 0 });
  const [comodinDuelo, setComodinDuelo] = useState<{ 1: boolean; 2: boolean }>({ 1: false, 2: false });
  const [esReto, setEsReto] = useState<boolean>(false);
  const [ganadorDuelo, setGanadorDuelo] = useState<1 | 2 | null>(null);

  // --- Música de fondo y pantalla completa ---
  const musicaRef = useRef<HTMLAudioElement | null>(null);
  const [musicaSilenciada, setMusicaSilenciada] = useState<boolean>(false);
  const [pantallaCompleta, setPantallaCompleta] = useState<boolean>(false);

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
    try {
      await fetch(`http://localhost:8000/api/v1/question/${idPregunta}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correcta: esCorrecta })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const cambiarModo = (nuevoModo: Modo) => {
    setModo(nuevoModo);
    setPregunta(null);
    setOpcionesMezcladas([]);
    setResultado({ tipo: null, msg: '' });
    setOpcionSeleccionada(null);
    setTimerActivo(false);
    setOpcionesOcultas([]);
    setEsReto(false);
    if (nuevoModo === 'duelo') {
      setTurno(1);
      setCoronas(Object.fromEntries(CATEGORIAS.map((c) => [c, null])));
      setRachaTurno({ 1: 0, 2: 0 });
      setComodinDuelo({ 1: false, 2: false });
      setGanadorDuelo(null);
    }
  };

  const handleSpinClick = () => {
    const bloqueado = modo === 'solo' ? (juegoTerminado || !!bloqueadoHasta) : !!ganadorDuelo;
    if (!mustSpin && !bloqueado) {
      reproducirAleatorio(SONIDOS_GIRO);
      setPrizeNumber(Math.floor(Math.random() * data.length));
      setMustSpin(true);
      setPregunta(null);
      setOpcionesMezcladas([]);
      setResultado({ tipo: null, msg: '' });
      setOpcionSeleccionada(null);
      setTimerActivo(false);
      setComodinUsado(false);
      setOpcionesOcultas([]);
      setEsReto(false);
      ticReproducidoRef.current = false;
    }
  };

  const handleStopSpinning = async () => {
    setMustSpin(false);
    const categoriaElegida = data[prizeNumber].option;

    if (modo === 'duelo') {
      const dueno = coronas[categoriaElegida];
      setEsReto(dueno !== null && dueno !== turno);
    }

    setCargando(true);
    try {
      let dataPregunta: any = null;
      for (let intento = 0; intento < 5; intento++) {
        const response = await fetch(`http://localhost:8000/api/v1/question/random/${categoriaElegida}`);
        if (!response.ok) throw new Error("Error");
        const candidata = await response.json();
        if (!preguntasRecientesRef.current.includes(candidata.id)) {
          dataPregunta = candidata;
          break;
        }
        dataPregunta = candidata;
      }
      preguntasRecientesRef.current = [dataPregunta.id, ...preguntasRecientesRef.current].slice(0, 15);

      setPregunta(dataPregunta);
      setOpcionesMezcladas(mezclarOpciones(dataPregunta.opciones));
      setTiempoInicio(Date.now());
      setTiempoRestante(dataPregunta.tiempo_limite);
      setTimerActivo(true);
    } catch (error) {
      console.error(error);
      setResultado({ tipo: 'incorrecto', msg: `No se encontraron preguntas.` });
    } finally {
      setCargando(false);
    }
  };

  // ================= MODO 1 JUGADOR =================

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

  // ================= MODO 1vs1 =================

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

    const categoriaActual = pregunta.categoria as string;
    const jugadorActual = turno;

    if (esCorrecta) {
      reproducirAleatorio(SONIDOS_CORRECTO);
      const nuevaCoronas = { ...coronas, [categoriaActual]: jugadorActual };
      setCoronas(nuevaCoronas);
      lanzarConfettiCorona();

      const nuevaRacha = rachaTurno[jugadorActual] + 1;
      setRachaTurno((r) => ({ ...r, [jugadorActual]: nuevaRacha }));
      if (nuevaRacha % 5 === 0) {
        setComodinDuelo((c) => ({ ...c, [jugadorActual]: true }));
        reproducir(SONIDO_COMODIN);
      }

      const gano = CATEGORIAS.every((c) => nuevaCoronas[c] === jugadorActual);
      if (gano) {
        setGanadorDuelo(jugadorActual);
        lanzarConfettiVictoria();
        setResultado({ tipo: 'correcto', msg: `🏆 ¡Jugador ${jugadorActual} ganó el duelo!` });
        return;
      }

      setResultado({
        tipo: 'correcto',
        msg: esReto
          ? `¡Jugador ${jugadorActual} le quitó la corona de ${categoriaActual}!`
          : `¡Jugador ${jugadorActual} ganó la corona de ${categoriaActual}! Seguís jugando.`
      });
    } else {
      reproducirAleatorio(SONIDOS_INCORRECTO);
      setRachaTurno((r) => ({ ...r, [jugadorActual]: 0 }));
      setResultado({ tipo: 'incorrecto', msg: `Jugador ${jugadorActual} falló. Turno para el Jugador ${jugadorActual === 1 ? 2 : 1}.` });
      setTurno(jugadorActual === 1 ? 2 : 1);
    }
  };

  const manejarTiempoAgotado = () => {
    setTimerActivo(false);
    setOpcionSeleccionada("TIEMPO_AGOTADO");
    reproducirAleatorio(SONIDOS_TIEMPO_AGOTADO);

    if (modo === 'solo') {
      setRachaIncorrectas((r) => r + 1);
      setRachaCorrectas(0);
      setResultado({ tipo: 'incorrecto', msg: "¡Se te terminó el tiempo! ⏱️" });
      if (pregunta) enviarRespuestaAlBackend(pregunta.id, false);
      perderVida();
    } else {
      if (pregunta) enviarRespuestaAlBackend(pregunta.id, false);
      setRachaTurno((r) => ({ ...r, [turno]: 0 }));
      setResultado({ tipo: 'incorrecto', msg: `¡Se le acabó el tiempo al Jugador ${turno}! Turno para el Jugador ${turno === 1 ? 2 : 1}.` });
      setTurno(turno === 1 ? 2 : 1);
    }
  };

  const verificarRespuesta = (opcion: string) => {
    if (modo === 'solo') verificarRespuestaSolo(opcion);
    else verificarRespuestaDuelo(opcion);
  };

  const reiniciarDuelo = () => cambiarModo('duelo');

  const BarraSuperior = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
      <button
        onClick={() => cambiarModo('solo')}
        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: modo === 'solo' ? '#4a90e2' : '#ddd', color: modo === 'solo' ? '#fff' : '#333' }}
      >
        👤 1 Jugador
      </button>
      <button
        onClick={() => cambiarModo('duelo')}
        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: modo === 'duelo' ? '#4a90e2' : '#ddd', color: modo === 'duelo' ? '#fff' : '#333' }}
      >
        ⚔️ 1 vs 1
      </button>
      <button
        onClick={() => setMusicaSilenciada((m) => !m)}
        title={musicaSilenciada ? 'Activar música' : 'Silenciar música'}
        style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#333', color: '#fff', fontSize: '16px' }}
      >
        {musicaSilenciada ? '🔇' : '🔊'}
      </button>
      <button
        onClick={alternarPantallaCompleta}
        title="Pantalla completa"
        style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#333', color: '#fff', fontSize: '16px' }}
      >
        {pantallaCompleta ? '🡼' : '⛶'}
      </button>
    </div>
  );

  if (modo === 'solo' && bloqueadoHasta) {
    return (
      <div>
        {BarraSuperior}
        <div style={{ textAlign: 'center', marginTop: '40px', color: 'white' }}>
          <h2>🔒 Perdiste tus 3 vidas</h2>
          <p style={{ fontSize: '18px' }}>Podés volver a jugar en:</p>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffdd57' }}>{tiempoRestanteBloqueo}</div>
          <p style={{ marginTop: '20px' }}>Puntaje de esa partida: <strong>{puntaje}</strong></p>
          <p>Récord personal: <strong>{record}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {BarraSuperior}

      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: '50px', marginTop: '10px', flexWrap: 'wrap', padding: '0 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>

          {modo === 'solo' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ fontSize: '18px', backgroundColor: '#333', color: '#fff', padding: '5px 15px', borderRadius: '15px' }}>
                  {Array.from({ length: VIDAS_INICIALES }).map((_, i) => (
                    <span key={i}>{i < vidas ? '❤️' : '🖤'}</span>
                  ))}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', backgroundColor: '#333', color: '#fff', padding: '5px 15px', borderRadius: '15px' }}>
                  🏆 {puntaje} | Récord: {record}
                </div>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', backgroundColor: '#333', color: '#fff', padding: '5px 15px', borderRadius: '15px' }}>
                🔥 Racha: {rachaCorrectas} | ❌ Errores: {rachaIncorrectas}
              </div>
              {timerActivo && (
                <div style={{ fontSize: '20px', fontWeight: 'bold', backgroundColor: tiempoRestante <= 10 ? '#e74c3c' : '#f1c40f', color: tiempoRestante <= 10 ? '#fff' : '#000', padding: '8px 20px', borderRadius: '15px', minWidth: '70px', textAlign: 'center' }}>
                  ⏱️ {tiempoRestante}s
                </div>
              )}
              {comodinDisponible && (
                <button onClick={usarComodinSolo} style={{ padding: '8px 16px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  🃏 Usar comodín (50/50)
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ padding: '8px 16px', borderRadius: '15px', fontWeight: 'bold', backgroundColor: turno === 1 ? '#4a90e2' : '#ddd', color: turno === 1 ? '#fff' : '#333' }}>
                  Turno: Jugador 1
                </div>
                <div style={{ padding: '8px 16px', borderRadius: '15px', fontWeight: 'bold', backgroundColor: turno === 2 ? '#4a90e2' : '#ddd', color: turno === 2 ? '#fff' : '#333' }}>
                  Turno: Jugador 2
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '340px' }}>
                {CATEGORIAS.map((cat) => (
                  <div key={cat} style={{
                    padding: '4px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold',
                    backgroundColor: coronas[cat] === 1 ? '#4a90e2' : coronas[cat] === 2 ? '#e74c3c' : '#eee',
                    color: coronas[cat] ? '#fff' : '#333'
                  }}>
                    {coronas[cat] ? '👑' : ''} {cat}
                  </div>
                ))}
              </div>

              {timerActivo && (
                <div style={{ fontSize: '20px', fontWeight: 'bold', backgroundColor: tiempoRestante <= 10 ? '#e74c3c' : '#f1c40f', color: tiempoRestante <= 10 ? '#fff' : '#000', padding: '8px 20px', borderRadius: '15px', minWidth: '70px', textAlign: 'center' }}>
                  ⏱️ {tiempoRestante}s
                </div>
              )}
              {comodinDuelo[turno] && (
                <button onClick={usarComodinDuelo} style={{ padding: '8px 16px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  🃏 Jugador {turno}: usar comodín (50/50)
                </button>
              )}
            </div>
          )}

          {(modo === 'solo' && juegoTerminado) ? (
            <div style={{ textAlign: 'center', color: 'white' }}>
              <h2>💀 Perdiste tus 3 vidas</h2>
              <p>Puntaje final: <strong>{puntaje}</strong></p>
              <p>Récord: <strong>{record}</strong></p>
              <p style={{ color: '#ffdd57', fontWeight: 'bold' }}>Podrás volver a jugar en {MINUTOS_BLOQUEO} minutos.</p>
            </div>
          ) : (modo === 'duelo' && ganadorDuelo) ? (
            <div style={{ textAlign: 'center', color: 'white' }}>
              <h2>🏆 ¡Jugador {ganadorDuelo} ganó el duelo!</h2>
              <p>Reunió las {CATEGORIAS.length} coronas.</p>
              <button onClick={reiniciarDuelo} style={{ padding: '10px 24px', backgroundColor: '#4a90e2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                Jugar de nuevo
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ color: 'white' }}>{modo === 'solo' ? '¡Girá la Ruleta!' : `Turno del Jugador ${turno}: ¡Girá la Ruleta!`}</h2>
              {esReto && modo === 'duelo' && (
                <div style={{ backgroundColor: '#f39c12', color: '#fff', padding: '6px 14px', borderRadius: '10px', fontWeight: 'bold' }}>
                  ⚔️ ¡Reto por la corona!
                </div>
              )}
              <Wheel mustStartSpinning={mustSpin} prizeNumber={prizeNumber} data={data} onStopSpinning={handleStopSpinning} outerBorderColor="#ccc" outerBorderWidth={5} innerRadius={15} innerBorderColor="#ccc" innerBorderWidth={3} radiusLineColor="#fff" radiusLineWidth={2} />
              <button onClick={handleSpinClick} disabled={mustSpin} style={{ padding: '12px 30px', fontSize: '18px', cursor: 'pointer', backgroundColor: mustSpin ? '#ccc' : '#4a90e2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                {mustSpin ? 'Girando...' : '¡Girar Ruleta!'}
              </button>
              {cargando && <p style={{ color: 'white' }}>Cargando pregunta...</p>}
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '300px', maxWidth: '450px', width: '100%', marginTop: '50px' }}>
          {pregunta && !((modo === 'solo' && juegoTerminado) || (modo === 'duelo' && ganadorDuelo)) && (
            <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '12px', backgroundColor: '#f9f9f9', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ backgroundColor: '#eee', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{pregunta.categoria}</span>
                <span style={{ backgroundColor: '#ebd5ff', color: '#6b21a8', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Dificultad: {pregunta.dificultad}</span>
              </div>
              <h3 style={{ margin: '10px 0 20px 0', fontSize: '18px' }}>{pregunta.pregunta}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {opcionesMezcladas.filter((o) => !opcionesOcultas.includes(o)).map((opcion, index) => {
                  const esSeleccionada = opcionSeleccionada === opcion;
                  const esCorrecta = opcion === pregunta.respuesta_correcta;
                  let bg = '#fff';
                  let bc = '#ccc';
                  if (opcionSeleccionada && esSeleccionada) {
                    if (esCorrecta) { bg = '#d4edda'; bc = '#28a745'; }
                    else { bg = '#f8d7da'; bc = '#dc3545'; }
                  }
                  return (
                    <button key={index} onClick={() => verificarRespuesta(opcion)} disabled={!!opcionSeleccionada} style={{ padding: '12px', textAlign: 'left', backgroundColor: bg, border: `2px solid ${bc}`, borderRadius: '8px', cursor: opcionSeleccionada ? 'not-allowed' : 'pointer', fontSize: '15px' }}>
                      {opcion}
                    </button>
                  );
                })}
              </div>
              {resultado.tipo && (
                <div style={{ marginTop: '20px', padding: '12px', borderRadius: '8px', backgroundColor: resultado.tipo === 'correcto' ? '#d4edda' : '#f8d7da', color: resultado.tipo === 'correcto' ? '#155724' : '#721c24', fontWeight: 'bold', textAlign: 'center' }}>
                  {resultado.msg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}