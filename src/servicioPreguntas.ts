// Cómo se consiguen las preguntas, a prueba de fallos:
//   1) Se piden al servidor (Render) con un tiempo máximo de espera.
//   2) Si el servidor está dormido, caído o bloquea al celular (CORS), se usan las preguntas
//      REALES guardadas en el propio juego (public/preguntas.json). Nunca se inventan preguntas.

export interface PreguntaJuego {
  id: number;
  categoria: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
  dificultad: string;
  tiempo_limite: number;
  origen: 'servidor' | 'local';
}

export type EstadoServidor = 'conectando' | 'en_linea' | 'sin_conexion';

interface PreguntaBanco {
  id: number;
  categoria: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
  dificultad?: string;
}

const TIEMPOS_POR_DIFICULTAD: Record<string, number> = { facil: 15, normal: 30, dificil: 40 };
const ESPERA_SERVIDOR_MS = 12000; // si Render tarda más (está "durmiendo"), se sigue con las preguntas locales

let banco: PreguntaBanco[] | null = null;
let cargaBanco: Promise<PreguntaBanco[]> | null = null;

async function fetchConLimite(url: string, ms: number): Promise<Response> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ms);
  try {
    return await fetch(url, { signal: control.signal });
  } finally {
    clearTimeout(reloj);
  }
}

const esPreguntaValida = (p: Partial<PreguntaBanco> | null | undefined): p is PreguntaBanco =>
  !!p &&
  typeof p.id === 'number' &&
  typeof p.pregunta === 'string' &&
  Array.isArray(p.opciones) &&
  p.opciones.length >= 2 &&
  typeof p.respuesta_correcta === 'string' &&
  p.opciones.includes(p.respuesta_correcta);

export async function cargarBancoLocal(): Promise<PreguntaBanco[]> {
  if (banco) return banco;
  if (!cargaBanco) {
    cargaBanco = fetchConLimite('/preguntas.json', 15000)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const lista: Partial<PreguntaBanco>[] = Array.isArray(json) ? json : (json?.preguntas ?? []);
        banco = lista.filter(esPreguntaValida);
        return banco;
      })
      .catch((e) => {
        cargaBanco = null; // para poder reintentar la próxima vez
        throw e;
      });
  }
  return cargaBanco;
}

function elegirDelBanco(lista: PreguntaBanco[], categoria: string, recientes: number[]): PreguntaJuego | null {
  const deCategoria = lista.filter((p) => p.categoria === categoria);
  if (deCategoria.length === 0) return null;
  const nuevas = deCategoria.filter((p) => !recientes.includes(p.id));
  const grupo = nuevas.length > 0 ? nuevas : deCategoria;
  const p = grupo[Math.floor(Math.random() * grupo.length)];
  const dificultad = p.dificultad ?? 'normal';
  return {
    id: p.id,
    categoria: p.categoria,
    pregunta: p.pregunta,
    opciones: p.opciones,
    respuesta_correcta: p.respuesta_correcta,
    dificultad,
    tiempo_limite: TIEMPOS_POR_DIFICULTAD[dificultad] ?? 30,
    origen: 'local',
  };
}

async function pedirAlServidor(base: string, categoria: string): Promise<PreguntaJuego> {
  // Sin cabeceras especiales: así el navegador no hace la consulta previa (preflight) y hay menos cosas que fallen
  const r = await fetchConLimite(`${base}/api/v1/question/random/${encodeURIComponent(categoria)}`, ESPERA_SERVIDOR_MS);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const crudo = await r.json();
  const tiempoServidor: unknown = crudo?.tiempo_limite;
  if (!esPreguntaValida(crudo)) throw new Error('El servidor devolvió una pregunta inválida');
  const dificultad = crudo.dificultad ?? 'normal';
  return {
    id: crudo.id,
    categoria: crudo.categoria ?? categoria,
    pregunta: crudo.pregunta,
    opciones: crudo.opciones,
    respuesta_correcta: crudo.respuesta_correcta,
    dificultad,
    tiempo_limite: typeof tiempoServidor === 'number' ? tiempoServidor : TIEMPOS_POR_DIFICULTAD[dificultad] ?? 30,
    origen: 'servidor',
  };
}

export async function obtenerPregunta(
  base: string,
  categoria: string,
  recientes: number[],
  avisar?: (estado: EstadoServidor) => void
): Promise<PreguntaJuego> {
  let ultimoError: unknown = null;

  // Hasta 3 intentos en el servidor para no repetir una pregunta reciente
  for (let intento = 0; intento < 3; intento++) {
    try {
      const p = await pedirAlServidor(base, categoria);
      avisar?.('en_linea');
      if (!recientes.includes(p.id) || intento === 2) return p;
    } catch (e) {
      ultimoError = e;
      break; // si el servidor falla, no se insiste: se pasa a las preguntas guardadas
    }
  }

  console.warn('Servidor no disponible: se usan las preguntas guardadas en el dispositivo.', ultimoError);
  avisar?.('sin_conexion');
  const lista = await cargarBancoLocal();
  const p = elegirDelBanco(lista, categoria, recientes);
  if (!p) throw new Error(`No hay preguntas guardadas de ${categoria}`);
  return p;
}

// Despierta al servidor apenas se abre el juego (Render gratis se duerme tras unos minutos sin uso)
// y avisa el estado. Devuelve una función para cancelar.
export function despertarServidor(base: string, avisar: (estado: EstadoServidor) => void): () => void {
  let activo = true;
  let intentos = 0;
  let temporizador: ReturnType<typeof setTimeout> | null = null;

  const probar = async () => {
    if (!activo) return;
    intentos++;
    try {
      const r = await fetchConLimite(`${base}/api/v1/question/random/Arte`, 20000);
      if (!activo) return;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      avisar('en_linea');
    } catch {
      if (!activo) return;
      avisar(intentos >= 3 ? 'sin_conexion' : 'conectando');
      if (intentos < 8) temporizador = setTimeout(probar, 5000);
    }
  };

  probar();

  return () => {
    activo = false;
    if (temporizador) clearTimeout(temporizador);
  };
}