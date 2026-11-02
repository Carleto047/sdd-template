import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import QRCode from 'qrcode';

// El backend está en la misma máquina/dirección desde donde se abrió el juego (puerto 8000).
// En la PC es "localhost"; en el celular es la IP de la PC (ej. 192.168.1.20).
// En tu PC (localhost) usa el backend local; en cualquier otro lado (celular, enlace público) usa Render.
const SERVIDOR = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? `http://${window.location.hostname}:8000`
  : 'https://preguntados-backend-ppdb.onrender.com';
const API = `${SERVIDOR}/api/v1/desafio`;

const CLAVE_NOMBRE = 'preguntados_nombre_jugador';
const CLAVE_BASE_COMPARTIR = 'preguntados_base_compartir';
const SONIDO_TIC = '/sounds/tiempo-restante.wav';

const EMOJI_CATEGORIA: Record<string, string> = {
  'Geografía': '🌍',
  'Ciencia': '🔬',
  'Historia': '📜',
  'Arte': '🎨',
  'Deportes': '⚽',
  'Entretenimiento': '🎬',
  'IESETyFP': '🎓',
};

// ---------------------------------------------------------------- tipos
interface PreguntaDesafio {
  id: number;
  categoria: string;
  pregunta: string;
  opciones: string[];
  tiempo_limite: number;
}

interface RespuestaEnviada {
  pregunta_id: number;
  opcion: string | null;
  tiempo_ms: number;
}

interface DetalleRespuesta {
  pregunta_id: number;
  categoria: string;
  pregunta: string;
  opcion_elegida: string | null;
  respuesta_correcta: string;
  correcta: boolean;
  tiempo_ms: number;
}

interface ResultadoJugador {
  nombre: string;
  aciertos: number;
  total: number;
  tiempo_total_ms: number;
  tiempo_total_seg: number;
  detalle: DetalleRespuesta[];
}

interface Reporte {
  codigo: string;
  estado: 'esperando_rival' | 'finalizado';
  yo: ResultadoJugador;
  rival: ResultadoJugador | null;
  ganador: 'yo' | 'rival' | 'empate' | null;
  criterio: string | null;
}

interface InfoDesafio {
  codigo: string;
  total: number;
  terminados: number;
  preguntas: PreguntaDesafio[];
}

interface SesionDesafio {
  jugador_id: string;
  nombre: string;
  terminado: boolean;
}

type Fase = 'inicio' | 'sala' | 'jugando' | 'enviando' | 'reporte';

// ---------------------------------------------------------------- utilidades
const leer = (almacen: Storage, clave: string): string | null => {
  try { return almacen.getItem(clave); } catch { return null; }
};

const escribir = (almacen: Storage, clave: string, valor: string) => {
  try { almacen.setItem(clave, valor); } catch { /* sin almacenamiento: no pasa nada */ }
};

// crypto.randomUUID no existe en http://IP (no es "contexto seguro"), por eso se arma a mano
const generarId = () => 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

// La sesión se guarda por pestaña (sessionStorage): así dos pestañas de la misma PC pueden ser dos jugadores
const claveSesion = (codigo: string) => `preguntados_desafio_${codigo}`;

const leerSesion = (codigo: string): SesionDesafio | null => {
  const crudo = leer(sessionStorage, claveSesion(codigo));
  if (!crudo) return null;
  try { return JSON.parse(crudo) as SesionDesafio; } catch { return null; }
};

const guardarSesion = (codigo: string, sesion: SesionDesafio) => {
  escribir(sessionStorage, claveSesion(codigo), JSON.stringify(sesion));
};

const leerCodigoDeUrl = (): string =>
  (new URLSearchParams(window.location.search).get('desafio') ?? '').trim().toUpperCase();

const leerRetomada = (): { codigo: string; sesion: SesionDesafio } | null => {
  const codigo = leerCodigoDeUrl();
  if (!codigo) return null;
  const sesion = leerSesion(codigo);
  return sesion && sesion.terminado ? { codigo, sesion } : null;
};

const reproducir = (ruta: string) => {
  new Audio(ruta).play().catch(() => {});
};

