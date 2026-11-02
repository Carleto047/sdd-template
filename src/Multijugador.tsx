import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Multijugador.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://preguntados-backend-ppdb.onrender.com').replace(/\/+$/, '');
const CATEGORIAS = ['Geografía', 'Ciencia', 'Historia', 'Arte', 'Deportes', 'Entretenimiento', 'IESETyFP'];

type Modo = '1v1' | 'desafio';
type Sesion = { codigo_sala: string; jugador_id: 1 | 2; token_jugador: string; nombre: string; tipo_modo: Modo };
type Pregunta = { id: number; indice: number; categoria: string; pregunta: string; opciones: string[]; dificultad: string; tiempo_limite: number; segundos_restantes: number };
type JugadorReporte = { id: number; nombre: string; puntos: number; aciertos: number; respondidas: number; total_preguntas: number; tiempo_total_segundos: number };
type EstadoSala = {
  codigo_sala: string; estado: 'esperando' | 'jugando' | 'finalizado'; tipo_modo: Modo; categoria: string;
  jugador_id: number; jugador_1: string; jugador_2: string | null; puntaje_1: number; puntaje_2: number;
  progreso_1: number; progreso_2: number; tiempo_total_1: number; tiempo_total_2: number;
  terminado_1: boolean; terminado_2: boolean; turno_actual: number; indice_pregunta: number;
  total_preguntas: number; puede_responder: boolean; pregunta_actual: Pregunta | null;
  reporte: { ganador: string; motivo: string; modo: Modo; jugadores: JugadorReporte[] } | null;
};

type ApiError = { detail?: string };

async function api<T>(ruta: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${ruta}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const contenido = await response.json().catch(() => ({} as ApiError));
  if (!response.ok) {
    const error = contenido as ApiError;
    throw new Error(error.detail || `Error del servidor (${response.status})`);
  }
  return contenido as T;
}

function guardarSesion(sesion: Sesion) {
  sessionStorage.setItem(`preguntados-sala-${sesion.codigo_sala}`, JSON.stringify(sesion));
}

