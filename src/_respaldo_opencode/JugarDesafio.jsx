import React, { useState, useEffect } from "react";
import { unirsePartidaApi, obtenerEstadoPartidaApi, registrarRespuestaApi } from "../services/desafioService";

export default function JugarDesafio() {
  const [codigoSala, setCodigoSala] = useState("");
  const [nombre, setNombre] = useState("");
  const [enPartida, setEnPartida] = useState(false);
  const [estadoPartida, setEstadoPartida] = useState(null);
  const [jugadorId, setJugadorId] = useState(null);
  const [preguntaActualIndex, setPreguntaActualIndex] = useState(0);
  const [tiempoInicio, setTiempoInicio] = useState(null);
  const [error, setError] = useState("");

  // Leer si viene un código de sala por la URL (?sala=ABC123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const salaUrl = params.get("sala");
    if (salaUrl) {
      setCodigoSala(salaUrl.toUpperCase());
    }
  }, []);

  // Polling para actualizar el estado de la sala en tiempo real cada 3 segundos
  useEffect(() => {
    let intervalo;
    if (enPartida && codigoSala) {
      intervalo = setInterval(async () => {
        try {
          const data = await obtenerEstadoPartidaApi(codigoSala);
          setEstadoPartida(data);
        } catch (err) {
          console.error("Error sincronizando estado", err);
        }
      }, 3000);
    }
    return () => clearInterval(intervalo);
  }, [enPartida, codigoSala]);

  const handleUnirse = async (e) => {
    e.preventDefault();
    if (!codigoSala || !nombre.trim()) {
      setError("Ingresa el código de sala y tu nombre.");
      return;
    }
    try {
      setError("");
      const res = await unirsePartidaApi(codigoSala, nombre);
      setJugadorId(res.jugador_id);
      setEnPartida(true);
      const estadoInicial = await obtenerEstadoPartidaApi(codigoSala);
      setEstadoPartida(estadoInicial);
      setTiempoInicio(Date.now());
    } catch (err) {
      setError("No se pudo unir a la sala. Verifica el código o si ya comenzó.");
    }
  };

  const responderPregunta = async (esCorrecta) => {
    const tiempoEmpleado = (Date.now() - tiempoInicio) / 1000; // Segundos empleados
    try {
      await registrarRespuestaApi(codigoSala, jugadorId, esCorrecta, tiempoEmpleado);
      setPreguntaActualIndex((prev) => prev + 1);
      setTiempoInicio(Date.now());
      // Actualizar estado inmediato
      const data = await obtenerEstadoPartidaApi(codigoSala);
      setEstadoPartida(data);
    } catch (err) {
      alert("Error al enviar la respuesta.");
    }
  };

  if (!enPartida) {
    return (
      <div style={{ padding: "20px", maxWidth: "400px", margin: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
        <h2>Unirse a Duelo Multijugador</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleUnirse} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <label>Código de Sala:</label>
            <input 
              type="text" 
              value={codigoSala} 
              onChange={(e) => setCodigoSala(e.target.value.toUpperCase())} 
              placeholder="Ej: ABC123"
              style={{ width: "100%", padding: "8px", textTransform: "uppercase" }}
            />
          </div>
          <div>
            <label>Tu Nombre:</label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              placeholder="Ej: Sonia"
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          <button type="submit" style={{ padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            Unirme a la Partida
          </button>
        </form>
      </div>
    );
  }

  if (!estadoPartida) return <div style={{ textAlign: "center", padding: "50px" }}>Cargando partida...</div>;

  // Pantalla de espera si el Jugador 2 aún no entra
  if (estadoPartida.estado === "esperando") {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <h2>Sala: {codigoSala}</h2>
        <p>Esperando a que se uná el oponente desde su celular...</p>
      </div>
    );
  }

  // Pantalla de Resultados y Reporte Final
  if (estadoPartida.estado === "finalizado") {
    return (
      <div style={{ padding: "20px", maxWidth: "600px", margin: "auto", background: "#fff", borderRadius: "10px", textAlign: "center" }}>
        <h2>Reporte Final de la Partida</h2>
        <h3 style={{ color: "#16a34a" }}>Ganador: {estadoPartida.reporte.ganador}</h3>
        <div style={{ display: "flex", justifyContent: "space-around", margin: "20px 0" }}>
          <div style={{ background: "#f3f4f6", padding: "15px", borderRadius: "8px", width: "40%" }}>
            <h4>{estadoPartida.jugador_1}</h4>
            <p>Puntaje: {estadoPartida.reporte.detalles[estadoPartida.jugador_1].puntaje}</p>
            <p>Tiempo Total: {estadoPartida.reporte.detalles[estadoPartida.jugador_1].tiempo_total_segundos}s</p>
          </div>
          <div style={{ background: "#f3f4f6", padding: "15px", borderRadius: "8px", width: "40%" }}>
            <h4>{estadoPartida.jugador_2}</h4>
            <p>Puntaje: {estadoPartida.reporte.detalles[estadoPartida.jugador_2].puntaje}</p>
            <p>Tiempo Total: {estadoPartida.reporte.detalles[estadoPartida.jugador_2].tiempo_total_segundos}s</p>
          </div>
        </div>
      </div>
    );
  }

  const preguntas = estadoPartida.preguntas || [];
  const preguntaActual = preguntas[preguntaActualIndex];

  // Si ya respondió todas sus preguntas locales pero espera al otro
  if (!preguntaActual || preguntaActualIndex >= preguntas.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <h2>¡Has terminado tus preguntas!</h2>
        <p>Esperando que tu oponente termine para ver el reporte final y el ganador...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
      <h3>Modo: {estadoPartida.tipo_modo.toUpperCase()} | Sala: {codigoSala}</h3>
      <p>Jugador 1: {estadoPartida.jugador_1} ({estadoPartida.puntaje_1} pts) vs Jugador 2: {estadoPartida.jugador_2} ({estadoPartida.puntaje_2} pts)</p>
      
      {estadoPartida.tipo_modo === "1v1" && (
        <p style={{ fontWeight: "bold", color: estadoPartida.turno_actual === jugadorId ? "green" : "red" }}>
          {estadoPartida.turno_actual === jugadorId ? "¡Es tu turno de responder!" : "Esperando el turno del oponente..."}
        </p>
      )}

      <div style={{ marginTop: "20px", padding: "15px", background: "#f9fafb", borderRadius: "8px" }}>
        <h4>Pregunta {preguntaActualIndex + 1} de {preguntas.length}</h4>
        <p style={{ fontSize: "18px", fontWeight: "600" }}>{preguntaActual.pregunta}</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
          {preguntaActual.opciones.map((opcion, idx) => {
            const esCorrecta = opcion === preguntaActual.respuesta_correcta;
            const habilitado = estadoPartida.tipo_modo === "desafio" || estadoPartida.turno_actual === jugadorId;
            return (
              <button 
                key={idx}
                disabled={!habilitado}
                onClick={() => responderPregunta(esCorrecta)}
                style={{ padding: "10px", background: "#e0e7ff", border: "none", borderRadius: "5px", cursor: habilitado ? "pointer" : "not-allowed", textAlign: "left" }}
              >
                {opcion}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}