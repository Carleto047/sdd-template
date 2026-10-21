export interface Pregunta {
  id: number;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function obtenerPregunta(id: number): Promise<Pregunta> {
  const respuesta = await fetch(`${BASE_URL}/api/v1/question/${id}`, {
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) {
    throw new Error(`Error al obtener la pregunta ${id}: ${respuesta.status}`);
  }

  const datos = await respuesta.json();

  if (
    typeof datos.id !== "number" ||
    typeof datos.pregunta !== "string" ||
    !Array.isArray(datos.opciones) ||
    typeof datos.respuesta_correcta !== "string"
  ) {
    throw new Error("Respuesta de la API con formato inválido");
  }

  return datos as Pregunta;
}