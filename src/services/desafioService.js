const API_URL = import.meta.env.VITE_API_URL || "https://sdd-template.onrender.com/api/v1";

export async function crearDesafio(nombreJugador, categoria) {
  const response = await fetch(`${API_URL}/desafio/crear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre_jugador: nombreJugador, categoria: categoria })
  });
  if (!response.ok) throw new Error("Error al crear el desafío");
  return await response.json();
}

export async function obtenerDesafio(desafioId) {
  const response = await fetch(`${API_URL}/desafio/${desafioId}`);
  if (!response.ok) throw new Error("Desafío no encontrado");
  return await response.json();
}

export async function enviarIntentoDesafio(desafioId, nombreJugador, puntajeTotal, tiempoTotal) {
  const response = await fetch(`${API_URL}/desafio/${desafioId}/jugar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre_jugador: nombreJugador,
      puntaje_total: puntajeTotal,
      tiempo_total: tiempoTotal
    })
  });
  if (!response.ok) throw new Error("Error al registrar el puntaje");
  return await response.json();
}