const API_URL = "/api/v1/desafios";

export const crearPartidaApi = async (nombre_jugador, categoria, tipo_modo) => {
  const response = await fetch(`${API_URL}/crear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre_jugador, categoria, tipo_modo }),
  });
  if (!response.ok) throw new Error("Error al crear la sala de juego");
  return await response.json();
};

export const unirsePartidaApi = async (codigo_sala, nombre_jugador) => {
  const response = await fetch(`${API_URL}/unirse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo_sala, nombre_jugador }),
  });
  if (!response.ok) throw new Error("Error al unirse a la sala");
  return await response.json();
};

export const obtenerEstadoPartidaApi = async (codigo_sala) => {
  const response = await fetch(`${API_URL}/estado/${codigo_sala}`);
  if (!response.ok) throw new Error("Error al obtener el estado de la partida");
  return await response.json();
};

export const registrarRespuestaApi = async (codigo_sala, jugador_id, es_correcta, tiempo_empleado) => {
  const response = await fetch(`${API_URL}/responder/${codigo_sala}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jugador_id, es_correcta, tiempo_empleado }),
  });
  if (!response.ok) throw new Error("Error al registrar la respuesta");
  return await response.json();
};