const segundos = (ms: number) => (ms / 1000).toFixed(1) + ' s';

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado');

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}${ruta}`, opciones);
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está prendido el backend y estás en la misma red?');
  }
  if (!respuesta.ok) {
    let detalle = `Error ${respuesta.status}`;
    try {
      const cuerpo = await respuesta.json();
      if (cuerpo && typeof cuerpo.detail === 'string') detalle = cuerpo.detail;
    } catch { /* el servidor no mandó detalle */ }
    throw new Error(detalle);
  }
  return respuesta.json() as Promise<T>;
}

const estiloInput: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '14px 16px', fontSize: '17px', fontFamily: 'inherit',
  border: '2px solid #cbd5e1', borderRadius: '14px', outline: 'none', color: '#1e293b', background: '#fff',
};

const estiloBotonSecundario: CSSProperties = {
  padding: '12px 18px', borderRadius: '14px', border: '2px solid #6366f1', background: '#fff', color: '#4f46e5',
  fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
  display: 'inline-block', textAlign: 'center',
};

// ---------------------------------------------------------------- componente
export default function Desafio() {
  const [retomada] = useState(() => leerRetomada());

  const [fase, setFase] = useState<Fase>(retomada ? 'reporte' : 'inicio');
  const [nombre, setNombre] = useState<string>(() => retomada?.sesion.nombre ?? leer(localStorage, CLAVE_NOMBRE) ?? '');
  const [codigoEscrito, setCodigoEscrito] = useState<string>(() => leerCodigoDeUrl());
  const [codigo, setCodigo] = useState<string>(retomada?.codigo ?? '');
  const [jugadorId, setJugadorId] = useState<string>(retomada?.sesion.jugador_id ?? '');
  const [preguntas, setPreguntas] = useState<PreguntaDesafio[]>([]);
  const [indice, setIndice] = useState(0);
  const [reloj, setReloj] = useState<{ i: number; ms: number }>({ i: -1, ms: 0 });
  const [elegida, setElegida] = useState<string | null>(null);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [copiado, setCopiado] = useState(false);

  const esLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const [baseCompartir, setBaseCompartir] = useState<string>(() =>
    esLocal ? (leer(localStorage, CLAVE_BASE_COMPARTIR) ?? window.location.origin) : window.location.origin
  );

  const inicioRef = useRef(0);
  const bloqueadoRef = useRef(false);
  const ticRef = useRef(false);
  const respuestasRef = useRef<RespuestaEnviada[]>([]);
  const avanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enlace = `${baseCompartir.trim().replace(/\/+$/, '')}/?desafio=${codigo}`;
  const textoCompartir =
    `¡Te desafío a Preguntados! 🎯 14 preguntas: gana quien acierte más (si empatan, el más rápido). ` +
    `Entrá acá: ${enlace}  (código: ${codigo})`;

  // ---------- limpieza al salir de la pantalla
  useEffect(() => {
    return () => { if (avanceRef.current) clearTimeout(avanceRef.current); };
  }, []);

  // ---------- QR del enlace
  useEffect(() => {
    if (!codigo || (fase !== 'sala' && fase !== 'reporte')) return;
    let activo = true;
    QRCode.toDataURL(enlace, { width: 240, margin: 1 })
      .then((url: string) => { if (activo) setQrUrl(url); })
      .catch(() => { if (activo) setQrUrl(''); });
    return () => { activo = false; };
  }, [codigo, enlace, fase]);

  // ---------- reloj de cada pregunta
  useEffect(() => {
    if (fase !== 'jugando') return;
    const pregunta = preguntas[indice];
    if (!pregunta) return;
    const limite = pregunta.tiempo_limite * 1000;
    inicioRef.current = Date.now();
    bloqueadoRef.current = false;
    ticRef.current = false;

    const intervalo = setInterval(() => {
      const restante = limite - (Date.now() - inicioRef.current);
      if (restante <= 0) {
        clearInterval(intervalo);
        registrar(null);
      } else {
        setReloj({ i: indice, ms: restante });
        if (restante <= 6000 && !ticRef.current) {
          ticRef.current = true;
          reproducir(SONIDO_TIC);
        }
      }
    }, 100);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, indice]);

  // ---------- reporte (consulta cada 4 s mientras el rival no termine)
  useEffect(() => {
    if (fase !== 'reporte' || !codigo || !jugadorId) return;
    let activo = true;
    let temporizador: ReturnType<typeof setTimeout> | null = null;

    const cargar = async () => {
      try {
        const r = await pedir<Reporte>(`/${codigo}/reporte?jugador_id=${encodeURIComponent(jugadorId)}`);
        if (!activo) return;
        setReporte(r);
        setError('');
        if (r.estado === 'esperando_rival') temporizador = setTimeout(cargar, 4000);
      } catch (e) {
        if (!activo) return;
        setError(mensajeDe(e));
        temporizador = setTimeout(cargar, 6000);
      }
    };
    cargar();

    return () => {
      activo = false;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [fase, codigo, jugadorId]);

  // ---------- acciones
  const validarNombre = (): boolean => {
    if (!nombre.trim()) {
      setError('Escribí tu nombre para empezar.');
      return false;
    }
    escribir(localStorage, CLAVE_NOMBRE, nombre.trim());
    return true;
  };

  const entrarAlDesafio = async (codigoNuevo: string) => {
    const limpio = codigoNuevo.trim().toUpperCase();
    const info = await pedir<InfoDesafio>(`/${limpio}`);
    const previa = leerSesion(limpio);

    if (previa && previa.terminado) {
      setCodigo(info.codigo);
      setJugadorId(previa.jugador_id);
      setNombre(previa.nombre);
      setFase('reporte');
      return;
    }
    if (info.terminados >= 2 && !previa) {
      throw new Error('Este desafío ya tiene dos jugadores.');
    }

    const id = previa ? previa.jugador_id : generarId();
    guardarSesion(limpio, { jugador_id: id, nombre: nombre.trim(), terminado: false });
    setCodigo(info.codigo);
    setJugadorId(id);
    setPreguntas(info.preguntas);
    setFase('sala');
  };

  const crearDesafio = async () => {
    setError('');
    if (!validarNombre()) return;
    setOcupado(true);
    try {
      const creado = await pedir<{ codigo: string; total: number }>('', { method: 'POST' });
      await entrarAlDesafio(creado.codigo);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setOcupado(false);
    }
  };

  const unirse = async () => {
    setError('');
    if (!validarNombre()) return;
    if (codigoEscrito.trim().length < 4) {
      setError('Escribí el código del desafío.');
      return;
    }
    setOcupado(true);
    try {
      await entrarAlDesafio(codigoEscrito);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setOcupado(false);
    }
  };

  const empezarPartida = () => {
    respuestasRef.current = [];
    bloqueadoRef.current = false;
    setIndice(0);
    setElegida(null);
    setError('');
    setFase('jugando');
  };

  const enviarResultado = async () => {
    setError('');
    try {
      await pedir(`/${codigo}/resultado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jugador_id: jugadorId,
          nombre: nombre.trim() || 'Jugador',
          respuestas: respuestasRef.current,
        }),
      });
      guardarSesion(codigo, { jugador_id: jugadorId, nombre: nombre.trim(), terminado: true });
      setFase('reporte');
    } catch (e) {
      const texto = mensajeDe(e);
      if (texto.startsWith('Ya enviaste')) {
        guardarSesion(codigo, { jugador_id: jugadorId, nombre: nombre.trim(), terminado: true });
        setFase('reporte');
        return;
      }
      setError(texto);
    }
  };

  const finalizar = async () => {
    setFase('enviando');
    await enviarResultado();
  };

  // Registra la respuesta (opcion = null cuando se acaba el tiempo) y pasa a la siguiente
  const registrar = (opcion: string | null) => {
    if (bloqueadoRef.current) return;
    bloqueadoRef.current = true;

    const pregunta = preguntas[indice];
    const limite = pregunta.tiempo_limite * 1000;
    const tiempo = opcion === null ? limite : Math.min(Date.now() - inicioRef.current, limite);
    respuestasRef.current.push({ pregunta_id: pregunta.id, opcion, tiempo_ms: Math.round(tiempo) });

    setElegida(opcion === null ? '__TIEMPO__' : opcion);
    avanceRef.current = setTimeout(() => {
      setElegida(null);
      if (indice + 1 >= preguntas.length) finalizar();
      else setIndice(indice + 1);
    }, opcion === null ? 900 : 450);
  };

  const volverAlInicio = () => {
    if (avanceRef.current) clearTimeout(avanceRef.current);
    window.history.replaceState({}, '', window.location.pathname);
    setFase('inicio');
    setCodigo('');
    setJugadorId('');
    setCodigoEscrito('');
    setPreguntas([]);
    setReporte(null);
    setQrUrl('');
    setError('');
  };

  const copiarEnlace = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(enlace);
      ok = true;
    } catch { /* sin permiso o sin https: se prueba el método clásico */ }
    if (!ok) {
      try {
        const caja = document.createElement('textarea');
        caja.value = enlace;
        caja.style.position = 'fixed';
        caja.style.opacity = '0';
        document.body.appendChild(caja);
        caja.select();
        ok = document.execCommand('copy');
        document.body.removeChild(caja);
      } catch { /* nada más que hacer */ }
    }
    setCopiado(ok);
    if (ok) setTimeout(() => setCopiado(false), 2000);
  };

  const compartirNativo = async () => {
    try {
      await navigator.share({ title: 'Desafío Preguntados', text: textoCompartir });
    } catch { /* el usuario canceló */ }
  };

  const cambiarBase = (valor: string) => {
    setBaseCompartir(valor);
    escribir(localStorage, CLAVE_BASE_COMPARTIR, valor);
  };

  // ---------- piezas de pantalla
  const bloqueError = error ? (
    <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 14px', borderRadius: '12px', fontWeight: 600, fontSize: '14px' }}>
      {error}
    </div>
  ) : null;

  const panelCompartir = (
    <div style={{ background: '#f1f5f9', borderRadius: '18px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      <div style={{ fontSize: '14px', color: '#475569' }}>Código del desafío</div>
      <div style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '6px', color: '#4f46e5' }}>{codigo}</div>

      {esLocal && (
        <div style={{ width: '100%', background: '#fef9c3', color: '#713f12', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span>
            📍 Estás en esta PC (localhost). Para que tu rival entre desde otro celular, escribí abajo la dirección de tu PC
            en la red, por ejemplo <strong>http://192.168.1.20:5173</strong>.
          </span>
          <input
            value={baseCompartir}
            onChange={(e) => cambiarBase(e.target.value)}
            style={{ ...estiloInput, padding: '10px 12px', fontSize: '14px' }}
            aria-label="Dirección de tu PC en la red"
          />
        </div>
      )}

      <input
        readOnly
        value={enlace}
        onFocus={(e) => e.target.select()}
        style={{ ...estiloInput, padding: '10px 12px', fontSize: '13px' }}
        aria-label="Enlace del desafío"
      />

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={copiarEnlace} style={estiloBotonSecundario}>{copiado ? '✅ Copiado' : '📋 Copiar enlace'}</button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(textoCompartir)}`}
          target="_blank"
          rel="noreferrer"
          style={{ ...estiloBotonSecundario, borderColor: '#16a34a', color: '#15803d' }}
        >
          💬 WhatsApp
        </a>
        {'share' in navigator && (
          <button onClick={compartirNativo} style={estiloBotonSecundario}>📤 Compartir…</button>
        )}
      </div>

      {qrUrl && (
        <div style={{ textAlign: 'center' }}>
          <img src={qrUrl} alt="QR del desafío" width={200} height={200} style={{ borderRadius: '12px', background: '#fff', padding: '6px' }} />
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Escaneá con la cámara del celular</div>
        </div>
      )}
    </div>
  );

  // ---------- pantallas
  const pantallaInicio = (
    <>
      <h2 style={{ margin: 0, textAlign: 'center', color: '#312e81' }}>📱 Desafío de 14 preguntas</h2>
      <p style={{ margin: 0, textAlign: 'center', color: '#475569', fontSize: '15px' }}>
        Dos jugadores, las mismas 14 preguntas. Gana quien acierte más; si empatan, el que haya tardado menos.
        Cada uno juega cuando quiere y al terminar ve el reporte del otro.
      </p>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Tu nombre"
        maxLength={30}
        style={estiloInput}
        aria-label="Tu nombre"
      />
      <button className="girar-btn" onClick={crearDesafio} disabled={ocupado}>
        {ocupado ? 'Un momento…' : '➕ Crear desafío nuevo'}
      </button>
      <div style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>— o —</div>
      <input
        value={codigoEscrito}
        onChange={(e) => setCodigoEscrito(e.target.value.toUpperCase())}
        placeholder="Código del desafío (ej. K7M2QX)"
        maxLength={6}
        style={{ ...estiloInput, textAlign: 'center', letterSpacing: '4px', fontWeight: 700 }}
        aria-label="Código del desafío"
      />
      <button onClick={unirse} disabled={ocupado} style={{ ...estiloBotonSecundario, fontSize: '17px', padding: '14px' }}>
        🎯 Unirme con código
      </button>
    </>
  );

  const pantallaSala = (
    <>
      <h2 style={{ margin: 0, textAlign: 'center', color: '#312e81' }}>¡Todo listo, {nombre.trim() || 'jugador'}!</h2>
      <p style={{ margin: 0, textAlign: 'center', color: '#475569' }}>
        {preguntas.length} preguntas, las mismas para tu rival. El tiempo de cada pregunta corre apenas aparece.
      </p>
      {panelCompartir}
      <button className="girar-btn" onClick={empezarPartida}>▶ Empezar mi partida</button>
      <button onClick={volverAlInicio} style={estiloBotonSecundario}>← Volver</button>
    </>
  );

  const pregunta = preguntas[indice];
  const limiteMs = pregunta ? pregunta.tiempo_limite * 1000 : 1;
  const restanteMs = reloj.i === indice ? reloj.ms : limiteMs;
  const porcentajeTiempo = Math.max(0, Math.min(100, (restanteMs / limiteMs) * 100));

  const pantallaJugando = pregunta ? (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ backgroundColor: '#e0e7ff', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 700, color: '#3730a3' }}>
          {EMOJI_CATEGORIA[pregunta.categoria] ?? '❓'} {pregunta.categoria}
        </span>
        <span style={{ fontWeight: 700, color: '#475569' }}>Pregunta {indice + 1} / {preguntas.length}</span>
        <span style={{ fontSize: '20px', fontWeight: 700, color: porcentajeTiempo < 30 ? '#dc2626' : '#d97706' }}>
          ⏱️ {Math.ceil(restanteMs / 1000)} s
        </span>
      </div>

      <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${porcentajeTiempo}%`, background: porcentajeTiempo < 30 ? '#ef4444' : '#f59e0b', transition: 'width 0.1s linear' }} />
      </div>

      <h3 style={{ margin: '6px 0 6px 0', fontSize: '20px', color: '#1e293b', lineHeight: 1.4 }}>{pregunta.pregunta}</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {pregunta.opciones.map((opcion) => {
          const seleccionada = elegida === opcion;
          return (
            <button
              key={opcion}
              className="opcion-btn"
              disabled={elegida !== null}
              onClick={() => registrar(opcion)}
              style={{
                backgroundColor: seleccionada ? '#e0e7ff' : '#ffffff',
                border: `2px solid ${seleccionada ? '#6366f1' : '#e2e8f0'}`,
                color: '#1e293b',
              }}
            >
              {opcion}
            </button>
          );
        })}
      </div>

      {elegida === '__TIEMPO__' && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '12px', textAlign: 'center', fontWeight: 700 }}>
          ⏱️ ¡Se acabó el tiempo!
        </div>
      )}
    </>
  ) : null;

  const pantallaEnviando = (
    <>
      <h2 style={{ margin: 0, textAlign: 'center', color: '#312e81' }}>
        {error ? 'No se pudo enviar tu resultado' : 'Enviando tu resultado…'}
      </h2>
      {bloqueError}
      {error && (
        <button className="girar-btn" onClick={enviarResultado}>🔄 Reintentar</button>
      )}
    </>
  );

  const renderFilaDetalle = (mio: DetalleRespuesta) => {
    const delRival = reporte?.rival?.detalle.find((d) => d.pregunta_id === mio.pregunta_id);
    const linea = (quien: string, d: DetalleRespuesta) => (
      <div style={{ fontSize: '13px', color: d.correcta ? '#166534' : '#991b1b' }}>
        {d.correcta ? '✅' : '❌'} <strong>{quien}:</strong> {d.opcion_elegida ?? 'sin responder'} · {segundos(d.tiempo_ms)}
      </div>
    );
    return (
      <div key={mio.pregunta_id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
          {EMOJI_CATEGORIA[mio.categoria] ?? '❓'} {mio.pregunta}
        </div>
        <div style={{ fontSize: '13px', color: '#475569' }}>Respuesta correcta: <strong>{mio.respuesta_correcta}</strong></div>
        {linea('Vos', mio)}
        {delRival && linea(reporte?.rival?.nombre ?? 'Rival', delRival)}
      </div>
    );
  };

  const tarjetaResumen = (titulo: string, r: ResultadoJugador, destacada: boolean) => (
    <div style={{ flex: '1 1 150px', background: destacada ? '#e0e7ff' : '#f1f5f9', border: `2px solid ${destacada ? '#6366f1' : '#e2e8f0'}`, borderRadius: '16px', padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '13px', color: '#64748b' }}>{titulo}</div>
      <div style={{ fontWeight: 700, fontSize: '17px', color: '#1e293b', wordBreak: 'break-word' }}>{r.nombre}</div>
      <div style={{ fontSize: '26px', fontWeight: 700, color: '#4f46e5' }}>✅ {r.aciertos}/{r.total}</div>
      <div style={{ fontSize: '15px', color: '#475569' }}>⏱️ {r.tiempo_total_seg} s</div>
    </div>
  );

  const pantallaReporte = (
    <>
      {!reporte ? (
        <>
          <h2 style={{ margin: 0, textAlign: 'center', color: '#312e81' }}>Cargando reporte…</h2>
          {bloqueError}
          {error && <button onClick={volverAlInicio} style={estiloBotonSecundario}>← Volver al inicio</button>}
        </>
      ) : (
        <>
          {reporte.estado === 'esperando_rival' || !reporte.rival ? (
            <div style={{ background: '#fef9c3', color: '#713f12', padding: '14px', borderRadius: '14px', textAlign: 'center', fontWeight: 700 }}>
              ⏳ Esperando a que tu rival termine…
              <div style={{ fontWeight: 400, fontSize: '13px', marginTop: '4px' }}>
                Cuando termine vas a ver acá su reporte y quién ganó. Esta pantalla se actualiza sola.
              </div>
            </div>
          ) : (
            <div style={{ background: reporte.ganador === 'yo' ? '#dcfce7' : reporte.ganador === 'rival' ? '#fee2e2' : '#e0e7ff', padding: '14px', borderRadius: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
                {reporte.ganador === 'yo' && `🏆 ¡Ganaste, ${reporte.yo.nombre}!`}
                {reporte.ganador === 'rival' && `😅 Ganó ${reporte.rival.nombre}`}
                {reporte.ganador === 'empate' && '🤝 ¡Empate total!'}
              </div>
              {reporte.criterio && <div style={{ fontSize: '14px', color: '#475569' }}>Definió: {reporte.criterio}</div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {tarjetaResumen('Vos', reporte.yo, true)}
            {reporte.rival && tarjetaResumen('Tu rival', reporte.rival, false)}
          </div>

          {reporte.estado === 'esperando_rival' && panelCompartir}

          <h3 style={{ margin: '4px 0 0 0', color: '#312e81' }}>Detalle pregunta por pregunta</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reporte.yo.detalle.map(renderFilaDetalle)}
          </div>

          {bloqueError}
          <button className="girar-btn" onClick={volverAlInicio}>🏠 Volver al inicio</button>
        </>
      )}
    </>
  );

  return (
    <div
      className="main-card-game"
      style={{ maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {(fase === 'inicio' || fase === 'sala') && bloqueError}
      {fase === 'inicio' && pantallaInicio}
      {fase === 'sala' && pantallaSala}
      {fase === 'jugando' && pantallaJugando}
      {fase === 'enviando' && pantallaEnviando}
      {fase === 'reporte' && pantallaReporte}
    </div>
  );
}