function leerSesion(codigo: string): Sesion | null {
  try {
    const raw = sessionStorage.getItem(`preguntados-sala-${codigo}`);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

function enlaceSala(codigo: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('sala', codigo);
  return url.toString();
}

export default function Multijugador() {
  const codigoInicial = useMemo(() => new URLSearchParams(window.location.search).get('sala')?.replace(/\D/g, '').slice(0, 6) || '', []);
  const [modo, setModo] = useState<Modo>('1v1');
  const [categoria, setCategoria] = useState('Ciencia');
  const [nombreCrear, setNombreCrear] = useState('');
  const [nombreUnir, setNombreUnir] = useState('');
  const [codigo, setCodigo] = useState(codigoInicial);
  const [sesion, setSesion] = useState<Sesion | null>(() => codigoInicial ? leerSesion(codigoInicial) : null);
  const [estado, setEstado] = useState<EstadoSala | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [opcionElegida, setOpcionElegida] = useState('');
  const [respuestaEnviando, setRespuestaEnviando] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(30);
  const inicioPreguntaRef = useRef<number>(Date.now());
  const clavePreguntaRef = useRef<string>('');
  const enviandoRef = useRef(false);
  const ultimaPreguntaRef = useRef<string>('');

  const cargarEstado = useCallback(async () => {
    if (!sesion) return;
    const qs = new URLSearchParams({ jugador_id: String(sesion.jugador_id) });
    const data = await api<EstadoSala>(`/api/v1/desafios/estado/${sesion.codigo_sala}?${qs.toString()}`, {
      headers: { 'X-Player-Token': sesion.token_jugador },
    });
    setEstado(data);
    setError('');
  }, [sesion]);

  useEffect(() => {
    if (!sesion) return;
    let activo = true;
    let enVuelo = false;
    const consultar = async () => {
      if (enVuelo || !activo) return;
      enVuelo = true;
      try {
        await cargarEstado();
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudo actualizar la sala.');
      } finally {
        enVuelo = false;
      }
    };
    void consultar();
    const intervalo = window.setInterval(consultar, 1200);
    return () => { activo = false; window.clearInterval(intervalo); };
  }, [sesion, cargarEstado]);

  const pregunta = estado?.pregunta_actual || null;
  const clavePregunta = estado && pregunta ? `${estado.codigo_sala}:${sesion?.jugador_id}:${pregunta.indice}` : '';

  useEffect(() => {
    if (clavePregunta && clavePregunta !== clavePreguntaRef.current) {
      clavePreguntaRef.current = clavePregunta;
      inicioPreguntaRef.current = Date.now() + (pregunta?.segundos_restantes ?? pregunta?.tiempo_limite ?? 30) * 1000;
      setOpcionElegida('');
      setRespuestaEnviando(false);
      enviandoRef.current = false;
      ultimaPreguntaRef.current = '';
      setTiempoRestante(pregunta?.tiempo_limite || 30);
    }
  }, [clavePregunta, pregunta?.tiempo_limite, pregunta?.segundos_restantes]);

  const responder = useCallback(async (opcion: string) => {
    if (!sesion || !estado || !pregunta || !estado.puede_responder || enviandoRef.current) return;
    const chave = `${estado.codigo_sala}:${sesion.jugador_id}:${pregunta.indice}`;
    if (ultimaPreguntaRef.current === chave) return;
    enviandoRef.current = true;
    ultimaPreguntaRef.current = chave;
    setRespuestaEnviando(true);
    setOpcionElegida(opcion);
    try {
      const qs = await api<{ correcta: boolean; tiempo_agotado: boolean; respuesta_correcta: string; mensaje: string }>(
        `/api/v1/desafios/responder/${sesion.codigo_sala}`,
        {
          method: 'POST',
          headers: { 'X-Player-Token': sesion.token_jugador },
          body: JSON.stringify({
            jugador_id: sesion.jugador_id,
            indice_pregunta: pregunta.indice,
            opcion,
            tiempo_empleado: 0,
          }),
        },
      );
      setAviso(qs.tiempo_agotado ? `Tiempo agotado. La respuesta era: ${qs.respuesta_correcta}` : qs.correcta ? '¡Respuesta correcta! +10 puntos' : `Respuesta incorrecta. La respuesta era: ${qs.respuesta_correcta}`);
      await cargarEstado();
    } catch (e) {
      ultimaPreguntaRef.current = '';
      enviandoRef.current = false;
      setError(e instanceof Error ? e.message : 'No se pudo enviar la respuesta.');
      setRespuestaEnviando(false);
    }
  }, [sesion, estado, pregunta, cargarEstado]);

  useEffect(() => {
    if (!pregunta || !estado?.puede_responder || respuestaEnviando) return;
    const actualizar = () => {
      const restante = Math.max(0, Math.ceil((inicioPreguntaRef.current - Date.now()) / 1000));
      setTiempoRestante(restante);
      if (restante <= 0 && !enviandoRef.current) void responder('');
    };
    actualizar();
    const intervalo = window.setInterval(actualizar, 250);
    return () => window.clearInterval(intervalo);
  }, [pregunta?.indice, pregunta?.tiempo_limite, estado?.puede_responder, respuestaEnviando, responder]);

  const crearSala = async () => {
    if (!nombreCrear.trim()) { setError('Escribí tu nombre antes de crear la sala.'); return; }
    setCargando(true); setError(''); setAviso('');
    try {
      const data = await api<{ codigo_sala: string; jugador_id: 1; token_jugador: string; tipo_modo: Modo }>('/api/v1/desafios/crear', {
        method: 'POST', body: JSON.stringify({ nombre_jugador: nombreCrear.trim(), categoria, tipo_modo: modo }),
      });
      const nuevaSesion: Sesion = { codigo_sala: data.codigo_sala, jugador_id: 1, token_jugador: data.token_jugador, nombre: nombreCrear.trim(), tipo_modo: data.tipo_modo };
      guardarSesion(nuevaSesion); setSesion(nuevaSesion); setCodigo(data.codigo_sala); setEstado(null);
      window.history.replaceState({}, '', enlaceSala(data.codigo_sala));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear la sala.'); }
    finally { setCargando(false); }
  };

  const unirseSala = async () => {
    if (!nombreUnir.trim()) { setError('Escribí tu nombre para unirte.'); return; }
    if (!/^\d{6}$/.test(codigo)) { setError('El código debe tener exactamente 6 dígitos.'); return; }
    setCargando(true); setError(''); setAviso('');
    try {
      const data = await api<{ codigo_sala: string; jugador_id: 2; token_jugador: string; tipo_modo: Modo }>('/api/v1/desafios/unirse', {
        method: 'POST', body: JSON.stringify({ codigo_sala: codigo, nombre_jugador: nombreUnir.trim() }),
      });
      const nuevaSesion: Sesion = { codigo_sala: data.codigo_sala, jugador_id: 2, token_jugador: data.token_jugador, nombre: nombreUnir.trim(), tipo_modo: data.tipo_modo };
      guardarSesion(nuevaSesion); setSesion(nuevaSesion); setEstado(null);
      window.history.replaceState({}, '', enlaceSala(data.codigo_sala));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo ingresar a la sala.'); }
    finally { setCargando(false); }
  };

  const compartir = async () => {
    if (!sesion) return;
    const url = enlaceSala(sesion.codigo_sala);
    try {
      if (navigator.share) await navigator.share({ title: 'Partida de Preguntados', text: `Unite a mi partida. Código: ${sesion.codigo_sala}`, url });
      else { await navigator.clipboard.writeText(url); setAviso('Enlace copiado. Ahora podés enviarlo por WhatsApp.'); }
    } catch {
      try { await navigator.clipboard.writeText(url); setAviso('Enlace copiado. Ahora podés enviarlo por WhatsApp.'); }
      catch { setError(`Copiá este enlace: ${url}`); }
    }
  };

  const salirSala = () => {
    if (sesion) sessionStorage.removeItem(`preguntados-sala-${sesion.codigo_sala}`);
    setSesion(null); setEstado(null); setOpcionElegida(''); setError(''); setAviso('');
    const url = new URL(window.location.href); url.searchParams.delete('sala');
    window.history.replaceState({}, '', url.toString());
  };

  const progresoPropio = estado && sesion ? (sesion.jugador_id === 1 ? estado.progreso_1 : estado.progreso_2) : 0;
  const nombrePropio = estado && sesion ? (sesion.jugador_id === 1 ? estado.jugador_1 : (estado.jugador_2 || sesion.nombre)) : '';
  const esTurnoPropio = estado?.puede_responder || false;

  return (
    <section className="multi-page">
      <div className="multi-shell">
        <header className="multi-header">
          <div>
            <span className="multi-eyebrow">PREGUNTADOS ONLINE</span>
            <h1>Desafío entre jugadores</h1>
            <p>Jugá desde dos celulares diferentes con una sala compartida.</p>
          </div>
          <span className="multi-live"><i /> Conexión automática</span>
        </header>

        {error && <div className="multi-alert error" role="alert">{error}</div>}
        {aviso && <div className="multi-alert success" role="status">{aviso}</div>}

        {!sesion ? (
          <div className="multi-grid">
            <article className="multi-card">
              <div className="multi-card-icon">🏁</div>
              <h2>Crear una sala</h2>
              <p>Elegí el modo, escribí tu nombre y compartí el código con tu oponente.</p>
              <label htmlFor="nombre-crear">Tu nombre</label>
              <input id="nombre-crear" maxLength={24} value={nombreCrear} onChange={(e) => setNombreCrear(e.target.value)} placeholder="Ej.: Martina" />
              <label htmlFor="modo-online">Modo de juego</label>
              <select id="modo-online" value={modo} onChange={(e) => setModo(e.target.value as Modo)}>
                <option value="1v1">1 vs 1 — por turnos</option>
                <option value="desafio">Duelo — simultáneo</option>
              </select>
              <label htmlFor="categoria-online">Categoría de preguntas</label>
              <select id="categoria-online" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button className="multi-primary" disabled={cargando} onClick={crearSala}>{cargando ? 'Creando...' : 'Crear sala y obtener código'}</button>
            </article>

            <article className="multi-card multi-card-join">
              <div className="multi-card-icon">🔗</div>
              <h2>Unirse a una sala</h2>
              <p>Ingresá el código que te compartió el creador o abrí directamente su enlace.</p>
              <label htmlFor="codigo-sala">Código de 6 dígitos</label>
              <input id="codigo-sala" inputMode="numeric" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" />
              <label htmlFor="nombre-unir">Tu nombre</label>
              <input id="nombre-unir" maxLength={24} value={nombreUnir} onChange={(e) => setNombreUnir(e.target.value)} placeholder="Ej.: Lucas" />
              <button className="multi-secondary" disabled={cargando} onClick={unirseSala}>{cargando ? 'Ingresando...' : 'Unirme a la partida'}</button>
            </article>
          </div>
        ) : (
          <div className="multi-room">
            <div className="multi-room-top">
              <div>
                <span className="multi-eyebrow">SALA {sesion.codigo_sala}</span>
                <h2>{sesion.tipo_modo === '1v1' ? '1 vs 1 · Por turnos' : 'Duelo · Simultáneo'}</h2>
                <p>Jugás como <strong>{nombrePropio || sesion.nombre}</strong> · Jugador {sesion.jugador_id}</p>
              </div>
              <button className="multi-quiet" onClick={salirSala}>Salir de la sala</button>
            </div>

            {estado?.estado === 'esperando' && (
              <div className="multi-waiting">
                <div className="multi-spinner" />
                <h2>Esperando al segundo jugador</h2>
                <p>Compartí el código o el enlace. La partida comenzará cuando tu oponente se una.</p>
                <div className="multi-code">{sesion.codigo_sala}</div>
                <button className="multi-primary" onClick={compartir}>Compartir invitación</button>
              </div>
            )}

            {estado?.estado === 'jugando' && (
              <>
                <div className="multi-scoreboard">
                  <div className={sesion.jugador_id === 1 && (sesion.tipo_modo === 'desafio' || estado.turno_actual === 1) ? 'multi-player active' : 'multi-player'}>
                    <span>JUGADOR 1</span><strong>{estado.jugador_1}</strong><b>{estado.puntaje_1} pts</b><small>{estado.progreso_1}/{estado.total_preguntas} respondidas</small>
                  </div>
                  <div className="multi-versus">VS</div>
                  <div className={sesion.jugador_id === 2 && (sesion.tipo_modo === 'desafio' || estado.turno_actual === 2) ? 'multi-player active' : 'multi-player'}>
                    <span>JUGADOR 2</span><strong>{estado.jugador_2 || 'Esperando...'}</strong><b>{estado.puntaje_2} pts</b><small>{estado.progreso_2}/{estado.total_preguntas} respondidas</small>
                  </div>
                </div>

                {sesion.tipo_modo === '1v1' && (
                  <div className="multi-turn-banner">Turno actual: <strong>{estado.turno_actual === 1 ? estado.jugador_1 : estado.jugador_2}</strong>. Si acierta, conserva el turno; si falla, pasa al otro jugador.</div>
                )}
                {sesion.tipo_modo === 'desafio' && (
                  <div className="multi-turn-banner">Ambos reciben las mismas {estado.total_preguntas} preguntas en el mismo orden. Cada uno responde a su ritmo.</div>
                )}

                {pregunta && progresoPropio < estado.total_preguntas ? (
                  <article className="multi-question-card">
                    <div className="multi-question-meta"><span>{pregunta.categoria}</span><span>Pregunta {pregunta.indice + 1} de {estado.total_preguntas}</span></div>
                    <h2>{pregunta.pregunta}</h2>
                    {esTurnoPropio ? (
                      <>
                        <div className={tiempoRestante <= 8 ? 'multi-timer urgent' : 'multi-timer'}>⏱ {tiempoRestante}s</div>
                        <div className="multi-options">
                          {(pregunta.opciones || []).map((opcion, index) => (
                            <button key={`${index}-${opcion}`} disabled={respuestaEnviando} className={opcionElegida === opcion ? 'multi-option selected' : 'multi-option'} onClick={() => void responder(opcion)}>{opcion}</button>
                          ))}
                        </div>
                        {respuestaEnviando && <p className="multi-muted">Registrando tu respuesta...</p>}
                      </>
                    ) : (
                      <div className="multi-wait-turn">{sesion.tipo_modo === '1v1' ? 'Es el turno de tu oponente. La pregunta se actualizará automáticamente.' : 'Esperando la actualización de tu partida...'}</div>
                    )}
                  </article>
                ) : (
                  <div className="multi-waiting compact"><h2>¡Terminaste tus preguntas!</h2><p>Esperando que el otro jugador complete la partida.</p></div>
                )}
              </>
            )}

            {estado?.estado === 'finalizado' && estado.reporte && (
              <div className="multi-report">
                <div className="multi-trophy">🏆</div>
                <span className="multi-eyebrow">PARTIDA FINALIZADA</span>
                <h2>{estado.reporte.ganador === 'Empate' ? '¡Empate!' : `Ganó ${estado.reporte.ganador}`}</h2>
                <p>{estado.reporte.motivo}</p>
                <div className="multi-report-grid">
                  {estado.reporte.jugadores.map((jugador) => (
                    <div className="multi-report-player" key={jugador.id}>
                      <span>{jugador.nombre}</span><strong>{jugador.puntos} puntos</strong>
                      <small>{jugador.aciertos} aciertos · {jugador.respondidas}/{jugador.total_preguntas} preguntas</small>
                      <small>Tiempo: {jugador.tiempo_total_segundos.toFixed(2)} segundos</small>
                    </div>
                  ))}
                </div>
                <button className="multi-primary" onClick={salirSala}>Volver al menú multijugador</button>
              </div>
            )}
          </div>
        )}
        <footer className="multi-footer">Las salas se actualizan automáticamente. No cierres esta pestaña mientras estés jugando.</footer>
      </div>
    </section>
  );
}